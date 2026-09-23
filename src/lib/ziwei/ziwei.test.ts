import { describe, expect, it } from "vitest";
import { fromSolar } from "@/lib/calendar";
import { computeZiwei, formatText, timeIndexOf } from "./index";

describe("timeIndexOf", () => {
  it("maps 00:30 to 0 (早子时)", () => {
    expect(timeIndexOf(fromSolar(2000, 8, 10, 0, 30))).toBe(0);
  });
  it("maps 23:30 to 12 (夜子时归次日子时)", () => {
    expect(timeIndexOf(fromSolar(2000, 8, 10, 23, 30))).toBe(12);
  });
  it("maps ordinary 时辰 to the zhi index", () => {
    expect(timeIndexOf(fromSolar(2000, 8, 10, 8, 0))).toBe(4); // 辰
    expect(timeIndexOf(fromSolar(2000, 8, 10, 13, 0))).toBe(7); // 未
  });
});

describe("computeZiwei", () => {
  // 2000-08-10 08:00 (庚辰年 甲申月 庚子日 庚辰时), 女. Anchor facts taken
  // from the reference run of iztro used during development.
  const m = fromSolar(2000, 8, 10, 8, 0);
  const r = computeZiwei(m, "female");

  it("basic chart anchors", () => {
    expect(r.lunarDate).toContain("七月十一");
    expect(r.chineseDate).toContain("庚辰 甲申 庚子 庚辰");
    expect(r.fiveElementsClass).toBe("金四局");
    expect(r.soulStar).toBe("廉贞");
    expect(r.bodyStar).toBe("文昌");
    expect(r.soulPalaceBranch).toBe("辰");
    expect(r.bodyPalaceBranch).toBe("子");
  });

  it("庚干四化 exactly: 太阳禄 武曲权 太阴科 天同忌", () => {
    const mutagens = r.palaces
      .flatMap((p) => [...p.majorStars, ...p.minorStars])
      .filter((s) => s.mutagen)
      .map((s) => `${s.name}化${s.mutagen}`)
      .sort();
    expect(mutagens).toEqual(
      ["太阳化禄", "武曲化权", "太阴化科", "天同化忌"].sort()
    );
  });

  it("palaces are the fixed 寅→丑 ring", () => {
    expect(r.palaces.map((p) => p.earthlyBranch)).toEqual([
      "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑",
    ]);
  });

  it("甲年春节子时生人命宫在寅 (正月从寅起, 子时不动宫)", () => {
    const c = computeZiwei(fromSolar(2024, 2, 10, 0, 30), "male"); // 正月初一
    expect(c.soulPalaceBranch).toBe("寅");
  });

  it("leap lunar month chart builds (闰月作下月用)", () => {
    // 2023-04-20 falls in 闰二月
    const c = computeZiwei(fromSolar(2023, 4, 20, 10, 0), "male");
    expect(c.palaces).toHaveLength(12);
    expect(c.fiveElementsClass).toMatch(/^[金木水火土](二|三|四|五|六)局$/);
  });
});

describe("formatText", () => {
  it("renders header and twelve palace rows", () => {
    const text = formatText(computeZiwei(fromSolar(2000, 8, 10, 8, 0), "female"));
    const lines = text.split("\n");
    expect(lines[0]).toContain("坤造");
    expect(lines[1]).toContain("金四局");
    expect(lines).toHaveLength(15); // 2 headers + blank + 12 palaces
    expect(text).toMatch(/命宫/);
  });
});
