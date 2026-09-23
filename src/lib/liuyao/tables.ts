/** 卦象/纳甲/八宫静态表. Port of Trigram.java, NaJiaEntry.java, PaiPanTables.java. */
import type { WuXing } from "./wuxing";

/** 八卦, keyed by hexagram character (Trigram.ch is the identity key). */
export type Trigram = "乾" | "兑" | "离" | "震" | "巽" | "坎" | "艮" | "坤";

/** 六爻位置名，自下而上。 */
export const YAO_NAMES = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"] as const;

export interface TrigramData {
  /** Trigram symbol, same as the key. */
  ch: Trigram;
  /** Top-to-bottom yao bits (same top-first order as GUA64 keys), e.g. 兑 = "011". */
  bits: string;
  wuXing: WuXing;
}

export const TRIGRAMS: Readonly<Record<Trigram, TrigramData>> = {
  乾: { ch: "乾", bits: "111", wuXing: "金" },
  兑: { ch: "兑", bits: "011", wuXing: "金" },
  离: { ch: "离", bits: "101", wuXing: "火" },
  震: { ch: "震", bits: "001", wuXing: "木" },
  巽: { ch: "巽", bits: "110", wuXing: "木" },
  坎: { ch: "坎", bits: "010", wuXing: "水" },
  艮: { ch: "艮", bits: "100", wuXing: "土" },
  坤: { ch: "坤", bits: "000", wuXing: "土" },
};

const TRIGRAM_BY_BITS: ReadonlyMap<string, Trigram> = new Map(
  (Object.values(TRIGRAMS) as TrigramData[]).map((t) => [t.bits, t.ch]),
);

export function trigramFromBits(bits: string): Trigram {
  const t = TRIGRAM_BY_BITS.get(bits);
  if (t === undefined) {
    throw new Error(`Unknown trigram bits: ${bits}`);
  }
  return t;
}

/** 八卦取象 (Trigram → natural symbol), for hexagram long names. */
export const TRIGRAM_NATURE: Readonly<Record<Trigram, string>> = {
  乾: "天",
  坤: "地",
  坎: "水",
  离: "火",
  震: "雷",
  艮: "山",
  巽: "风",
  兑: "泽",
};

/** 64卦查表：倒序二进制 key（自上而下）→ 卦名. */
export const GUA64: ReadonlyMap<string, string> = new Map([
  ["111111", "乾"],
  ["000000", "坤"],
  ["010001", "屯"],
  ["100010", "蒙"],
  ["010111", "需"],
  ["111010", "讼"],
  ["000010", "师"],
  ["010000", "比"],
  ["110111", "小畜"],
  ["111011", "履"],
  ["000111", "泰"],
  ["111000", "否"],
  ["111101", "同人"],
  ["101111", "大有"],
  ["000100", "谦"],
  ["001000", "豫"],
  ["011001", "随"],
  ["100110", "蛊"],
  ["000011", "临"],
  ["110000", "观"],
  ["101001", "噬嗑"],
  ["100101", "贲"],
  ["100000", "剥"],
  ["000001", "复"],
  ["111001", "无妄"],
  ["100111", "大畜"],
  ["100001", "颐"],
  ["011110", "大过"],
  ["010010", "坎"],
  ["101101", "离"],
  ["011100", "咸"],
  ["001110", "恒"],
  ["111100", "遁"],
  ["001111", "大壮"],
  ["101000", "晋"],
  ["000101", "明夷"],
  ["110101", "家人"],
  ["101011", "睽"],
  ["010100", "蹇"],
  ["001010", "解"],
  ["100011", "损"],
  ["110001", "益"],
  ["011111", "夬"],
  ["111110", "姤"],
  ["011000", "萃"],
  ["000110", "升"],
  ["011010", "困"],
  ["010110", "井"],
  ["011101", "革"],
  ["101110", "鼎"],
  ["001001", "震"],
  ["100100", "艮"],
  ["110100", "渐"],
  ["001011", "归妹"],
  ["001101", "丰"],
  ["101100", "旅"],
  ["110110", "巽"],
  ["011011", "兑"],
  ["110010", "涣"],
  ["010011", "节"],
  ["110011", "中孚"],
  ["001100", "小过"],
  ["010101", "既济"],
  ["101010", "未济"],
]);

/** 纳甲条目: stem + 三爻地支（自下而上）. */
export interface NaJiaEntry {
  stem: string;
  branches: readonly string[];
}

/** 纳甲：内卦（下三爻）. */
export const INNER_NA_JIA: ReadonlyMap<Trigram, NaJiaEntry> = new Map<
  Trigram,
  NaJiaEntry
