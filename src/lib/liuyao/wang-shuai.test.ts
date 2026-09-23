// 旺衰 layer tests. Every expectation hand-derived from the spec:
// 月建 grading 同我=旺/月生日=相/日生月=休/克月=囚/月克=死; 日辰 生克扶冲合;
// 动爻 acts once on every other yao (生/克), 静爻 only receive; 变爻 acts on own
// 动爻 only via reused frozen 化回头生/克 labels; 得令→旺, 失令得势→中和, else 衰.
import { describe, expect, it } from "vitest";
import {
  analyzeStrength,
  formatWangShuai,
  fullLiuyaoBoard,
  MissingDayMonthError,
  type WangShuaiResult,
  type YaoStrength,
} from "./wang-shuai";
import { compute } from "./panel";
import { format } from "./format";
import { xunKong as calcXunKong, xunName as calcXunName } from "./dizhi";
import type { FuShenInfo, PanResult, YaoInfo } from "./types";
import type { Trigram } from "./tables";
import type { SixRelation } from "./sixrelation";
import type { WuXing } from "./wuxing";

// ---- hand-built chart helpers (analyzeStrength reads yao fields +
// xunKong + fuShen + dongBianAnnotations, not the 纳甲 tables) ----

interface Spec {
  pos: number;
  branch: string;
  wx: WuXing;
  liuQin: SixRelation;
  dong?: boolean;
}

function handYao(s: Spec): YaoInfo {
  return {
    position: s.pos,
    sum: s.dong ? 9 : 8,
    heavenlyStem: "甲",
    earthlyBranch: s.branch,
    wuXing: s.wx,
    liuQin: s.liuQin,
    liuShen: "青龙",
    isShiYao: s.pos === 6,
    isYingYao: s.pos === 3,
    isDong: !!s.dong,
  };
}

function handPan(
  specs: Spec[],
  opts: {
    dayGan: string;
    day: string;
    month: string;
    fuShen?: FuShenInfo[];
    dba?: Map<number, string[]>;
  },
): PanResult {
  return {
    benGuaName: "测试",
    bianGuaName: null,
    palace: "乾" as Trigram,
    palaceIndex: 0,
    shiPosition: 6,
    yingPosition: 3,
    benGuaYaos: specs.map(handYao),
    bianGuaYaos: null,
    xunName: calcXunName(opts.dayGan, opts.day),
    xunKong: calcXunKong(opts.dayGan, opts.day),
    fuShen: opts.fuShen ?? [],
    dayGan: opts.dayGan,
    dayBranch: opts.day,
    monthBranch: opts.month,
    yaoAnnotations: new Map(),
    dongBianAnnotations: opts.dba ?? new Map(),
  };
}

function ys(ws: WangShuaiResult, pos: number): YaoStrength {
  const s = ws.yaos.find((y) => y.position === pos);
  if (s == null) throw new Error(`no YaoStrength for position ${pos}`);
  return s;
}

// 乾 branch set used for several static charts: 子水 寅木 辰土 午火 申金 戌土
const QIAN_BRANCHES: [string, WuXing][] = [
  ["子", "水"],
  ["寅", "木"],
  ["辰", "土"],
  ["午", "火"],
  ["申", "金"],
  ["戌", "土"],
];
const LIUQIN_BY_WX: Record<WuXing, SixRelation> = {
  // 乾宫属金
  金: "兄弟",
  木: "妻财",
  水: "子孙",
  火: "官鬼",
  土: "父母",
};
function qianSpecs(dongPos = 0): Spec[] {
  return QIAN_BRANCHES.map(([branch, wx], i) => ({
    pos: i + 1,
    branch,
    wx,
    liuQin: LIUQIN_BY_WX[wx],
    dong: i + 1 === dongPos,
  }));
}

// ---- missing day/month ----

