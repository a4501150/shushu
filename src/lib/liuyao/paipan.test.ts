// Ported from LiuYaoUtilTest.java (PaiPan / fuShen / dongBian / annotation tests).
import { describe, expect, it } from "vitest";
import { compute } from "./panel";
import { format } from "./format";
import type { SixRelation } from "./sixrelation";
import type { SixSpirit } from "./sixspirit";
import type { Trigram } from "./tables";
import type { YaoInfo } from "./types";
import type { WuXing } from "./wuxing";

interface YaoExpectation {
  position: number;
  stem: string;
  branch: string;
  wuXing: WuXing;
  liuQin: SixRelation;
  liuShen: SixSpirit;
  shi: boolean;
  ying: boolean;
  dong: boolean;
}

function assertYao(y: YaoInfo, e: YaoExpectation): void {
  expect(y.position).toBe(e.position);
  expect(y.heavenlyStem).toBe(e.stem);
  expect(y.earthlyBranch).toBe(e.branch);
  expect(y.wuXing).toBe(e.wuXing);
  expect(y.liuQin).toBe(e.liuQin);
  expect(y.liuShen).toBe(e.liuShen);
  expect(y.isShiYao).toBe(e.shi);
  expect(y.isYingYao).toBe(e.ying);
  expect(y.isDong).toBe(e.dong);
}

describe("PaiPan.compute", () => {
  it("泽天夬 (testPaiPan_ZeTianGuai)", () => {
    const r = compute([7, 7, 7, 7, 7, 8], "甲");

    expect(r.benGuaName).toBe("夬");
    expect(r.bianGuaName).toBeNull();
    expect(r.palace).toEqual<Trigram>("坤");
    expect(r.palaceIndex).toBe(5);
    expect(r.shiPosition).toBe(5);
    expect(r.yingPosition).toBe(2);

    const yaos = r.benGuaYaos;
    expect(yaos).toHaveLength(6);

    assertYao(yaos[0], {
      position: 1,
      stem: "甲",
      branch: "子",
      wuXing: "水",
      liuQin: "妻财",
      liuShen: "青龙",
      shi: false,
      ying: false,
      dong: false,
    });
    assertYao(yaos[1], {
      position: 2,
      stem: "甲",
      branch: "寅",
      wuXing: "木",
      liuQin: "官鬼",
      liuShen: "朱雀",
      shi: false,
      ying: true,
      dong: false,
    });
    assertYao(yaos[2], {
      position: 3,
      stem: "甲",
      branch: "辰",
      wuXing: "土",
      liuQin: "兄弟",
      liuShen: "勾陈",
      shi: false,
      ying: false,
      dong: false,
    });
    assertYao(yaos[3], {
      position: 4,
      stem: "丁",
      branch: "亥",
      wuXing: "水",
      liuQin: "妻财",
      liuShen: "螣蛇",
      shi: false,
      ying: false,
      dong: false,
    });
    assertYao(yaos[4], {
      position: 5,
      stem: "丁",
      branch: "酉",
      wuXing: "金",
      liuQin: "子孙",
      liuShen: "白虎",
      shi: true,
      ying: false,
      dong: false,
    });
    assertYao(yaos[5], {
      position: 6,
      stem: "丁",
      branch: "未",
      wuXing: "土",
      liuQin: "兄弟",
      liuShen: "玄武",
      shi: false,
      ying: false,
      dong: false,
    });

    expect(r.bianGuaYaos).toBeNull();
  });

  it("动爻 (testPaiPan_WithDongYao)", () => {
    const r = compute([9, 7, 8, 7, 7, 8], "丙");

    expect(r.benGuaName).toBe("兑");
    expect(r.bianGuaName).toBe("困");
    expect(r.palace).toEqual<Trigram>("兑");
    expect(r.palaceIndex).toBe(0);
    expect(r.shiPosition).toBe(6);
    expect(r.yingPosition).toBe(3);

    expect(r.benGuaYaos[0].isDong).toBe(true);
    expect(r.benGuaYaos[1].isDong).toBe(false);
    expect(r.bianGuaYaos).not.toBeNull();

    expect(r.benGuaYaos[0].liuShen).toBe<SixSpirit>("朱雀");
    expect(r.benGuaYaos[1].liuShen).toBe<SixSpirit>("勾陈");
  });

  it("全动 (testPaiPan_AllChanging)", () => {
    const r = compute([9, 9, 9, 9, 9, 9], "戊");

    expect(r.benGuaName).toBe("乾");
    expect(r.bianGuaName).toBe("坤");
    expect(r.palace).toEqual<Trigram>("乾");
    expect(r.palaceIndex).toBe(0);
    expect(r.shiPosition).toBe(6);
    expect(r.yingPosition).toBe(3);

    for (const y of r.benGuaYaos) expect(y.isDong).toBe(true);

    expect(r.benGuaYaos[0].liuShen).toBe<SixSpirit>("勾陈");
  });
});

