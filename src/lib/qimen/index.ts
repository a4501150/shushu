// 时家奇门遁甲排盘引擎（拆补法）。
//
// SOURCES:
//   https://ly.yishihui.net/2459.htm
//   https://zh.wikisource.org/wiki/奇門遁甲元靈經
//   https://zh.wikisource.org/wiki/奇門遁甲統宗
//   https://mingge.org/compendium/qimen/method
//   https://zh.wikipedia.org/奇门遁甲
//
// 定局用拆补法：当值节气（节气当日管全天）+ 符头地支定三元，不置闰、不超接。
// 学派分支（均为有意择从，与置闰/交节起元生成的盘可合理不同）：符头定元（非交节起元）；
// 值使沿洛书九宫飞布、中五寄坤二；天禽随天芮转（非恒居中五，见 constants 注）。
// 日干支取 ChartMoment.dayGanZhi（晚子时换日，口径在 calendar 层已统一）。
// 口径分歧（已知、有意为之）：交节当日，局数按"当日管全天"从零点即换节气，
// 而月柱（四柱/紫微口径）按交节时刻换月——交节时刻前的当日排盘两处口径不一致。
import type { ChartMoment } from "../calendar";
import {
  DOOR_BY_PALACE,
  EARTH_STEM_ORDER,
  GODS_ORDER,
  JIEQI_JU,
  PALACE_CIRCLE,
  PALACE_NAMES,
  STAR_BY_PALACE,
  XUN_HEAD_YI,
  circleIndexOf,
  dunOfJieqi,
  yuanFromBranch,
} from "./constants";
import { ganzhiFromIndex, ganzhiIndex, xunHeadIndex } from "../ganzhi";
import type { PalaceCell, PalaceId, QimenChart, Yuan } from "./types";

const YUAN_INDEX: readonly Yuan[] = ["上元", "中元", "下元"];

/**
 * 符头：当日或之前最近的甲/己日，即 60 甲子序数减去 index%5。
 * 三元由符头地支定：子午卯酉上元，寅申巳亥中元，辰戌丑未下元。
 */
export function fuTouAndYuan(dayGanZhi: string): { fuTou: string; yuan: Yuan } {
  const n = ganzhiIndex(dayGanZhi);
  const fuTou = ganzhiFromIndex(n - (n % 5));
  return { fuTou, yuan: yuanFromBranch(fuTou[1]) };
}

/** 洛书数上的顺逆行宫（阳遁+1、阴遁-1，1..9 循环）。 */
function flyLuoshu(palace: number, step: number): number {
  return ((palace - 1 + step + 9) % 9) + 1;
}

/** 中5 寄坤2：中五宫显示一律借坤2。 */
function borrow2(palace: number): PalaceId {
  return (palace === 5 ? 2 : palace) as PalaceId;
}

/** 地盘九宫：三奇六仪自局数宫起，阳遁顺飞、阴遁逆飞。 */
function buildEarthBoard(ju: number, yang: boolean): { palaceOfStem: Map<string, number>; earth: Map<number, string> } {
  const step = yang ? 1 : -1;
  const palaceOfStem = new Map<string, number>();
  const earth = new Map<number, string>();
  let palace = ju;
  for (const stem of EARTH_STEM_ORDER) {
    palaceOfStem.set(stem, palace);
    earth.set(palace, stem);
    palace = flyLuoshu(palace, step);
  }
  return { palaceOfStem, earth };
}

/** 时刻旬内序号（旬首=0）与旬首遁仪。 */
function hourXun(timeGanZhi: string): { xunShou: string; yi: string; ordinal: number } {
  const n = ganzhiIndex(timeGanZhi);
  const head = xunHeadIndex(n);
  return { xunShou: ganzhiFromIndex(head), yi: XUN_HEAD_YI[head / 10], ordinal: n - head };
}

/**
 * 天盘九星：值符星（含其时干）迁至「地盘干 == 时干」之宫（时干甲则遁于旬首仪之宫），
 * 余星在八宫圆上刚性随转；天禽恒随天芮，携中5、坤2 两干。
 */