describe("MissingDayMonthError", () => {
  it("throws when the chart has no day/month", () => {
    const noBoth = compute([7, 7, 7, 7, 7, 8], "甲");
    expect(() => analyzeStrength(noBoth)).toThrow(MissingDayMonthError);
    const noDay = compute([7, 7, 7, 7, 7, 8], "甲", null, "午");
    expect(() => analyzeStrength(noDay)).toThrow(MissingDayMonthError);
    const noMonth = compute([7, 7, 7, 7, 7, 8], "甲", "辰", null);
    expect(() => analyzeStrength(noMonth)).toThrow(MissingDayMonthError);
  });
});

// ---- 月建 grading + 动爻 chain on the 乾 fixture (午月 戊申日, all-moving) ----

describe("乾 fixture 午月 戊申日", () => {
  const r = compute([9, 9, 9, 9, 9, 9], "戊", "申", "午");
  const ws = analyzeStrength(r);

  it("月建 grading covers 旺/相/休/囚/死", () => {
    // 午火月: 同我 → 午火(4)旺; 火生辰戌土 → 相; 寅木生火 → 休;
    // 火克申金 → 死; 子水克火 → 囚 (克令者囚, 令克者死).
    expect(ys(ws, 4).grade).toBe("旺"); // 同我
    expect(ys(ws, 3).grade).toBe("相"); // 生辰土
    expect(ys(ws, 6).grade).toBe("相"); // 生戌土
    expect(ys(ws, 2).grade).toBe("休"); // 寅木生月 (日生月=休)
    expect(ys(ws, 5).grade).toBe("死"); // 月克申金 (火克金)
    expect(ys(ws, 1).grade).toBe("囚"); // 子水克月
    expect(ys(ws, 4).deLing).toBe(true);
    expect(ys(ws, 5).deLing).toBe(false);
  });

  it("日辰 facts + 旬空", () => {
    // 日戊申: 申金生亥? 无亥爻; 申 vs 子水(1): 金生水 → 生.
    expect(ys(ws, 1).day.sheng).toBe(true);
    // 申 vs 申金(5): 比扶.
    expect(ys(ws, 5).day.fu).toBe(true);
    // 申 vs 寅木(2): 金克木 + 申冲寅.
    expect(ys(ws, 2).day.ke).toBe(true);
    expect(ys(ws, 2).day.chong).toBe(true);
    // 甲辰旬 空 寅卯 → 二爻寅木空.
    expect(ys(ws, 2).isKong).toBe(true);
    expect(ys(ws, 1).isKong).toBe(false);
  });

  it("动爻 chain: every 动爻 acts on every other yao once", () => {
    // 申金(5): 生自辰土(3)戌土(6), 克自午火(4). 比和动爻(子1/寅2/戌6 vs 彼此)不计.
    expect(ys(ws, 5).shengFrom).toEqual([3, 6]);
    expect(ys(ws, 5).keFrom).toEqual([4]);
    // 午火(4): 生自寅木(2), 克自子水(1).
    expect(ys(ws, 4).shengFrom).toEqual([2]);
    expect(ys(ws, 4).keFrom).toEqual([1]);
    // 子水(1): 生自申金(5), 克自辰土(3)戌土(6).
    expect(ys(ws, 1).shengFrom).toEqual([5]);
    expect(ys(ws, 1).keFrom).toEqual([3, 6]);
  });

  it("回头生克 reuses frozen 化回头生/化回头克 labels", () => {
    // fixture dongBianAnnotations: yao1 子水化未土(化回头克), yao3 辰土化卯木(化回头克).
    expect(ys(ws, 1).huiTouKe).toBe(true);
    expect(ys(ws, 3).huiTouKe).toBe(true);
    expect(ys(ws, 5).huiTouKe).toBe(false);
    expect(ys(ws, 5).huiTouSheng).toBe(false);
  });

  it("composite: 得令→旺, 失令得势→中和, 失令失势→衰", () => {
    // 戌土(6): 相 → 得令 → 旺 (生1[4] vs 克1[2]: even, irrelevant).
    expect(ys(ws, 6).strength).toBe("旺");
    // 申金(5): 死; 生 2动爻+日扶=3 > 克 1 → 得势 → 中和.
    expect(ys(ws, 5).deShi).toBe(true);
    expect(ys(ws, 5).strength).toBe("中和");
    // 子水(1): 囚; 生 1+日辰生=2 vs 克 2 → not strictly greater → 衰.
    expect(ys(ws, 1).deShi).toBe(false);
    expect(ys(ws, 1).strength).toBe("衰");
    // 寅木(2): 休; 生1 vs 克1+日克2 → 衰.
    expect(ys(ws, 2).strength).toBe("衰");
  });
});

