// 时家奇门（拆补法）黄金用例测试。
// 所有期望值均由规范（SOURCES 注释所列文献）逐条推导，并与已核验的主盘逐宫比对。
import { describe, expect, it } from "vitest";
import { fromSolar } from "../calendar";
import * as qimen from "./index";
import { computeQimen, formatText, fuTouAndYuan } from "./index";
import type { PalaceCell, QimenChart } from "./types";

describe("exports", () => {
  it(" exposes computeQimen and formatText", () => {
    expect(typeof qimen.computeQimen).toBe("function");
    expect(typeof qimen.formatText).toBe("function");
  });
});

describe("符头与三元", () => {
  it.each([
    // [日干支, 符头, 元]
    ["甲子", "甲子", "上元"],
    ["己巳", "己巳", "中元"],
    ["癸亥", "己未", "下元"],
    // 规范例文写作"丙辰(符头甲戌)"；甲戌实为丙子（主黄金盘之日干）之符头。
    // 丙辰（60甲子序52，52-2=50）按规则符头为甲寅（中元），见下条。
    ["丙子", "甲戌", "下元"],
    ["庚午", "己巳", "中元"],
    ["丙辰", "甲寅", "中元"],
  ])("%s → 符头%s（%s）", (day, fuTou, yuan) => {
    expect(fuTouAndYuan(day)).toEqual({ fuTou, yuan });
  });
});

describe("定局（节气+符头三元）", () => {
  it.each([
    // [公历日期, 期望]
    ["2024-12-21", { yang: true, ju: 4, jieqi: "冬至" }], // 己未日，符头己未(未→下元)，冬至1-7-4
    ["2024-06-21", { yang: false, ju: 3, jieqi: "夏至" }], // 丙辰日，符头甲寅(寅→中元)，夏至9-3-6中元=3。
    // 规范此处标"阴6"，系以符头甲戌(下元)手推；但丙辰符头实为甲寅（主盘日干丙子符头方为甲戌），
    // 规则原文（index−index%5）推得阴遁三局，见交付报告。
    ["2025-01-01", { yang: true, ju: 7, jieqi: "冬至" }], // 庚午日，符头己巳(巳→中元)，冬至中元=7
    ["2025-12-21", { yang: true, ju: 1, jieqi: "冬至" }], // 甲子日，上元，冬至上元=1
    ["2026-06-21", { yang: false, ju: 9, jieqi: "夏至" }], // 丙寅日，符头甲子(子→上元)，夏至上元=9
  ])("%s → %j", (date, want) => {
    const [y, mo, d] = date.split("-").map(Number);
    const chart = computeQimen(fromSolar(y as number, mo as number, d as number, 12, 0));
    expect({ yang: chart.yang, ju: chart.ju, jieqi: chart.jieqi }).toEqual(want);
  });
});

function palace(chart: QimenChart, id: number): PalaceCell {
  const cell = chart.palaces.find((p) => p.palace === id);
  if (cell === undefined) throw new Error(`palace ${id} missing`);
  return cell;
}

describe("主黄金盘：2009-04-01 16:56（春分下元 阳遁六局 丙申时）", () => {
  const chart = computeQimen(fromSolar(2009, 4, 1, 16, 56));

  it("盘头事实", () => {
    expect({
      yang: chart.yang,
      ju: chart.ju,
      jieqi: chart.jieqi,
      fuTou: chart.fuTou,
      yuan: chart.yuan,
      xunShou: chart.xunShou,
      xunShouYi: chart.xunShouYi,
      zhifuStar: chart.zhifuStar,
      zhishiDoor: chart.zhishiDoor,
      zhishiPalace: chart.zhishiPalace,
      pillars: chart.pillars,
    }).toEqual({
      yang: true,
      ju: 6,
      jieqi: "春分",
      fuTou: "甲戌",
      yuan: "下元",
      xunShou: "甲午",
      xunShouYi: "辛",
      zhifuStar: "天英",
      zhishiDoor: "景门",
      zhishiPalace: 2,
      pillars: { year: "己丑", month: "丁卯", day: "丙子", time: "丙申" },
    });
  });

  it.each([
    // [宫, 神, 星, 天盘干, 门, 地盘干]
    [4, "值符", ["天英"], ["辛"], "伤门", ["丙"]],
    [9, "螣蛇", ["天芮", "天禽"], ["乙", "癸"], "杜门", ["辛"]],
    [2, "太阴", ["天柱"], ["己"], "景门", ["乙", "癸"]],
    [3, "九天", ["天辅"], ["丙"], "生门", ["丁"]],
    [7, "六合", ["天心"], ["戊"], "死门", ["己"]],
    [8, "九地", ["天冲"], ["丁"], "休门", ["庚"]],
    [1, "玄武", ["天任"], ["庚"], "开门", ["壬"]],
    [6, "白虎", ["天蓬"], ["壬"], "惊门", ["戊"]],
    [5, null, [], [], null, ["乙"]],
  ] as const)("宫%s：%s / %s%s / %s / 地%s", (id, god, stars, stems, door, earth) => {
    const c = palace(chart, id);
    expect({
      god: c.god,
      starNames: c.starNames,
      heavenStems: c.heavenStems,
      door: c.door,
      earthStems: c.earthStems,
    }).toEqual({ god, starNames: [...stars], heavenStems: [...stems], door, earthStems: [...earth] });
  });

  it("值符落巽四宫", () => {
    expect(chart.zhifuPalace).toBe(4);
  });
});

