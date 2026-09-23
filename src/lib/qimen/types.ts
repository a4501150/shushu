/** 时家奇门遁甲（拆补法）盘面类型。 */

export type Dun = "yang" | "yin";

export type Yuan = "上元" | "中元" | "下元";

export type PalaceId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** 单宫状态（天盘/门/神/地盘）。 */
export interface PalaceCell {
  /** 洛书宫数 */
  palace: PalaceId;
  /** 宫名，如 巽四宫 */
  name: string;
  /** 八神（中五宫无） */
  god: string | null;
  /** 天盘九星；天芮所落之宫同时带天禽（双星）；中五宫为空（禽随芮迁转） */
  starNames: string[];
  /** 天盘所携之干（各星所本宫之地盘干）；芮禽双宫时 [中5干, 坤2干]——依《元灵经》今传排盘写法，中5寄干居前 */
  heavenStems: string[];
  /** 八门（中五宫无门） */
  door: string | null;
  /** 地盘干；坤2 兼载中5寄宫之干，写法 [中5干, 坤2本干] */
  earthStems: string[];
}

export interface QimenPillars {
  year: string;
  month: string;
  day: string;
  time: string;
}

export interface QimenChart {
  /** 阳遁 true / 阴遁 false */
  yang: boolean;
  /** 局数 1..9 */
  ju: number;
  /** 当值节气 */
  jieqi: string;
  /** 节气交节日 */
  jieqiSolarDate: string;
  /** 符头（当日或之前最近的甲/己日）干支 */
  fuTou: string;
  yuan: Yuan;
  /** 时旬首，如 甲午 */
  xunShou: string;
  /** 旬首遁藏之仪，如 甲午→辛 */
  xunShouYi: string;
  /** 时刻在其旬内的序号（旬首=0） */
  hourOrdinal: number;
  /** 值符星，如 天英 */
  zhifuStar: string;
  /** 值符星迁转后所落之宫 */
  zhifuPalace: PalaceId;
  /** 值使门，如 景门 */
  zhishiDoor: string;
  /** 值使门所落之宫（值使行历中5者寄坤2显示） */
  zhishiPalace: PalaceId;
  pillars: QimenPillars;
  /** 九宫（按洛书数升序 1..9） */
  palaces: PalaceCell[];
}