// ---- 暗动 vs 日破 ----

describe("静爻受日冲: 暗动 vs 日破", () => {
  // Same all-static chart (乾 branches), two months. One single chart cannot
  // carry both: the day branch clashes exactly one branch, and branch fixes
  // wuxing, hence fixes the month grade — so the split is shown via the grade.
  it("旺相静爻受日冲 → 暗动", () => {
    const r = handPan(qianSpecs(), { dayGan: "壬", day: "子", month: "寅" });
    const ws = analyzeStrength(r);
    // 寅木月, 午火(4): 月生日 → 相; 日子冲午 → 暗动.
    expect(ys(ws, 4).grade).toBe("相");
    expect(ys(ws, 4).day.chong).toBe(true);
    expect(ys(ws, 4).extra).toEqual(["暗动"]);
  });

  it("休囚死静爻受日冲 → 日破", () => {
    const r = handPan(qianSpecs(), { dayGan: "壬", day: "子", month: "亥" });
    const ws = analyzeStrength(r);
    // 亥水月, 午火(4): 月克 → 死; 日子冲午 → 日破 (not 暗动).
    expect(ys(ws, 4).grade).toBe("死");
    expect(ys(ws, 4).extra).toEqual(["日破"]);
    expect(ys(ws, 4).extra).not.toContain("暗动");
  });

  it("合并盘面备注列与旺衰一致：静态层 暗动 被重判替换", () => {
    // 亥水月 子日: 午火(4)静受日冲, 静态层(移植)标 暗动 → 合并后应为 日破.
    const r = handPan(qianSpecs(), { dayGan: "壬", day: "子", month: "亥" });
    const withFrozen = { ...r, yaoAnnotations: new Map([[4, ["暗动"]]]) };
    const board = fullLiuyaoBoard(withFrozen, analyzeStrength(withFrozen));
    expect(board).toContain("日破");
    expect(board).not.toContain("暗动");
  });
});

// ---- 冲起 vs 冲散 ----

describe("动爻受日冲: 冲起 vs 冲散", () => {
  it("旺相动爻受日冲 → 冲起", () => {
    const r = handPan(qianSpecs(4), {
      dayGan: "壬",
      day: "子",
      month: "寅",
    });
    const ws = analyzeStrength(r);
    // 午火(4) 动, 月生日 → 相 → 冲起.
    expect(ys(ws, 4).extra).toEqual(["冲起"]);
    expect(ys(ws, 4).extra).not.toContain("冲散");
  });

  it("休囚死动爻受日冲且无生扶 → 冲散", () => {
    const r = handPan(qianSpecs(4), {
      dayGan: "壬",
      day: "子",
      month: "亥",
    });
    const ws = analyzeStrength(r);
    // 亥水月, 午火(4) 死; 日子冲+克午; 无动爻生扶 → 冲散, 且整体衰.
    expect(ys(ws, 4).grade).toBe("死");
    expect(ys(ws, 4).extra).toEqual(["冲散"]);
    expect(ys(ws, 4).strength).toBe("衰");
  });

  it("动爻受日冲但有生扶 → 非冲散 (丑未冲而日扶)", () => {
    // 丑未相冲而同属土 → 日辰既是冲又是扶. 月申: 丑土 生月 → 休.
    const specs: Spec[] = [
      { pos: 1, branch: "丑", wx: "土", liuQin: "父母", dong: true },
      { pos: 2, branch: "亥", wx: "水", liuQin: "子孙" },
      { pos: 3, branch: "卯", wx: "木", liuQin: "妻财" },
      { pos: 4, branch: "酉", wx: "金", liuQin: "兄弟" },
      { pos: 5, branch: "未", wx: "土", liuQin: "父母" },
      { pos: 6, branch: "巳", wx: "火", liuQin: "官鬼" },
    ];
    const r = handPan(specs, { dayGan: "乙", day: "未", month: "申" });
    const ws = analyzeStrength(r);
    expect(ys(ws, 1).grade).toBe("休");
    expect(ys(ws, 1).day.chong).toBe(true);
    expect(ys(ws, 1).day.fu).toBe(true); // 丑未皆土
    expect(ys(ws, 1).extra).toEqual([]);
  });
});

