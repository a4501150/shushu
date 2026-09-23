import { describe, expect, it } from "vitest";
import { fromSolar } from "../calendar";
import { computeBazi, formatText, type BaziResult } from "./index";

// Goldens captured from the Java reference jar cn.6tail:lunar:1.3.15
// (~/.m2/repository/cn/6tail/lunar/1.3.15) via Solar.fromYmdHms(...).getLunar()
// .getEightChar() — default EightChar sect（晚子时日柱作次日）— matching the
// dayGanZhi convention of src/lib/calendar.
interface Golden {
  label: string;
  solar: [number, number, number, number, number];
  /** 年/月/日/时 four pillars, from Java EightChar.get{Year,Month,Day,Time} */
  pillars: [string, string, string, string];
  /** 纳音 per pillar, from Java EightChar.get*NaYin */
  naYin: [string, string, string, string];
}

const GOLDENS: Golden[] = [
  {
    label: "2024-02-04 10:00 立春(16:27)前，年柱仍属癸卯",
    solar: [2024, 2, 4, 10, 0],
    pillars: ["癸卯", "乙丑", "戊戌", "丁巳"],
    naYin: ["金箔金", "海中金", "平地木", "沙中土"],
  },
  {
    label: "2024-02-04 17:30 立春后，年柱转甲辰",
    solar: [2024, 2, 4, 17, 30],
    pillars: ["甲辰", "丙寅", "戊戌", "辛酉"],
    naYin: ["覆灯火", "炉中火", "平地木", "石榴木"],
  },
  {
    label: "2024-02-03 23:30 晚子时，日柱作次日戊戌（sect 1，与日历缝隙同口径）",
    solar: [2024, 2, 3, 23, 30],
    pillars: ["癸卯", "乙丑", "戊戌", "壬子"],
    naYin: ["金箔金", "海中金", "平地木", "桑柘木"],
  },
  {
    label: "2023-01-01 00:30 早子时",
    solar: [2023, 1, 1, 0, 30],
    pillars: ["壬寅", "壬子", "己未", "甲子"],
    naYin: ["金箔金", "桑柘木", "天上火", "海中金"],
  },
  {
    label: "1986-02-08 14:20 常规盘（兼作十神/五行/大运全量校验）",
    solar: [1986, 2, 8, 14, 20],
    pillars: ["丙寅", "庚寅", "癸未", "己未"],
    naYin: ["炉中火", "松柏木", "杨柳木", "天上火"],
  },
];

function baziOf(g: Golden): BaziResult {
  const [y, mo, d, h, mi] = g.solar;
  return computeBazi(fromSolar(y, mo, d, h, mi), "male");
}

describe("四柱/纳音 vs Java cn.6tail:lunar 1.3.15 goldens", () => {
  for (const g of GOLDENS) {
    it(g.label, () => {
      const r = baziOf(g);
      expect(r.pillars.map((p) => p.ganZhi)).toEqual(g.pillars);
      expect(r.pillars.map((p) => p.naYin)).toEqual(g.naYin);
      expect(r.pillars.map((p) => p.name)).toEqual(["年柱", "月柱", "日柱", "时柱"]);
      for (const p of r.pillars) {
        expect(p.gan).toBe(p.ganZhi.charAt(0));
        expect(p.zhi).toBe(p.ganZhi.charAt(1));
        expect(p.hideGan.length).toBe(p.shiShenZhi.length);
        expect(p.hideGan.length).toBeGreaterThan(0);
      }
    });
  }
});

describe("1986-02-08 14:20 男命：十神/藏干/五行/起运/大运 vs Java jar", () => {
  const r = baziOf(GOLDENS[4]!);

  it("天干十神（Java getYear/Month/Day/TimeShiShenGan）", () => {
    expect(r.pillars.map((p) => p.shiShenGan)).toEqual(["正财", "正印", "日主", "七杀"]);
  });

  it("地支藏干（Java getYear/Month/Day/TimeHideGan）", () => {
    expect(r.pillars.map((p) => p.hideGan)).toEqual([
      ["甲", "丙", "戊"],
      ["甲", "丙", "戊"],
      ["己", "丁", "乙"],
      ["己", "丁", "乙"],
    ]);
  });

  it("藏干十神（Java getTimeShiShenZhi，癸水日主）", () => {
    expect(r.pillars[3]!.shiShenZhi).toEqual(["七杀", "偏财", "食神"]);
    expect(r.pillars[0]!.shiShenZhi).toEqual(["伤官", "正财", "正官"]);
  });

  it("五行统计（4 天干 + 12 藏干 = 16；地支本气即藏干首字，不再单计）", () => {
    expect(r.wuXing).toEqual({ 金: 1, 木: 4, 水: 1, 火: 5, 土: 5 });
  });

  it("起运（Java Yun，gender=1 sect=1）：8年6月20日0时辰，顺排", () => {
    expect(r.qiYun).toEqual({
      afterYears: 8,
      afterMonths: 6,
      afterDays: 20,
      afterShiChen: 0,
      forward: true,
    });
  });

  it("大运首两步（Java DaYun）", () => {
    expect(r.daYun[0]).toEqual({ ganZhi: "辛卯", startAge: 9, startYear: 1994, endYear: 2003 });
    expect(r.daYun[1]).toEqual({ ganZhi: "壬辰", startAge: 19, startYear: 2004, endYear: 2013 });
    // Pre-起运 placeholder (empty 干支) is filtered out.
    expect(r.daYun.every((d) => d.ganZhi !== "")).toBe(true);
  });
});

describe("computeBazi gender 映射与 formatText", () => {
  it("female 逆排：2024-02-04 17:30 甲辰阳年女命逆排", () => {
    const male = computeBazi(fromSolar(2024, 2, 4, 17, 30), "male");
    const female = computeBazi(fromSolar(2024, 2, 4, 17, 30), "female");
    // 甲（阳）年：男顺女逆。
    expect(male.qiYun.forward).toBe(true);
    expect(female.qiYun.forward).toBe(false);
  });

  it("formatText 输出完整盘板", () => {
    const text = formatText(baziOf(GOLDENS[4]!));
    expect(text).toContain("乾造");
    expect(text).toContain("阳历：1986-02-08 14:20");
    expect(text).toContain("丙寅");
    expect(text).toContain("炉中火");
    expect(text).toContain("金1 木4 水1 火5 土5");
    expect(text).toContain("按天干与地支藏干计");
    expect(text).toContain("8年6月20日起运");
    expect(text).toContain("顺排");
    expect(text).toContain("辛卯 9岁 1994-2003");
  });
});