describe("元灵用例：2021-11-02 14:00（霜降 甲寅日辛未时）", () => {
  const chart = computeQimen(fromSolar(2021, 11, 2, 14, 0));
  it("阴遁八局（霜降中元），值符天任，值使生门落坎1", () => {
    expect(chart.yang).toBe(false);
    expect(chart.ju).toBe(8);
    expect(chart.jieqi).toBe("霜降");
    expect(chart.fuTou).toBe("甲寅");
    expect(chart.yuan).toBe("中元");
    expect(chart.xunShou).toBe("甲子");
    expect(chart.xunShouYi).toBe("戊");
    expect(chart.zhifuStar).toBe("天任");
    expect(chart.zhishiDoor).toBe("生门");
    expect(chart.zhishiPalace).toBe(1);
  });
});

describe("元灵用例：2017-06-05 08:00（芒种 癸亥日丙辰时）", () => {
  const chart = computeQimen(fromSolar(2017, 6, 5, 8, 0));
  it("阳遁九局（芒种下元），值符天禽（寄坤2），值使死门落兑7", () => {
    expect(chart.yang).toBe(true);
    expect(chart.ju).toBe(9);
    expect(chart.jieqi).toBe("芒种");
    expect(chart.fuTou).toBe("己未");
    expect(chart.yuan).toBe("下元");
    // 丙辰属甲寅旬，旬首遁癸；癸居中5 → 值符天禽（寄坤2），值使死门
    expect(chart.xunShou).toBe("甲寅");
    expect(chart.xunShouYi).toBe("癸");
    expect(chart.zhifuStar).toBe("天禽");
    expect(chart.zhishiDoor).toBe("死门");
    expect(chart.zhishiPalace).toBe(7);
    expect(chart.zhifuPalace).toBe(7); // 时干丙之地盘在兑7
  });
});

describe("formatText", () => {
  it("主盘九宫格快照", () => {
    const chart = computeQimen(fromSolar(2009, 4, 1, 16, 56));
    expect(formatText(chart)).toMatchSnapshot();
  });

  it("头部含规范要求的全部事实", () => {
    const text = formatText(computeQimen(fromSolar(2009, 4, 1, 16, 56)));
    const header = text.split("+--")[0] ?? "";
    for (const fact of [
      "节气：春分",
      "阳遁六局",
      "下元",
      "符头：甲戌",
      "旬首：甲午",
      "值符：天英",
      "值使：景门",
      "坤二宫",
      "己丑年 丁卯月 丙子日 丙申时",
    ]) {
      expect(header).toContain(fact);
    }
  });

  it("九宫格按洛书 4-9-2 / 3-5-7 / 8-1-6 排布", () => {
    const text = formatText(computeQimen(fromSolar(2009, 4, 1, 16, 56)));
    // 网格行以 | 开头；每行并排三宫
    const order = text
      .split("\n")
      .filter((l) => l.startsWith("|"))
      .flatMap((l) => [...l.matchAll(/([巽离坤震中兑艮坎乾])[一二三四五六七八九]宫/g)].map((m) => m[0]));
    expect(order).toEqual([
      "巽四宫",
      "离九宫",
      "坤二宫",
      "震三宫",
      "中五宫",
      "兑七宫",
      "艮八宫",
      "坎一宫",
      "乾六宫",
    ]);
  });
});