// ---- 合绊 ----

describe("静爻受日合 → 合绊", () => {
  // 日午合未: static 未土(2). No 动爻 → 合绊.
  const base: Spec[] = [
    { pos: 1, branch: "子", wx: "水", liuQin: "子孙" },
    { pos: 2, branch: "未", wx: "土", liuQin: "父母" },
    { pos: 3, branch: "申", wx: "金", liuQin: "兄弟" },
    { pos: 4, branch: "酉", wx: "金", liuQin: "兄弟" },
    { pos: 5, branch: "卯", wx: "木", liuQin: "妻财" },
    { pos: 6, branch: "亥", wx: "水", liuQin: "子孙" },
  ];

  it("无动爻解 → 合绊 (且静爻受日冲仍判日破)", () => {
    const r = handPan(base, { dayGan: "甲", day: "午", month: "寅" });
    const ws = analyzeStrength(r);
    expect(ys(ws, 2).day.he).toBe(true);
    expect(ys(ws, 2).extra).toEqual(["合绊"]);
    // 子水(1)静受日冲: 水生寅月 → 休 → 日破.
    expect(ys(ws, 1).extra).toEqual(["日破"]);
  });

  it("动爻冲该爻 → 不合绊", () => {
    const specs = [...base];
    specs[0] = { pos: 1, branch: "丑", wx: "土", liuQin: "父母", dong: true };
    // 丑动冲未(该爻) → 解.
    const r = handPan(specs, { dayGan: "甲", day: "午", month: "寅" });
    const ws = analyzeStrength(r);
    expect(ys(ws, 2).day.he).toBe(true);
    expect(ys(ws, 2).extra).not.toContain("合绊");
  });

  it("动爻冲合支(日支) → 不合绊", () => {
    const specs = [...base];
    specs[0] = { pos: 1, branch: "子", wx: "水", liuQin: "子孙", dong: true };
    // 子动冲午(日支=未之合支) → 解; 子水动爻自身休而无生扶受冲 → 冲散.
    const r = handPan(specs, { dayGan: "甲", day: "午", month: "寅" });
    const ws = analyzeStrength(r);
    expect(ys(ws, 2).extra).not.toContain("合绊");
    expect(ys(ws, 1).extra).toEqual(["冲散"]);
  });
});

// ---- 得生/受克 chain with 3 动爻 ----

