/** 纳甲排盘计算. Port of PaiPan.java (compute and private helpers). */
import {
  isChong,
  isHe,
  isJinShen,
  isJue,
  isMu,
  isTuiShen,
  xunKong as computeXunKong,
  xunName as computeXunName,
} from "./dizhi";
import { computeSixRelation, SIX_RELATIONS, type SixRelation } from "./sixrelation";
import { spiritAtYao, startSpiritFor } from "./sixspirit";
import {
  BRANCH_WU_XING,
  GUA64,
  HEXAGRAM_PALACE,
  INNER_NA_JIA,
  OUTER_NA_JIA,
  SHI_YING,
  trigramFromBits,
  TRIGRAMS,
} from "./tables";
import type { FuShenInfo, FuShenRelationship, PanResult, YaoInfo } from "./types";
import { controls, generates, type WuXing } from "./wuxing";

export function compute(
  sixSums: readonly number[],
  dayGan: string,
  dayBranch?: string | null,
  monthBranch?: string | null,
): PanResult {
  const benKey = reversedKey(sixSums);
  const benGuaName = GUA64.get(benKey)!;

  const bianSums = computeBianSums(sixSums);
  const bianKey = reversedKey(bianSums);
  const hasChange = benKey !== bianKey;
  const bianGuaName = hasChange ? GUA64.get(bianKey)! : null;

  const pe = HEXAGRAM_PALACE.get(benKey)!;
  const palace = pe.palace;
  const [shi, ying] = SHI_YING[pe.index];

  const innerBen = trigramFromBits(benKey.substring(3, 6));
  const outerBen = trigramFromBits(benKey.substring(0, 3));
  const innerNaJia = INNER_NA_JIA.get(innerBen)!;
  const outerNaJia = OUTER_NA_JIA.get(outerBen)!;

  const startSpirit = startSpiritFor(dayGan);
  const palaceWx = TRIGRAMS[palace].wuXing;

  const benYaos: YaoInfo[] = [];
  for (let pos = 1; pos <= 6; pos++) {
    const sum = sixSums[pos - 1];
    const naJia = pos <= 3 ? innerNaJia : outerNaJia;
    const offset = pos <= 3 ? pos - 1 : pos - 4;
    const stem = naJia.stem;
    const branch = naJia.branches[offset];
    const wx = BRANCH_WU_XING.get(branch)!;
    benYaos.push({
      position: pos,
      sum,
      heavenlyStem: stem,
      earthlyBranch: branch,
      wuXing: wx,
      liuQin: computeSixRelation(palaceWx, wx),
      liuShen: spiritAtYao(startSpirit, pos),
      isShiYao: pos === shi,
      isYingYao: pos === ying,
      isDong: sum === 6 || sum === 9,
    });
  }

  let bianYaos: YaoInfo[] | null = null;
  if (hasChange) {
    const innerBian = trigramFromBits(bianKey.substring(3, 6));
    const outerBian = trigramFromBits(bianKey.substring(0, 3));
    const innerBianNaJia = INNER_NA_JIA.get(innerBian)!;
    const outerBianNaJia = OUTER_NA_JIA.get(outerBian)!;
    bianYaos = [];
    for (let pos = 1; pos <= 6; pos++) {
      const sum = bianSums[pos - 1];
      const naJia = pos <= 3 ? innerBianNaJia : outerBianNaJia;
      const offset = pos <= 3 ? pos - 1 : pos - 4;
      const stem = naJia.stem;
      const branch = naJia.branches[offset];
      const wx = BRANCH_WU_XING.get(branch)!;
      bianYaos.push({
        position: pos,
        sum,
        heavenlyStem: stem,
        earthlyBranch: branch,
        wuXing: wx,
        liuQin: computeSixRelation(palaceWx, wx),
        liuShen: spiritAtYao(startSpirit, pos),
        isShiYao: false,
        isYingYao: false,
        isDong: false,
      });
    }
  }

  // --- xunKong ---
  let xunKong: string[];
  let xunName: string | null;
  if (dayBranch != null) {
    xunKong = computeXunKong(dayGan, dayBranch);
    xunName = computeXunName(dayGan, dayBranch);
  } else {
    xunKong = [];
    xunName = null;
  }

  // --- fuShen ---
  const fuShenList = computeFuShen(palace, benYaos);

  // --- yaoAnnotations (day/month effects + xunKong) ---
  const yaoAnnotations = new Map<number, string[]>();
  for (const y of benYaos) {
    const ann: string[] = [];

    if (monthBranch != null) {
      if (isChong(monthBranch, y.earthlyBranch)) ann.push("月破");
      if (isHe(monthBranch, y.earthlyBranch)) ann.push("月合");
    }
    if (dayBranch != null) {
      if (isChong(dayBranch, y.earthlyBranch)) {
        ann.push(y.isDong ? "日冲" : "暗动");
      }
      if (isHe(dayBranch, y.earthlyBranch)) ann.push("日合");
    }
    if (xunKong.length > 0 && xunKong.includes(y.earthlyBranch)) {
      ann.push("空");
    }
    if (ann.length > 0) yaoAnnotations.set(y.position, ann);
  }

  // --- dongBianAnnotations ---
  const dongBianAnnotations = new Map<number, string[]>();
  if (hasChange && bianYaos != null) {
    for (let i = 0; i < 6; i++) {
      const dy = benYaos[i];
      if (!dy.isDong) continue;
      const by = bianYaos[i];
      const ann = computeDongBianAnnotations(dy, by, xunKong);
      if (ann.length > 0) dongBianAnnotations.set(dy.position, ann);
    }
  }

  return {
    benGuaName,
    bianGuaName,
    palace,
    palaceIndex: pe.index,
    shiPosition: shi,
    yingPosition: ying,
    benGuaYaos: benYaos,
    bianGuaYaos: bianYaos,
    xunName,
    xunKong,
    fuShen: fuShenList,
    dayGan,
    dayBranch: dayBranch ?? null,
    monthBranch: monthBranch ?? null,
    yaoAnnotations,
    dongBianAnnotations,
  };
}