>([
  ["乾", { stem: "甲", branches: ["子", "寅", "辰"] }],
  ["坤", { stem: "乙", branches: ["未", "巳", "卯"] }],
  ["震", { stem: "庚", branches: ["子", "寅", "辰"] }],
  ["巽", { stem: "辛", branches: ["丑", "亥", "酉"] }],
  ["坎", { stem: "戊", branches: ["寅", "辰", "午"] }],
  ["离", { stem: "己", branches: ["卯", "丑", "亥"] }],
  ["艮", { stem: "丙", branches: ["辰", "午", "申"] }],
  ["兑", { stem: "丁", branches: ["巳", "卯", "丑"] }],
]);

/** 纳甲：外卦（上三爻）. */
export const OUTER_NA_JIA: ReadonlyMap<Trigram, NaJiaEntry> = new Map<
  Trigram,
  NaJiaEntry
>([
  ["乾", { stem: "壬", branches: ["午", "申", "戌"] }],
  ["坤", { stem: "癸", branches: ["丑", "亥", "酉"] }],
  ["震", { stem: "庚", branches: ["午", "申", "戌"] }],
  ["巽", { stem: "辛", branches: ["未", "巳", "卯"] }],
  ["坎", { stem: "戊", branches: ["申", "戌", "子"] }],
  ["离", { stem: "己", branches: ["酉", "未", "巳"] }],
  ["艮", { stem: "丙", branches: ["戌", "子", "寅"] }],
  ["兑", { stem: "丁", branches: ["亥", "酉", "未"] }],
]);

/** 世应位置，按宫 idx 0-7 索引: [shi, ying]（1-based）. */
export const SHI_YING: readonly (readonly [number, number])[] = [
  [6, 3], // 0: 本宫卦
  [1, 4], // 1: 一世卦
  [2, 5], // 2: 二世卦
  [3, 6], // 3: 三世卦
  [4, 1], // 4: 四世卦
  [5, 2], // 5: 五世卦
  [4, 1], // 6: 游魂卦
  [3, 6], // 7: 归魂卦
];

/** 地支→五行. */
export const BRANCH_WU_XING: ReadonlyMap<string, WuXing> = new Map([
  ["子", "水"],
  ["丑", "土"],
  ["寅", "木"],
  ["卯", "木"],
  ["辰", "土"],
  ["巳", "火"],
  ["午", "火"],
  ["未", "土"],
  ["申", "金"],
  ["酉", "金"],
  ["戌", "土"],
  ["亥", "水"],
]);

/** 八宫归属条目. */
export interface PalaceEntry {
  palace: Trigram;
  /** 0=本宫卦 … 7=归魂卦 */
  index: number;
}

function buildPalaceMap(): ReadonlyMap<string, PalaceEntry> {
  const m = new Map<string, PalaceEntry>();
  const registerPalace = (palace: Trigram, keys: readonly string[]): void => {
    keys.forEach((key, i) => {
      m.set(key, { palace, index: i });
    });
  };
  // 乾宫: 乾,姤,遁,否,观,剥,晋,大有
  registerPalace("乾", [
    "111111",
    "111110",
    "111100",
    "111000",
    "110000",
    "100000",
    "101000",
    "101111",
  ]);
  // 坎宫: 坎,节,屯,既济,革,丰,明夷,师
  registerPalace("坎", [
    "010010",
    "010011",
    "010001",
    "010101",
    "011101",
    "001101",
    "000101",
    "000010",
  ]);
  // 艮宫: 艮,贲,大畜,损,睽,履,中孚,渐
  registerPalace("艮", [
    "100100",
    "100101",
    "100111",
    "100011",
    "101011",
    "111011",
    "110011",
    "110100",
  ]);
  // 震宫: 震,豫,解,恒,升,井,大过,随
  registerPalace("震", [
    "001001",
    "001000",
    "001010",
    "001110",
    "000110",
    "010110",
    "011110",
    "011001",
  ]);
  // 巽宫: 巽,小畜,家人,益,无妄,噬嗑,颐,蛊
  registerPalace("巽", [
    "110110",
    "110111",
    "110101",
    "110001",
    "111001",
    "101001",
    "100001",
    "100110",
  ]);
  // 离宫: 离,旅,鼎,未济,蒙,涣,讼,同人
  registerPalace("离", [
    "101101",
    "101100",
    "101110",
    "101010",
    "100010",
    "110010",
    "111010",
    "111101",
  ]);
  // 坤宫: 坤,复,临,泰,大壮,夬,需,比
  registerPalace("坤", [
    "000000",
    "000001",
    "000011",
    "000111",
    "001111",
    "011111",
    "010111",
    "010000",
  ]);
  // 兑宫: 兑,困,萃,咸,蹇,谦,小过,归妹
  registerPalace("兑", [
    "011011",
    "011010",
    "011000",
    "011100",
    "010100",
    "000100",
    "001100",
    "001011",
  ]);
  return m;
}

/** 八宫归属：倒序二进制 key →（宫，宫内 idx）. */
export const HEXAGRAM_PALACE: ReadonlyMap<string, PalaceEntry> =
  buildPalaceMap();
