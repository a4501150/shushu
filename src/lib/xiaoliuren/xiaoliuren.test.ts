import { describe, expect, it } from "vitest";
import { fromSolar, type ChartMoment, type ShiChenIndex } from "../calendar";
import { LIU_SHEN, computeFromMoment, computeFromStrokes, formatText, sumStrokes } from "./index";

/** Minimal ChartMoment for pure arithmetic tests. */
function moment(lunarMonth: number, lunarDay: number, shiChenIndex: ShiChenIndex): ChartMoment {
  return {
    solar: { year: 2024, month: 1, day: 1, hour: 0, minute: 0 },
    lunarMonth,
    lunarDay,
    shiChenIndex,
    yearGanZhi: "",
    monthGanZhi: "",
    dayGanZhi: "",
    timeGanZhi: "",
    prevJieqi: { name: "冬至", date: "2023-12-22" },
  } as ChartMoment;
}

describe("computeFromMoment（Java getLiuRenPosition: (month-1 + day-1 + hour-1) % 6 + 1）", () => {
  // Hand-derived from the Java logic; lunarHour is the 时辰 ordinal (子=1),
  // i.e. shiChenIndex, so the hour offset equals shiChenIndex.
  const cases: [number, number, ShiChenIndex, number, string][] = [
    // 正月初一子时: offset 0 → 1 大安
    [1, 1, 0, 1, "大安"],
    // 五月初五午时(idx 6): 4+4+6=14 → 14%6+1=3 速喜
    [5, 5, 6, 3, "速喜"],
    // 十二月三十亥时(idx 11): 11+29+11=51 → 51%6+1=4 赤口
    [12, 30, 11, 4, "赤口"],
    // 闰二月初三卯时(idx 3): |−2|−1+3−1+3=6 → 6%6+1=1 大安
    [-2, 3, 3, 1, "大安"],
    // 六月二十九卯时(idx 3): 5+28+3=36 → 36%6+1=1 大安
    [6, 29, 3, 1, "大安"],
  ];
  for (const [lunarMonth, lunarDay, idx, position, liuShen] of cases) {
    it(`农历${lunarMonth}月${lunarDay}日 第${idx + 1}时辰 → ${liuShen}`, () => {
      const r = computeFromMoment(moment(lunarMonth, lunarDay, idx));
      expect(r.position).toBe(position);
      expect(r.liuShen).toBe(liuShen);
      expect(r.mode).toBe("time");
      // Leap months are recorded negative on the input; counting uses |月|.
      expect(r.input.lunarMonth).toBe(lunarMonth);
    });
  }

  it("real date 2024-02-04 10:00（农历十二月廿五巳时）→ 小吉", () => {
    // 11+24+5=40 → 40%6+1=5
    const r = computeFromMoment(fromSolar(2024, 2, 4, 10, 0));
    expect(r.input.lunarMonth).toBe(12);
    expect(r.input.lunarDay).toBe(25);
    expect(r.position).toBe(5);
    expect(r.liuShen).toBe("小吉");
  });

  it("leap-month date 2023-04-10 15:00（闰二月二十申时，15:00 整点入申）→ 小吉", () => {
    // |−2|−1+20−1+8=28 → 28%6+1=5
    const r = computeFromMoment(fromSolar(2023, 4, 10, 15, 0));
    expect(r.input.lunarMonth).toBe(-2);
    expect(formatText(r)).toContain("闰2月20日");
    expect(r.position).toBe(5);
    expect(r.liuShen).toBe("小吉");
  });

  it("every position carries its matching short verse", () => {
    for (let idx = 0 as ShiChenIndex; idx < 6; idx = (idx + 1) as ShiChenIndex) {
      const r = computeFromMoment(moment(idx + 1, 1, 0));
      expect(r.liuShen).toBe(LIU_SHEN[r.position - 1]);
      expect(r.verse.length).toBeGreaterThan(10);
      expect(r.verse).not.toContain("问运势"); // long 断语 text must not leak in
    }
  });
});

describe("stroke sums（Unihan kTotalStrokes，U+4E00-U+9FFF）", () => {
  it.each([
    ["一", 1],
    ["十", 2],
    ["大", 3],
    ["吉", 6],
    ["一二三", 6],
    ["大吉", 9],
  ])("sumStrokes(%s) = %i", (chars, total) => {
    const { total: got, unsupported } = sumStrokes(chars);
    expect(unsupported).toEqual([]);
    expect(got).toBe(total);
  });

  it("reports non-CJK and out-of-block characters as unsupported, once per code point", () => {
    // 𠮷 is U+20BB7: two UTF-16 code units. The Java original advanced the
    // index by 1 per loop (surrogate bug); we advance by charCount.
    const { total, unsupported } = sumStrokes("a一𠮷");
    expect(total).toBe(1);
    expect(unsupported.map((u) => u.char)).toEqual(["a", "𠮷"]);
    expect(unsupported.map((u) => u.codePoint)).toEqual(["U+0061", "U+20BB7"]);
  });
});

describe("computeFromStrokes（Java: position = (strokeTotal-1 + 时辰ordinal-1) % 6 + 1）", () => {
  it("总笔画9 + 子时 → 速喜", () => {
    const outcome = computeFromStrokes("大吉", moment(1, 1, 0));
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.result.position).toBe(3); // 8+0=8 → 8%6+1=3
      expect(outcome.result.liuShen).toBe("速喜");
      expect(outcome.result.strokeTotal).toBe(9);
      expect(outcome.result.mode).toBe("stroke");
    }
  });

  it("总笔画9 + 卯时 → 空亡", () => {
    const outcome = computeFromStrokes("大吉", moment(1, 1, 3));
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.result.position).toBe(6); // 8+3=11 → 11%6+1=6
  });

  it("unsupported chars abort with a retry flag", () => {
    const outcome = computeFromStrokes("大a", moment(1, 1, 0));
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.unsupported.map((u) => u.char)).toEqual(["a"]);
  });

  it("null moment falls back to the current time", () => {
    const outcome = computeFromStrokes("一", null);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.result.position).toBeGreaterThanOrEqual(1);
  });
});

describe("formatText", () => {
  it("renders the board with 六神 and 诀", () => {
    const text = formatText(computeFromMoment(moment(1, 1, 0)));
    expect(text).toContain("小六壬");
    expect(text).toContain("六神：大安");
    expect(text).toContain("诀曰：大安事事昌");
    expect(text).toContain("农历：1月1日 子时");
  });
});
