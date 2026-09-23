// 小六壬 (Xiao Liu Ren) engine — faithful port of
// com.spotify.liuren.littleliuren.LiuRenUtil from the liuren Java repo.
//
// The Java original carries long 断语 texts per 六神; per project decision we
// keep only the short verse (诀) and defer interpretation to an LLM.
import type { ChartMoment, ShiChenIndex } from "../calendar";
import { SHI_CHEN_ZHI, now } from "../calendar";
import { strokeCount } from "./strokes";

/** 六神 order, matching Java liuRenMap keys 1..6. */
export const LIU_SHEN = [
  "大安",
  "留连",
  "速喜",
  "赤口",
  "小吉",
  "空亡",
] as const;
export type LiuShen = (typeof LIU_SHEN)[number];

/** Short verses (诀), one per 六神, copied from Java liuRenExplainMap. */
const LIU_SHEN_VERSES: readonly [LiuShen, string][] = [
  ["大安", "大安事事昌，求财在坤方，失物去不远，宅舍保安康。行人身未动，病者主无妨，将军回田野，仔细更推详。"],
  ["留连", "留连事难成，求谋日未明，官事凡宜缓，去者未回程。失物南方见，急讨方心称，更须防口舌，人口且平平。"],
  ["速喜", "速喜喜来临，求财向南行，失物申未午，逢人路上寻。官事有福德，病者无祸侵，田宅六畜吉，行人有信音。"],
  ["赤口", "赤口主口舌，官非切宜防，失物速速讨，行人有惊慌。六畜多作径，病者出西方，更须防咀咒，诚恐染瘟皇。"],
  ["小吉", "小吉最吉昌，路上好商量，明人来报喜，失物在坤方。行人即便至，交关甚是强，凡事皆和合，病者叩穷苍。"],
  ["空亡", "空亡事不样，阴人多乖张，求财无利益，行人有灾殃。失物寻一见，官事有刑伤，病人逢暗鬼，解禳保安康。"],
] as const;

/** A character that has no kTotalStrokes data and therefore cannot be counted. */
export interface UnsupportedChar {
  char: string;
  /** Unicode code point in "U+XXXX" form. */
  codePoint: string;
}

export interface XiaoliurenInput {
  /** 农历月 used for 起课; leap months are recorded negative (counted by |月|). */
  lunarMonth: number;
  /** 农历日 1-30. */
  lunarDay: number;
  shiChenIndex: ShiChenIndex;
  shiChenName: string;
}

export interface XiaoliurenResult {
  /** 1..6, matching Java getLiuRenPosition. */
  position: 1 | 2 | 3 | 4 | 5 | 6;
  liuShen: LiuShen;
  verse: string;
  mode: "time" | "stroke";
  input: XiaoliurenInput;
  /** Stroke mode only: summed kTotalStrokes of the queried characters. */
  strokeTotal?: number;
  /** Stroke mode only: the queried characters. */
  queriedChars?: string;
}

export type StrokeOutcome =
  | { ok: true; result: XiaoliurenResult }
  | { ok: false; unsupported: UnsupportedChar[] };

/**
 * Java getLiuRenPosition: offset % 6 + 1 over (month-1, day-1, hour-1)
 * offsets. Returns 1..6.
 */
function liuRenPosition(monthOffset: number, dayOffset: number, hourOffset: number): 1 | 2 | 3 | 4 | 5 | 6 {
  const offset = monthOffset + dayOffset + hourOffset;
  // Lunar day 1-30 and month 1-12 are always positive, but keep the modulo
  // non-negative in case of odd inputs.
  return (((offset % 6) + 6) % 6 + 1) as 1 | 2 | 3 | 4 | 5 | 6;
}

function resultFor(position: 1 | 2 | 3 | 4 | 5 | 6, mode: "time" | "stroke", input: XiaoliurenInput): XiaoliurenResult {
  const liuShen = LIU_SHEN[position - 1];
  const [, verse] = LIU_SHEN_VERSES[position - 1];
  return { position, liuShen, verse, mode, input };
}