describe("得生/受克 chain (≥3 动爻)", () => {
  // 甲卯日 寅木月. 动: 子水(1) 午火(2) 申金(4).
  // 午火(2) 变爻带 化回头生 label (dba reuse, not re-derived).
  const specs: Spec[] = [
    { pos: 1, branch: "子", wx: "水", liuQin: "子孙", dong: true },
    { pos: 2, branch: "午", wx: "火", liuQin: "官鬼", dong: true },
    { pos: 3, branch: "寅", wx: "木", liuQin: "妻财" },
    { pos: 4, branch: "申", wx: "金", liuQin: "兄弟", dong: true },
    { pos: 5, branch: "辰", wx: "土", liuQin: "父母" },
    { pos: 6, branch: "戌", wx: "土", liuQin: "父母" },
  ];
  const dba = new Map<number, string[]>([[2, ["化回头生"]]]);
  const r = handPan(specs, { dayGan: "甲", day: "卯", month: "寅", dba });
  const ws = analyzeStrength(r);

  it("static yaos receive 生/克 with position numbers", () => {
    // 静寅木(3): 得生自子水(1), 受克自申金(4) — the spec's 得生自[1] 受克自[4] shape.
    expect(ys(ws, 3).shengFrom).toEqual([1]);
    expect(ys(ws, 3).keFrom).toEqual([4]);
    // 静辰土(5): 生自午火(2) 仅; 克卯日不计入列表(日辰单列).
    expect(ys(ws, 5).shengFrom).toEqual([2]);
    expect(ys(ws, 5).keFrom).toEqual([]);
    expect(ys(ws, 5).day.ke).toBe(true); // 卯木克辰土
  });

  it("动爻之间也互相作用", () => {
    // 午火(2): 受克自子水(1); 无动爻生之; 回头生 flag from label.
    expect(ys(ws, 2).keFrom).toEqual([1]);
    expect(ys(ws, 2).shengFrom).toEqual([]);
    expect(ys(ws, 2).huiTouSheng).toBe(true);
    // 申金(4): 受克自午火(2), 克月(金克木) → 囚 → 衰.
    expect(ys(ws, 4).keFrom).toEqual([2]);
    expect(ys(ws, 4).grade).toBe("囚");
    expect(ys(ws, 4).strength).toBe("衰");
  });

  it("静爻失令失势 → 衰; 日合且无动爻冲合支/该爻 → 合绊", () => {
    // 静戌土(6): 死(木克土=月克); 生自午火(2)=1 vs 克 1(卯日亦克戌土) → 失势 → 衰;
    // 卯日合戌 且无动爻冲卯/冲戌 → 合绊.
    expect(ys(ws, 6).grade).toBe("死");
    expect(ys(ws, 6).deShi).toBe(false);
    expect(ys(ws, 6).strength).toBe("衰");
    expect(ys(ws, 6).extra).toEqual(["合绊"]);
    // 静寅木(3): 同月旺 → 旺, 日辰扶(卯).
    expect(ys(ws, 3).strength).toBe("旺");
    expect(ys(ws, 3).day.fu).toBe(true);
  });

  it("水爻: 生金(得生[4]) 而不受火克 (水克火为单向)", () => {
    expect(ys(ws, 1).shengFrom).toEqual([4]);
    expect(ys(ws, 1).keFrom).toEqual([]);
    expect(ys(ws, 1).strength).toBe("中和"); // 休, 生1>克0 → 得势
  });
});

// ---- 伏神 ----

