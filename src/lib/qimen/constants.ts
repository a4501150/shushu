// 时家奇门遁甲（拆补法）静态数据表。
//
// SOURCES (every rule cross-checked against these published sources):
//   https://ly.yishihui.net/2459.htm                     （拆补法三元定局表）
//   https://zh.wikisource.org/wiki/奇門遁甲元靈經          （值符值使、時干加時干口訣）
//   https://zh.wikisource.org/wiki/奇門遁甲統宗            （九星八門八神、陽陰遁順逆）
//   https://mingge.org/compendium/qimen/method            （現代拆補法步驟彙編）
//   https://zh.wikipedia.org/奇门遁甲                      （局數表、符頭三元）
import type { Dun, PalaceId, Yuan } from "./types";

/** 洛书三行（九宫格打印顺序）。 */
export const LUOSHU_ROWS: readonly [readonly PalaceId[], readonly PalaceId[], readonly PalaceId[]] =
  [
    [4, 9, 2],
    [3, 5, 7],
    [8, 1, 6],
  ] as const;

/**
 * 八宫圆局（从坎一出发顺时针绕洛书一周）。九星、八门、八神的"刚性旋转"
 * 一律在该圆上进行，中五宫不在圆上（中5 寄坤2）。
 */
export const PALACE_CIRCLE: readonly PalaceId[] = [1, 8, 3, 4, 9, 2, 7, 6] as const;

export const PALACE_NAMES: Readonly<Record<PalaceId, string>> = {
  1: "坎一宫",
  2: "坤二宫",
  3: "震三宫",
  4: "巽四宫",
  5: "中五宫",
  6: "乾六宫",
  7: "兑七宫",
  8: "艮八宫",
  9: "离九宫",
};

/** 地盘三奇六仪布排顺序（甲隐于六仪之下）。 */
export const EARTH_STEM_ORDER = ["戊", "己", "庚", "辛", "壬", "癸", "丁", "丙", "乙"] as const;

/** 节气 → [上元局, 中元局, 下元局]。阳遁：冬至→芒种 12 节气；阴遁：夏至→大雪。 */
export const JIEQI_JU: Readonly<Record<string, readonly [number, number, number]>> = {
  冬至: [1, 7, 4],
  小寒: [2, 8, 5],
  大寒: [3, 9, 6],
  立春: [8, 5, 2],
  雨水: [9, 6, 3],
  惊蛰: [1, 7, 4],
  春分: [3, 9, 6],
  清明: [4, 1, 7],
  谷雨: [5, 2, 8],
  立夏: [4, 1, 7],
  小满: [5, 2, 8],
  芒种: [6, 3, 9],
  夏至: [9, 3, 6],
  小暑: [8, 2, 5],
  大暑: [7, 1, 4],
  立秋: [2, 5, 8],
  处暑: [1, 4, 7],
  白露: [9, 3, 6],
  秋分: [7, 1, 4],
  寒露: [6, 9, 3],
  霜降: [5, 8, 2],
  立冬: [6, 9, 3],
  小雪: [5, 8, 2],
  大雪: [4, 7, 1],
};

/** 阳遁管辖的 12 节气（冬至→芒种）；其余 12 节气为阴遁。 */
export const YANG_JIEQI: ReadonlySet<string> = new Set([
  "冬至",
  "小寒",
  "大寒",
  "立春",
  "雨水",
  "惊蛰",
  "春分",
  "清明",
  "谷雨",
  "立夏",
  "小满",
  "芒种",
]);

/** 九星本宫（家宫）。禽本居中5，行踪恒与芮相携（寄坤2）。 */
export const STAR_BY_PALACE: Readonly<Record<PalaceId, string>> = {
  1: "天蓬",
  2: "天芮",
  3: "天冲",
  4: "天辅",
  5: "天禽",
  6: "天心",
  7: "天柱",
  8: "天任",
  9: "天英",
};

/** 八门本宫。 */
export const DOOR_BY_PALACE: Readonly<Record<PalaceId, string>> = {
  1: "休门",
  2: "死门",
  3: "伤门",
  4: "杜门",
  5: "死门", // 中5 无门，借坤2（死门）
  6: "开门",
  7: "惊门",
  8: "生门",
  9: "景门",
};

/**
 * 八神顺序（阳遁顺排、阴遁逆排，起于值符星新落之宫）。
 * 注：部分流派以勾陈、朱雀替代白虎、玄武（值符后第二、三位亦另有螣蛇/朱雀之说），
 * 本盘采用主流八神（任铁樵/《元灵经》系统今传本）：值符 螣蛇 太阴 六合 白虎 玄武 九地 九天。
 */
export const GODS_ORDER: readonly string[] = [
  "值符",
  "螣蛇",
  "太阴",
  "六合",
  "白虎",
  "玄武",
  "九地",
  "九天",
] as const;

/** 六甲旬首遁藏之仪：甲子戊 甲戌己 甲申庚 甲午辛 甲辰壬 甲寅癸（按下标 = 旬序 0..5）。 */
export const XUN_HEAD_YI: readonly string[] = ["戊", "己", "庚", "辛", "壬", "癸"] as const;

/** 符头地支 → 三元：子午卯酉上元，寅申巳亥中元，辰戌丑未下元。 */
export function yuanFromBranch(branch: string): Yuan {
  if ("子午卯酉".includes(branch)) return "上元";
  if ("寅申巳亥".includes(branch)) return "中元";
  if ("辰戌丑未".includes(branch)) return "下元";
  throw new Error(`unknown branch: ${branch}`);
}

export function dunOfJieqi(jieqi: string): Dun {
  return YANG_JIEQI.has(jieqi) ? "yang" : "yin";
}

/** 在八宫圆上的下标（0..7）；中5 寄坤2 后取宫。 */
export function circleIndexOf(palace: PalaceId): number {
  const p: PalaceId = palace === 5 ? 2 : palace;
  const i = PALACE_CIRCLE.indexOf(p);
  if (i < 0) throw new Error(`palace ${palace} not on circle`);
  return i;
}