function inputOf(m: ChartMoment, lunarMonth: number): XiaoliurenInput {
  return {
    lunarMonth,
    lunarDay: m.lunarDay,
    shiChenIndex: m.shiChenIndex,
    shiChenName: SHI_CHEN_ZHI[m.shiChenIndex],
  };
}

/**
 * 时间起课: position = ((|lunarMonth| - 1) + (lunarDay - 1) + shiChenIndex) % 6 + 1.
 *
 * Java uses `month - 1, day - 1, lunarHour - 1` where lunarHour is the
 * 时辰 ordinal 1..12 (子时 = 1), i.e. exactly `shiChenIndex`. The Java lunar
 * calendar reports leap months as plain month numbers, so leap months are
 * treated as their absolute value here (ChartMoment marks leap months with a
 * negative lunarMonth).
 */
export function computeFromMoment(m: ChartMoment): XiaoliurenResult {
  return resultFor(
    liuRenPosition(Math.abs(m.lunarMonth) - 1, m.lunarDay - 1, m.shiChenIndex),
    "time",
    inputOf(m, m.lunarMonth),
  );
}

/**
 * Sum kTotalStrokes over the string's Unicode code points, fixing the Java
 * surrogate-pair bug (Java advanced i by 1, so supplementary-plane characters
 * were counted twice). Characters without stroke data are collected instead of
 * silently skipped.
 */
export function sumStrokes(chars: string): { total: number; unsupported: UnsupportedChar[] } {
  let total = 0;
  const unsupported: UnsupportedChar[] = [];
  for (let i = 0; i < chars.length; ) {
    const cp = chars.codePointAt(i) as number;
    const count = strokeCount(cp);
    if (count === undefined) {
      unsupported.push({
        char: String.fromCodePoint(cp),
        codePoint: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
      });
    } else {
      total += count;
    }
    i += String.fromCodePoint(cp).length;
  }
  return { total, unsupported };
}

/**
 * 字占起课: Java getLiuRenStrokeBasedResponse — month offset is 0, the stroke
 * total replaces the day offset, and the current 时辰 is the hour offset:
 * position = ((strokeTotal - 1) + shiChenIndex) % 6 + 1.
 *
 * If `m` is null the current time is used (Java used LocalDateTime.now()).
 * When any character lacks stroke data the outcome reports it as unsupported
 * (Java threw NPE / silently miscounted); the caller should ask the user to
 * retry with supported characters.
 */
export function computeFromStrokes(chars: string, m: ChartMoment | null): StrokeOutcome {
  const moment = m ?? now();
  const { total, unsupported } = sumStrokes(chars);
  if (unsupported.length > 0 || total === 0) {
    return { ok: false, unsupported };
  }
  const result = resultFor(liuRenPosition(0, total - 1, moment.shiChenIndex), "stroke", inputOf(moment, moment.lunarMonth));
  result.strokeTotal = total;
  result.queriedChars = chars;
  return { ok: true, result };
}

/** Plain-text board, suitable for an LLM prompt or direct display. */
export function formatText(result: XiaoliurenResult): string {
  const lines: string[] = [];
  lines.push("小六壬起课");
  if (result.mode === "stroke") {
    lines.push(`方式：字占（${result.queriedChars ?? ""}，总笔画 ${result.strokeTotal}）`);
  } else {
    lines.push("方式：时间起课");
  }
  const lm = result.input.lunarMonth;
  lines.push(
    `农历：${lm < 0 ? "闰" : ""}${Math.abs(lm)}月${result.input.lunarDay}日 ${result.input.shiChenName}时`
  );
  lines.push(`六神：${result.liuShen}（第${result.position}位）`);
  lines.push(`诀曰：${result.verse}`);
  return lines.join("\n");
}