describe("伏神", () => {
  it("泽天夬 飞生伏 → 得生于飞神; 冻结 annotations 不被修改", () => {
    const r = compute([7, 7, 7, 7, 7, 8], "戊", "申", "午");
    const annBefore = JSON.stringify([...r.yaoAnnotations.entries()]);
    const dbaBefore = JSON.stringify([...r.dongBianAnnotations.entries()]);
    const ws = analyzeStrength(r);

    expect(ws.fuShen).toHaveLength(1);
    expect(ws.fuShen[0].relationship).toBe("飞生伏");
    expect(ws.fuShen[0].deSheng).toBe(true);
    expect(ws.fuShen[0].shouKe).toBe(false);
    expect(ws.fuShen[0].yaFu).toBe(false);
    // 伏神自身亦论日月：巳火在午月为旺；日辰申与巳六合；
    // 飞爻二为寅木，甲辰旬空寅卯 → 飞神空；申日又冲寅 → 日辰冲飞，两路伏易出.
    expect(ws.fuShen[0].grade).toBe("旺");
    expect(ws.fuShen[0].day.he).toBe(true);
    expect(ws.fuShen[0].feiKong).toBe(true);
    expect(ws.fuShen[0].feiChong).toBe(true);
    // 伏神 line appears in the formatted block.
    const text = formatWangShuai(r, ws);
    expect(text).toContain(
      "伏 父母 乙巳火 飞于二爻: 月建 旺; 日辰 合; 飞生伏; 得生于飞神; 飞神空，伏易出; 日辰冲飞，伏易出",
    );
    // frozen maps untouched
    expect(JSON.stringify([...r.yaoAnnotations.entries()])).toBe(annBefore);
    expect(JSON.stringify([...r.dongBianAnnotations.entries()])).toBe(
      dbaBefore,
    );
  });

  it("飞克伏 → 受克 + 压伏", () => {
    // 飞爻 pos3 子水, 伏神 午火 (水克火 → 飞克伏).
    const fu: FuShenInfo = {
      position: 3,
      heavenlyStem: "甲",
      earthlyBranch: "午",
      wuXing: "火",
      liuQin: "官鬼",
      relationship: "飞克伏",
    };
    const specs: Spec[] = [
      { pos: 1, branch: "丑", wx: "土", liuQin: "父母" },
      { pos: 2, branch: "亥", wx: "水", liuQin: "子孙" },
      { pos: 3, branch: "子", wx: "水", liuQin: "子孙" },
      { pos: 4, branch: "午", wx: "火", liuQin: "官鬼" },
      { pos: 5, branch: "戌", wx: "土", liuQin: "父母" },
      { pos: 6, branch: "寅", wx: "木", liuQin: "妻财" },
    ];
    const r = handPan(specs, {
      dayGan: "甲",
      day: "辰",
      month: "寅",
      fuShen: [fu],
    });
    const ws = analyzeStrength(r);
    expect(ws.fuShen[0].deSheng).toBe(false);
    expect(ws.fuShen[0].shouKe).toBe(true);
    expect(ws.fuShen[0].yaFu).toBe(true);
    // 寅月木生火 → 伏神午火得月建之气为相，虽受飞克，非全无出身之力.
    expect(ws.fuShen[0].grade).toBe("相");
    expect(formatWangShuai(r, ws)).toContain(
      "伏 官鬼 甲午火 飞于三爻: 月建 相; 飞克伏; 受克于飞神; 压伏",
    );
  });

  it("飞神旬空 → 伏易出；日辰冲飞 → 伏易出", () => {
    // 甲子日 旬空 戌亥：飞爻 pos1 戌土值空，伏神寅木藏于其下.
    const fu: FuShenInfo = {
      position: 1,
      heavenlyStem: "甲",
      earthlyBranch: "寅",
      wuXing: "木",
      liuQin: "妻财",
      relationship: "飞克伏",
    };
    const specs: Spec[] = [
      { pos: 1, branch: "戌", wx: "土", liuQin: "兄弟" },
      { pos: 2, branch: "子", wx: "水", liuQin: "子孙" },
      { pos: 3, branch: "辰", wx: "土", liuQin: "父母" },
      { pos: 4, branch: "午", wx: "火", liuQin: "官鬼" },
      { pos: 5, branch: "申", wx: "金", liuQin: "兄弟" },
      { pos: 6, branch: "戌", wx: "土", liuQin: "兄弟" },
    ];
    const r = handPan(specs, { dayGan: "甲", day: "子", month: "寅", fuShen: [fu] });
    const ws = analyzeStrength(r);
    expect(ws.fuShen[0].feiKong).toBe(true);
    // 子日不冲戌（子冲午）
    expect(ws.fuShen[0].feiChong).toBe(false);
    expect(formatWangShuai(r, ws)).toContain(
      "伏 妻财 甲寅木 飞于初爻: 月建 旺; 日辰 生; 飞克伏; 受克于飞神; 压伏; 飞神空，伏易出",
    );
  });

  it("飞神月破 + 伏神得动爻生", () => {
    // 午月冲飞爻子水 → 飞神月破；六爻寅木动生伏神午火.
    const fu: FuShenInfo = {
      position: 3,
      heavenlyStem: "甲",
      earthlyBranch: "午",
      wuXing: "火",
      liuQin: "官鬼",
      relationship: "飞克伏",
    };
    const specs: Spec[] = [
      { pos: 1, branch: "丑", wx: "土", liuQin: "兄弟" },
      { pos: 2, branch: "亥", wx: "水", liuQin: "子孙" },
      { pos: 3, branch: "子", wx: "水", liuQin: "子孙" },
      { pos: 4, branch: "戌", wx: "土", liuQin: "妻财" },
      { pos: 5, branch: "申", wx: "金", liuQin: "兄弟" },
      { pos: 6, branch: "寅", wx: "木", liuQin: "父母", dong: true },
    ];
    const r = handPan(specs, { dayGan: "甲", day: "辰", month: "午", fuShen: [fu] });
    const ws = analyzeStrength(r);
    expect(ws.fuShen[0].feiPo).toBe(true);
    expect(ws.fuShen[0].feiKong).toBe(false); // 甲辰旬空寅卯，飞爻子不空
    expect(ws.fuShen[0].deDongSheng).toEqual([6]);
    expect(formatWangShuai(r, ws)).toContain(
      "伏 官鬼 甲午火 飞于三爻: 月建 旺; 飞克伏; 受克于飞神; 压伏; 得动爻生[6]; 飞神月破，伏易出",
    );
  });
});