// ---- fuShen computation ----

function computeFuShen(
  palace: keyof typeof TRIGRAMS,
  benYaos: readonly YaoInfo[],
): FuShenInfo[] {
  const present = new Set<SixRelation>();
  for (const y of benYaos) present.add(y.liuQin);

  const result: FuShenInfo[] = [];
  for (const rel of SIX_RELATIONS) {
    if (present.has(rel)) continue;

    const pureInner = INNER_NA_JIA.get(palace)!;
    const pureOuter = OUTER_NA_JIA.get(palace)!;

    for (let pos = 1; pos <= 6; pos++) {
      const naJia = pos <= 3 ? pureInner : pureOuter;
      const offset = pos <= 3 ? pos - 1 : pos - 4;
      const branch = naJia.branches[offset];
      const wx = BRANCH_WU_XING.get(branch)!;
      const pureRel = computeSixRelation(TRIGRAMS[palace].wuXing, wx);
      if (pureRel === rel) {
        const flyYao = benYaos[pos - 1];
        const relationship = flyHideRelationship(flyYao.wuXing, wx);
        result.push({
          position: pos,
          heavenlyStem: naJia.stem,
          earthlyBranch: branch,
          wuXing: wx,
          liuQin: rel,
          relationship,
        });
        break;
      }
    }
  }
  return result;
}

/**
 * 动变 annotation labels. The wang-shuai layer matches these by constant,
 * not by re-typing the strings.
 */
export const ANN = { huiTouSheng: "化回头生", huiTouKe: "化回头克" } as const;

function flyHideRelationship(fly: WuXing, hide: WuXing): FuShenRelationship {
  if (fly === hide) return "比和";
  if (generates(hide, fly)) return "伏生飞";
  if (generates(fly, hide)) return "飞生伏";
  if (controls(fly, hide)) return "飞克伏";
  return "伏克飞";
}

// ---- dong-bian annotation computation ----

function computeDongBianAnnotations(
  dong: YaoInfo,
  bian: YaoInfo,
  xunKong: readonly string[],
): string[] {
  const ann: string[] = [];
  const dBranch = dong.earthlyBranch;
  const bBranch = bian.earthlyBranch;
  const dWx = dong.wuXing;
  const bWx = bian.wuXing;

  if (isJinShen(dBranch, bBranch)) ann.push("化进神");
  else if (isTuiShen(dBranch, bBranch)) ann.push("化退神");

  if (generates(bWx, dWx)) ann.push(ANN.huiTouSheng);
  else if (controls(bWx, dWx)) ann.push(ANN.huiTouKe);

  if (xunKong.length > 0 && xunKong.includes(bBranch)) ann.push("化空");
  if (isMu(dWx, bBranch)) ann.push("化墓");
  if (isJue(dWx, bBranch)) ann.push("化绝");

  return ann;
}

// ---- helpers ----

function reversedKey(sums: readonly number[]): string {
  return sums.map((s) => (s === 7 || s === 9 ? "1" : "0")).reverse().join("");
}

function computeBianSums(sums: readonly number[]): number[] {
  return sums.map((s) => (s === 9 ? 8 : s === 6 ? 7 : s));
}
