/** 排盘结果类型. Port of YaoInfo.java, PanResult.java, FuShenInfo.java. */
import type { SixRelation } from "./sixrelation";
import type { SixSpirit } from "./sixspirit";
import type { Trigram } from "./tables";
import type { WuXing } from "./wuxing";

export interface YaoInfo {
  /** 1-based yao position, bottom to top. */
  position: number;
  sum: number;
  heavenlyStem: string;
  earthlyBranch: string;
  wuXing: WuXing;
  liuQin: SixRelation;
  liuShen: SixSpirit;
  isShiYao: boolean;
  isYingYao: boolean;
  isDong: boolean;
}

/** 飞伏关系. */
export type FuShenRelationship = "比和" | "伏生飞" | "飞生伏" | "飞克伏" | "伏克飞";

export interface FuShenInfo {
  /** Position of the flying yao (飞爻) the hidden yao sits under, 1-based. */
  position: number;
  heavenlyStem: string;
  earthlyBranch: string;
  wuXing: WuXing;
  liuQin: SixRelation;
  relationship: FuShenRelationship;
}

export interface PanResult {
  benGuaName: string;
  bianGuaName: string | null;
  palace: Trigram;
  palaceIndex: number;
  shiPosition: number;
  yingPosition: number;
  benGuaYaos: readonly YaoInfo[];
  bianGuaYaos: readonly YaoInfo[] | null;
  xunName: string | null;
  xunKong: readonly string[];
  fuShen: readonly FuShenInfo[];
  dayGan: string;
  dayBranch: string | null;
  monthBranch: string | null;
  yaoAnnotations: ReadonlyMap<number, readonly string[]>;
  dongBianAnnotations: ReadonlyMap<number, readonly string[]>;
}