// ---- formatWangShuai snapshot + fullLiuyaoBoard ----

describe("formatWangShuai / fullLiuyaoBoard", () => {
  const r = compute([9, 9, 9, 9, 9, 9], "戊", "申", "午");
  const ws = analyzeStrength(r);

  it("snapshot on 乾 fixture 午月 戊申日", () => {
    expect(formatWangShuai(r, ws)).toBe(
      [
        "旺衰分析（月建午火 日辰戊申金）",
        "上爻 壬戌土 父母: 月建 相; 得生[4]; 受克[2]; 旺",
        "五爻 壬申金 兄弟: 月建 死; 日辰 扶; 得生[3,6]; 受克[4]; 中和",
        "四爻 壬午火 官鬼: 月建 旺; 得生[2]; 受克[1]; 旺",
        "三爻 甲辰土 父母: 月建 相; 得生[4]; 受克[2]; 变爻回头克; 旺",
        "二爻 甲寅木 妻财: 月建 休; 日辰 克/冲; 得生[1]; 受克[5]; 空; 衰",
        "初爻 甲子水 子孙: 月建 囚; 日辰 生; 得生[5]; 受克[3,6]; 变爻回头克; 衰",
        "用神候选: 上爻父母、五爻兄弟、四爻官鬼、三爻父母、二爻妻财、初爻子孙",
      ].join("\n") + "\n",
    );
  });

  it("fullLiuyaoBoard composes format + 旺衰 block", () => {
    expect(fullLiuyaoBoard(r)).toBe(format(r));
    const merged = fullLiuyaoBoard(r, ws);
    // 六爻全动：初爻子水月破而动，重判为月破（有解），故盘面段不等于静态 format。
    expect(merged).toContain("月破（有解）");
    expect(merged.endsWith("\n" + formatWangShuai(r, ws))).toBe(true);
  });
});

// ---- 回头生入势 / 静爻受冲生扶 / 备注同步 ----

describe("回头生计入得势与冲散救", () => {
  const specs = qianSpecs(2); // 仅二爻寅木动
  const dba = new Map([[2, ["化回头生"]]]);

  it("死月动爻得回头生 → 中和（不再回头生却判衰）", () => {
    const r = handPan(specs, { dayGan: "甲", day: "午", month: "申", dba });
    const s = ys(analyzeStrength(r), 2);
    expect(s.grade).toBe("死");
    expect(s.huiTouSheng).toBe(true);
    expect(s.strength).toBe("中和");
    expect(s.extra).toEqual([]);
  });

  it("动爻受日冲但有回头生 → 不作冲散", () => {
    const r = handPan(specs, { dayGan: "庚", day: "申", month: "申", dba });
    const s = ys(analyzeStrength(r), 2);
    expect(s.day.chong).toBe(true);
    expect(s.extra).not.toContain("冲散");
  });
});