function buildHeavenBoard(
  earth: Map<number, string>,
  zhifuPalace: number,
  targetPalace: number,
): Map<number, PalaceCell> {
  const shift = circleIndexOf(borrow2(targetPalace)) - circleIndexOf(borrow2(zhifuPalace));
  const out = new Map<number, PalaceCell>();
  for (let k = 0; k < PALACE_CIRCLE.length; k++) {
    const home = PALACE_CIRCLE[k];
    const dest = PALACE_CIRCLE[(((k + shift) % 8) + 8) % 8];
    const cell = out.get(dest) ?? emptyCell(dest, earth);
    // 中5 不在圆上：禽恒随芮，芮宫（圆上坤2 位）双星双干，中5 寄干居前
    const stars = home === 2 ? ["天芮", "天禽"] : [STAR_BY_PALACE[home]];
    const carried =
      home === 2 ? [earth.get(5) as string, earth.get(2) as string] : [earth.get(home) as string];
    cell.starNames.push(...stars);
    cell.heavenStems.push(...carried);
    out.set(dest, cell);
  }
  return out;
}

function emptyCell(palace: PalaceId, earth: Map<number, string>): PalaceCell {
  return {
    palace,
    name: PALACE_NAMES[palace],
    god: null,
    starNames: [],
    heavenStems: [],
    door: null,
    earthStems: palace === 2 ? [earth.get(5) as string, earth.get(2) as string] : [earth.get(palace) as string],
  };
}

export function computeQimen(m: ChartMoment): QimenChart {
  const jieqi = m.prevJieqi.name;
  const juRow = JIEQI_JU[jieqi];
  if (juRow === undefined) throw new Error(`unknown jieqi: ${jieqi}`);

  const yang = dunOfJieqi(jieqi) === "yang";
  const { fuTou, yuan } = fuTouAndYuan(m.dayGanZhi);
  const ju = juRow[YUAN_INDEX.indexOf(yuan)];

  const { palaceOfStem, earth } = buildEarthBoard(ju, yang);
  const { xunShou, yi, ordinal } = hourXun(m.timeGanZhi);

  // 旬首仪落地盘之宫 = 值符星本宫、值使门本宫（本宫为中5时：值符天禽、值使死门，皆寄坤2）
  const originPalace = palaceOfStem.get(yi) as PalaceId;
  const zhifuStar = STAR_BY_PALACE[originPalace];
  const zhishiDoor = DOOR_BY_PALACE[originPalace];

  // 值符星落宫：时干之地盘宫（时干甲遁旬首仪之宫）
  const hourStem = m.timeGanZhi[0];
  const hourTarget = hourStem === "甲" ? originPalace : (palaceOfStem.get(hourStem) as number);

  // 值使门落宫：自本宫（按洛书本数起算，本宫为中5时从5起）历洛书数行 ordinal 步，5 寄坤2 显示
  const doorStep = yang ? 1 : -1;
  let doorPalace: number = originPalace;
  for (let i = 0; i < ordinal; i++) doorPalace = flyLuoshu(doorPalace, doorStep);
  doorPalace = borrow2(doorPalace);

  const board = buildHeavenBoard(earth, originPalace, hourTarget);

  // 八门：值使门落宫，余门在八宫圆上刚性随转（与值使门同位移）
  const doorShift = circleIndexOf(doorPalace as PalaceId) - circleIndexOf(borrow2(originPalace));
  for (let k = 0; k < PALACE_CIRCLE.length; k++) {
    const home = PALACE_CIRCLE[k];
    const dest = PALACE_CIRCLE[(((k + doorShift) % 8) + 8) % 8];
    board.get(dest)!.door = DOOR_BY_PALACE[home];
  }

  // 八神：自值符星新落之宫起，阳遁顺行、阴遁逆行八宫圆
  const godShift = circleIndexOf(borrow2(hourTarget) as PalaceId);
  for (let i = 0; i < GODS_ORDER.length; i++) {
    const palace = PALACE_CIRCLE[(((godShift + (yang ? i : -i)) % 8) + 8) % 8];
    board.get(palace)!.god = GODS_ORDER[i];
  }

  // 中5 宫无门无神，天盘干随禽芮迁出；地盘干仍显示
  const center = emptyCell(5, earth);
  board.set(5, center);

  return {
    yang,
    ju,
    jieqi,
    jieqiSolarDate: m.prevJieqi.date,
    fuTou,
    yuan,
    xunShou,
    xunShouYi: yi,
    hourOrdinal: ordinal,
    zhifuStar,
    zhifuPalace: borrow2(hourTarget),
    zhishiDoor,
    zhishiPalace: doorPalace as PalaceId,
    pillars: {
      year: m.yearGanZhi,
      month: m.monthGanZhi,
      day: m.dayGanZhi,
      time: m.timeGanZhi,
    },
    palaces: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((p) => board.get(p) ?? emptyCell(p as PalaceId, earth)),
  };
}

export { formatText } from "./format";
export * from "./types";