describe("fuShen", () => {
  it("泽天夬 伏神父母 (testFuShen_ZeTianGuai)", () => {
    // 泽天夬 in 坤宫 (土); missing 父母, found in 坤为地 yao2 乙巳火.
    // fly=木, hide=火 → 飞生伏
    const r = compute([7, 7, 7, 7, 7, 8], "甲");

    expect(r.fuShen).toHaveLength(1);
    const fs = r.fuShen[0];
    expect(fs.liuQin).toBe<SixRelation>("父母");
    expect(fs.position).toBe(2);
    expect(fs.heavenlyStem).toBe("乙");
    expect(fs.earthlyBranch).toBe("巳");
    expect(fs.wuXing).toBe<WuXing>("火");
    expect(fs.relationship).toBe("飞生伏");
  });

  it("乾为天 无伏神 (testFuShen_QianWeiTian)", () => {
    const r = compute([7, 7, 7, 7, 7, 7], "甲");

    expect(r.benGuaName).toBe("乾");
    expect(r.fuShen).toHaveLength(0);
  });
});

describe("dongBian annotations", () => {
  // 乾→坤 (all 9s), day=戊申, month=午 — reused by several Java tests.
  const r = compute([9, 9, 9, 9, 9, 9], "戊", "申", "午");

  it("化回头克 (testDongBian_HuaHuiTouKe)", () => {
    const dba = r.dongBianAnnotations;
    // yao1: 子水 → 未土. 土克水=化回头克.
    expect(dba.get(1)).toContain("化回头克");
    // yao3: 辰土 → 卯木. 木克土=化回头克.
    expect(dba.get(3)).toContain("化回头克");
  });

  it("化空 (testDongBian_HuaKong)", () => {
    // yao3: 甲辰土 → 乙卯木. 卯 in xunKong 寅卯 → 化空.
    expect(r.dongBianAnnotations.get(3)).toContain("化空");
  });
});

describe("yaoAnnotations", () => {
  it("月破 (testYaoAnnotations_YuePo)", () => {
    // 月建 午 clashes 子 → 月破 on yao1 甲子水.
    const r = compute([7, 7, 7, 7, 7, 8], "甲", "辰", "午");

    const ann1 = r.yaoAnnotations.get(1);
    expect(ann1).toBeDefined();
    expect(ann1).toContain("月破");
  });

  it("暗动 (testYaoAnnotations_AnDong)", () => {
    // 日辰 申 clashes static yao2 甲寅木 → 暗动.
    const r = compute([7, 7, 7, 7, 7, 8], "戊", "申", "午");

    const ann2 = r.yaoAnnotations.get(2);
    expect(ann2).toBeDefined();
    expect(ann2).toContain("暗动");
  });

  it("日合 (testYaoAnnotations_RiHe)", () => {
    // 日辰 丑 combines with yao1 甲子水 → 日合.
    const r = compute([7, 7, 7, 7, 7, 8], "己", "丑", "午");

    const ann1 = r.yaoAnnotations.get(1);
    expect(ann1).toBeDefined();
    expect(ann1).toContain("日合");
  });

  it("旬空 (testYaoAnnotations_XunKong)", () => {
    // 甲午旬 空亡 辰巳; yao3 甲辰土 → 空.
    const r = compute([7, 7, 7, 7, 7, 8], "甲", "午", "子");

    expect(r.xunKong).toEqual(["辰", "巳"]);
    const ann3 = r.yaoAnnotations.get(3);
    expect(ann3).toBeDefined();
    expect(ann3).toContain("空");
  });
});

describe("full integration", () => {
  it("乾→坤 全要素 (testFullPaiPan_WithAllFeatures)", () => {
    const r = compute([9, 9, 9, 9, 9, 9], "戊", "申", "午");

    expect(r.benGuaName).toBe("乾");
    expect(r.bianGuaName).toBe("坤");
    expect(r.xunName).toBe("甲辰旬");
    expect(r.xunKong).toEqual(["寅", "卯"]);

    for (const y of r.benGuaYaos) expect(y.isDong).toBe(true);

    expect(r.fuShen).toHaveLength(0);

    const output = format(r);
    expect(output).toContain("旬空：寅卯");
    expect(output).toContain("月建：午火");
    expect(output).toContain("日辰：戊申金");
    expect(output).toContain("乾宫");
  });

  it("泽天夬 伏神+日月 (testFullPaiPan_FuShenWithDayMonth)", () => {
    const r = compute([7, 7, 7, 7, 7, 8], "戊", "申", "午");

    expect(r.fuShen).toHaveLength(1);
    expect(r.fuShen[0].liuQin).toBe<SixRelation>("父母");

    const output = format(r);
    expect(output).toContain("伏：");
    expect(output).toContain("父母");
  });
});