describe("静爻受日冲：生扶则暗动，克处逢生仍日破", () => {
  it("休囚静爻得日辰扶（丑未冲皆土）→ 暗动", () => {
    const specs: Spec[] = [
      { pos: 1, branch: "丑", wx: "土", liuQin: "父母" },
      { pos: 2, branch: "亥", wx: "水", liuQin: "子孙" },
      { pos: 3, branch: "卯", wx: "木", liuQin: "妻财" },
      { pos: 4, branch: "酉", wx: "金", liuQin: "兄弟" },
      { pos: 5, branch: "未", wx: "土", liuQin: "父母" },
      { pos: 6, branch: "子", wx: "水", liuQin: "子孙" },
    ];
    const r = handPan(specs, { dayGan: "乙", day: "未", month: "卯" });
    const s = ys(analyzeStrength(r), 1);
    expect(s.grade).toBe("死"); // 卯月木克丑土
    expect(s.extra).toContain("暗动");
    expect(s.extra).not.toContain("日破");
  });

  it("日辰克之（子冲午水火）虽有动爻生 → 仍日破", () => {
    const specs: Spec[] = [
      { pos: 1, branch: "辰", wx: "土", liuQin: "兄弟" },
      { pos: 2, branch: "寅", wx: "木", liuQin: "妻财", dong: true },
      { pos: 3, branch: "申", wx: "金", liuQin: "官鬼" },
      { pos: 4, branch: "午", wx: "火", liuQin: "父母" },
      { pos: 5, branch: "戌", wx: "土", liuQin: "兄弟" },
      { pos: 6, branch: "子", wx: "水", liuQin: "子孙" },
    ];
    const r = handPan(specs, { dayGan: "壬", day: "子", month: "亥" });
    const s = ys(analyzeStrength(r), 4);
    expect(s.shengFrom).toEqual([2]); // 寅木动来生午火
    expect(s.extra).toEqual(["日破"]);
  });
});

describe("备注列同步（合绊 / 月破有解）", () => {
  it("静爻受日合：冻结 日合 标签被重判为 合绊", () => {
    const specs: Spec[] = [
      { pos: 1, branch: "辰", wx: "土", liuQin: "兄弟" },
      { pos: 2, branch: "亥", wx: "水", liuQin: "子孙" },
      { pos: 3, branch: "卯", wx: "木", liuQin: "妻财" },
      { pos: 4, branch: "午", wx: "火", liuQin: "兄弟" },
      { pos: 5, branch: "戌", wx: "土", liuQin: "父母" },
      { pos: 6, branch: "子", wx: "水", liuQin: "子孙" },
    ];
    const r = handPan(specs, { dayGan: "辛", day: "未", month: "亥" });
    const r2 = { ...r, yaoAnnotations: new Map<number, readonly string[]>([[4, ["日合"]]]) };
    const board = fullLiuyaoBoard(r2, analyzeStrength(r2));
    expect(board).toContain("合绊");
    expect(board).not.toContain("日合");
  });

  it("月破无救 → 保持 月破；得日辰生 → 月破（有解）", () => {
    const specs: Spec[] = [
      { pos: 1, branch: "子", wx: "水", liuQin: "子孙" },
      { pos: 2, branch: "寅", wx: "木", liuQin: "妻财" },
      { pos: 3, branch: "辰", wx: "土", liuQin: "父母" },
      { pos: 4, branch: "午", wx: "火", liuQin: "官鬼" },
      { pos: 5, branch: "申", wx: "金", liuQin: "兄弟" },
      { pos: 6, branch: "戌", wx: "土", liuQin: "父母" },
    ];
    const ann = (): Map<number, readonly string[]> =>
      new Map<number, readonly string[]>([[1, ["月破"]]]);
    const dead = handPan(specs, { dayGan: "丙", day: "辰", month: "午" }); // 辰土克子水，无救
    const deadBoard = fullLiuyaoBoard({ ...dead, yaoAnnotations: ann() }, analyzeStrength(dead));
    expect(deadBoard).toContain("月破");
    expect(deadBoard).not.toContain("有解");

    const saved = handPan(specs, { dayGan: "庚", day: "申", month: "午" }); // 申金生子水
    const savedBoard = fullLiuyaoBoard({ ...saved, yaoAnnotations: ann() }, analyzeStrength(saved));
    expect(savedBoard).toContain("月破（有解）");
  });
});
