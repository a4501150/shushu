/**
 * 旺衰 (yao strength) layer — 增删卜易-style, deterministic, facts-only.
 * No 断语 prose: interpretation is deferred downstream (LLM).
 *
 * Consumes a frozen PanResult and produces a SEPARATE analysis. The frozen
 * yaoAnnotations / dongBianAnnotations maps are read but never modified;
 * upgrade labels (暗动/日破/冲起/冲散/合绊) live in their own per-yao list.
 */
import { isChong, isHe } from "./dizhi";
import { format } from "./format";
import { ANN } from "./panel";
import type { SixRelation } from "./sixrelation";
import type { FuShenRelationship, PanResult } from "./types";
import { BRANCH_WU_XING, YAO_NAMES } from "./tables";
import { controls, generates, type WuXing } from "./wuxing";

export type MonthGrade = "旺" | "相" | "休" | "囚" | "死";

/** Three-level composite verdict per spec: 旺(得令) / 中和(失令但得势) / 衰(失令失势). */
export type Strength = "旺" | "中和" | "衰";

/** Factual day-branch (日辰) effects on one yao. */
export interface DayFacts {
  /** 日生该爻 (day wuxing generates yao wuxing). */
  sheng: boolean;
  /** 日克该爻. */
  ke: boolean;
  /** 日扶: same wuxing. */
  fu: boolean;
  chong: boolean;
  he: boolean;
}

export interface YaoStrength {
  position: number;
  /** 月建 grading by yao wuxing vs month-branch wuxing. */
  grade: MonthGrade;
  /** grade ∈ {旺, 相}. */
  deLing: boolean;
  /** (#生我的动爻 + 日辰生扶 + 变爻回头生) > (#克我的动爻 + 日辰克 + 变爻回头克). */
  deShi: boolean;
  strength: Strength;
  /** 旬空 flag (from PanResult.xunKong). */
  isKong: boolean;
  day: DayFacts;
  /** Positions of 动爻 that 生 this yao, e.g. 得生自[2,5]. Sorted asc, deduped. */
  shengFrom: readonly number[];
  /** Positions of 动爻 that 克 this yao, e.g. 受克自[3]. */
  keFrom: readonly number[];
  /** 变爻 acts on its own 动爻 only; reused from frozen "化回头生" label. */
  huiTouSheng: boolean;
  /** Reused from frozen "化回头克" label. */
  huiTouKe: boolean;
  /**
   * Upgrade annotations from this layer, separate from the frozen ones:
   * 暗动/日破 (静爻受日冲), 冲起/冲散 (动爻受日冲), 合绊 (静爻受日合).
   */
  extra: readonly string[];
}

export interface FuShenStrength {
  /** Position of the flying yao (飞爻). */
  position: number;
  heavenlyStem: string;
  earthlyBranch: string;
  wuXing: WuXing;
  liuQin: SixRelation;
  /** Copied from the frozen FuShenInfo.relationship. */
  relationship: FuShenRelationship;
  /** 飞生伏 → 伏神得生. */
  deSheng: boolean;
  /** 飞克伏 → 伏神受克. */
  shouKe: boolean;
  /** 飞克伏 → 压伏 note. */
  yaFu: boolean;
  /** 月建 grading of the 伏神's own wuxing (伏神亦论旺衰, 增删卜易·飞伏章). */
  grade: MonthGrade;
  /** 日辰 effects on the 伏神 itself. */
  day: DayFacts;
  /** 伏神得动爻生（有用六条之四）— positions of the 动爻, sorted asc. */
  deDongSheng: readonly number[];
  /** 飞神旬空 → 伏易出 (飞空而伏, 出露不难). */
  feiKong: boolean;
  /** 飞神月破（月建冲飞支）→ 伏易出 (飞临破亦出). */
  feiPo: boolean;
  /** 日辰冲飞神 → 伏易出 (冲开飞神, 伏得出). */
  feiChong: boolean;
}

export interface WangShuaiResult {
  /** One entry per 本卦 yao, ordered as benGuaYaos (positions 1..6). */
  yaos: readonly YaoStrength[];
  fuShen: readonly FuShenStrength[];
}

/** Thrown when the chart carries no 日辰/月建 — such a chart has no 旺衰. */
export class MissingDayMonthError extends Error {
  constructor(message = "旺衰分析需要日辰与月建 (chart has no day/month)") {
    super(message);
    this.name = "MissingDayMonthError";
  }
}

/**
 * 月建 grading with the month branch as the dominant 令:
 * 当令者旺, 令生者相, 生令者休, 克令者囚, 令克者死.
 * (i.e. 爻克月=囚, 月克爻=死 — the classical 旺相休囚死 table with 月建 as
 * "令", e.g. spring: 金囚, 土死.)
 */
export function monthGrade(yaoWx: WuXing, monthWx: WuXing): MonthGrade {
  if (yaoWx === monthWx) return "旺";
  if (generates(monthWx, yaoWx)) return "相";
  if (generates(yaoWx, monthWx)) return "休";
  if (controls(yaoWx, monthWx)) return "囚";
  return "死";
}

export function analyzeStrength(r: PanResult): WangShuaiResult {
  const month = r.monthBranch;
  const day = r.dayBranch;
  if (month == null || day == null) throw new MissingDayMonthError();
  const mWx = BRANCH_WU_XING.get(month);
  const dWx = BRANCH_WU_XING.get(day);
  if (mWx == null || dWx == null) {
    throw new MissingDayMonthError(`无法识别的日/月地支: ${day}/${month}`);
  }

  interface Builder {
    position: number;
    isDong: boolean;
    branch: string;
    wx: WuXing;
    grade: MonthGrade;
    day: DayFacts;
    shengFrom: number[];
    keFrom: number[];
  }

  const dayFacts = (wx: WuXing, branch: string): DayFacts => ({
    sheng: generates(dWx, wx),
    ke: controls(dWx, wx),
    fu: dWx === wx,
    chong: isChong(day, branch),
    he: isHe(day, branch),
  });

  const builders: Builder[] = r.benGuaYaos.map((y) => ({
    position: y.position,
    isDong: y.isDong,
    branch: y.earthlyBranch,
    wx: y.wuXing,
    grade: monthGrade(y.wuXing, mWx),
    day: dayFacts(y.wuXing, y.earthlyBranch),
    shengFrom: [],
    keFrom: [],
  }));

  // 动爻 acts once as actor on every OTHER yao (生 or 克 by wuxing; 比和/泄/耗
  // are no-ops per spec). Static yaos only receive.
  for (const actor of builders) {
    if (!actor.isDong) continue;
    for (const target of builders) {
      if (target === actor) continue;
      if (generates(actor.wx, target.wx)) {
        target.shengFrom.push(actor.position);
      } else if (controls(actor.wx, target.wx)) {
        target.keFrom.push(actor.position);
      }
    }
  }

  // 变爻 acts on its own 动爻 only. 回头生克 is already derived by the frozen
  // base layer — reuse its ANN labels rather than re-deriving.
  const huiTou = new Map<number, { sheng: boolean; ke: boolean }>();
  for (const b of builders) {
    if (!b.isDong) continue;
    const dba = r.dongBianAnnotations.get(b.position) ?? [];
    huiTou.set(b.position, {
      sheng: dba.includes(ANN.huiTouSheng),
      ke: dba.includes(ANN.huiTouKe),
    });
  }

  const yaos: YaoStrength[] = builders.map((b) => {
    const shengFrom = dedupeSorted(b.shengFrom);
    const keFrom = dedupeSorted(b.keFrom);
    const ht = huiTou.get(b.position) ?? { sheng: false, ke: false };

    const deLing = b.grade === "旺" || b.grade === "相";
    // 生扶之力 = 动爻生 + 日辰生扶 + 变爻回头生; 克伤之力 = 动爻克 + 日辰克 + 回头克.
    // 回头生/克 is one force everywhere: it feeds 得势 and the 冲散/日破 rescues alike,
    // so a 回头生爻 can never be printed as 衰 while its 变爻 is called 回头生.
    const shengScore = shengFrom.length + (ht.sheng ? 1 : 0) + (b.day.sheng || b.day.fu ? 1 : 0);
    const keScore = keFrom.length + (ht.ke ? 1 : 0) + (b.day.ke ? 1 : 0);
    const deShi = shengScore > keScore;
    const strength: Strength = deLing ? "旺" : deShi ? "中和" : "衰";

    const extra: string[] = [];
    if (b.day.chong) {
      if (b.isDong) {
        if (deLing) {
          extra.push("冲起");
        } else if (shengScore === 0) {
          // 休囚死且无一生扶（动爻生、日辰生扶、回头生都已计入 shengScore）.
          extra.push("冲散");
        }
      } else {
        // 静爻受日冲: 旺相为暗动; 休囚而得动爻生、日辰生扶（日不克）者亦暗动
        // —— 增删卜易有休囚静爻得生扶而从暗动之例（坤之师丑土静爻）; 克处逢生仍作日破.
        // （其书乾按另有"休囚之爻无暗动"从严一说，此处从本书正文之例。）
        extra.push(deLing || (shengScore > 0 && !b.day.ke) ? "暗动" : "日破");
      }
    }
    if (b.day.he && !b.isDong) {
      // 静爻受日合且无动爻冲其合支(=该日支)/该爻 → 合绊.
      // https://baike.baidu.com/item/合绊
      const released = builders.some(
        (t) =>
          t.isDong &&
          (isChong(t.branch, day) || isChong(t.branch, b.branch)),
      );
      if (!released) extra.push("合绊");
    }

    return {
      position: b.position,
      grade: b.grade,
      deLing,
      deShi,
      strength,
      isKong: r.xunKong.includes(b.branch),
      day: b.day,
      shengFrom,
      keFrom,
      huiTouSheng: ht.sheng,
      huiTouKe: ht.ke,
      extra,
    };
  });

  const fuShen: FuShenStrength[] = r.fuShen.map((fs) => {
    const fei = r.benGuaYaos.find((y) => y.position === fs.position);
    const deDongSheng: number[] = [];
    for (const y of r.benGuaYaos) {
      if (y.isDong && y.position !== fs.position && generates(y.wuXing, fs.wuXing)) {
        deDongSheng.push(y.position);
      }
    }
    return {
      position: fs.position,
      heavenlyStem: fs.heavenlyStem,
      earthlyBranch: fs.earthlyBranch,
      wuXing: fs.wuXing,
      liuQin: fs.liuQin,
      relationship: fs.relationship,
      deSheng: fs.relationship === "飞生伏",
      shouKe: fs.relationship === "飞克伏",
      yaFu: fs.relationship === "飞克伏",
      grade: monthGrade(fs.wuXing, mWx),
      day: dayFacts(fs.wuXing, fs.earthlyBranch),
      deDongSheng: dedupeSorted(deDongSheng),
      feiKong: fei != null && r.xunKong.includes(fei.earthlyBranch),
      feiPo: fei != null && isChong(month, fei.earthlyBranch),
      feiChong: fei != null && isChong(day, fei.earthlyBranch),
    };
  });

  return { yaos, fuShen };
}

/** Plain-text 旺衰 block, appended AFTER the main board in the LLM prompt. */
export function formatWangShuai(
  r: PanResult,
  ws: WangShuaiResult,
): string {
  if (r.monthBranch == null || r.dayBranch == null) {
    throw new MissingDayMonthError();
  }
  const mWx = BRANCH_WU_XING.get(r.monthBranch)!;
  const dWx = BRANCH_WU_XING.get(r.dayBranch)!;

  const byPos = new Map<number, YaoStrength>();
  for (const s of ws.yaos) byPos.set(s.position, s);

  let sb = `旺衰分析（月建${r.monthBranch}${mWx} 日辰${r.dayGan}${r.dayBranch}${dWx}）\n`;

  // yaos top-to-bottom, matching format.ts
  for (let i = 5; i >= 0; i--) {
    const y = r.benGuaYaos[i];
    const s = byPos.get(y.position)!;
    const parts: string[] = [`月建 ${s.grade}`];

    const dayEff = dayEffectLabels(s.day);
    if (dayEff.length > 0) parts.push(`日辰 ${dayEff.join("/")}`);

    if (s.shengFrom.length > 0) parts.push(`得生[${s.shengFrom.join(",")}]`);
    if (s.keFrom.length > 0) parts.push(`受克[${s.keFrom.join(",")}]`);
    if (s.huiTouSheng) parts.push("变爻回头生");
    if (s.huiTouKe) parts.push("变爻回头克");
    if (s.extra.length > 0) parts.push(s.extra.join(" "));
    if (s.isKong) parts.push("空");
    parts.push(s.strength);

    sb += `${YAO_NAMES[y.position - 1]} ${y.heavenlyStem}${y.earthlyBranch}${y.wuXing} ${y.liuQin}: ${parts.join("; ")}\n`;
  }

  for (const fs of ws.fuShen) {
    // 增删卜易·飞伏章: 伏神亦论日月旺衰; 飞空、日冲飞皆伏易出, 日克伏难出.
    const parts: string[] = [`月建 ${fs.grade}`];
    const dayEff = dayEffectLabels(fs.day);
    if (dayEff.length > 0) parts.push(`日辰 ${dayEff.join("/")}`);
    parts.push(fs.relationship);
    if (fs.deSheng) parts.push("得生于飞神");
    if (fs.shouKe) parts.push("受克于飞神");
    if (fs.yaFu) parts.push("压伏");
    if (fs.deDongSheng.length > 0) parts.push(`得动爻生[${fs.deDongSheng.join(",")}]`);
    if (fs.feiKong) parts.push("飞神空，伏易出");
    if (fs.feiPo) parts.push("飞神月破，伏易出");
    if (fs.feiChong) parts.push("日辰冲飞，伏易出");
    sb += `伏 ${fs.liuQin} ${fs.heavenlyStem}${fs.earthlyBranch}${fs.wuXing} 飞于${YAO_NAMES[fs.position - 1]}: ${parts.join("; ")}\n`;
  }

  // 用神候选: position + 六亲 for every yao, so the LLM picks 用神 itself.
  const candidates = [...r.benGuaYaos]
    .sort((a, b) => b.position - a.position)
    .map((y) => `${YAO_NAMES[y.position - 1]}${y.liuQin}`)
    .join("、");
  sb += `用神候选: ${candidates}\n`;

  return sb;
}

/** Single entry point for UI boardText: format() + optional 旺衰 block. */
export function fullLiuyaoBoard(
  r: PanResult,
  ws?: WangShuaiResult | null,
): string {
  if (ws == null) return format(r);
  return `${format(upgradeAnnotations(r, ws))}\n${formatWangShuai(r, ws)}`;
}

/**
 * 静态层（Java 移植，golden 冻结）把静爻受日冲一律标 暗动、动爻受日冲标 日冲、
 * 静爻受日合标 日合、月冲之爻一律标 月破；旺衰层按 增删卜易 重判为 暗动/日破、
 * 冲起/冲散、合绊、月破（有解）。合并盘面时用重判替换，
 * 备注列与旺衰分析不能互相矛盾。
 */
function upgradeAnnotations(r: PanResult, ws: WangShuaiResult): PanResult {
  const ann = new Map<number, readonly string[]>(r.yaoAnnotations);
  const dongAt = new Map(r.benGuaYaos.map((y) => [y.position, y.isDong]));
  for (const s of ws.yaos) {
    const labels = ann.get(s.position);
    if (!labels) continue;
    let next = labels;
    if (labels.includes("暗动")) {
      const v = s.extra.find((x) => x === "暗动" || x === "日破");
      if (v) next = next.map((x) => (x === "暗动" ? v : x));
    }
    if (labels.includes("日冲")) {
      const v = s.extra.find((x) => x === "冲起" || x === "冲散");
      if (v) next = next.map((x) => (x === "日冲" ? v : x));
    }
    if (labels.includes("日合") && s.extra.includes("合绊")) {
      next = next.map((x) => (x === "日合" ? "合绊" : x));
    }
    if (labels.includes("月破")) {
      // 增删卜易·月破章: 破爻得日辰生扶合、爻自发动、或受动爻生者，皆不作破论.
      const rescued =
        Boolean(dongAt.get(s.position)) ||
        s.day.sheng || s.day.fu || s.day.he ||
        s.shengFrom.length > 0 || s.huiTouSheng;
      if (rescued) next = next.map((x) => (x === "月破" ? "月破（有解）" : x));
    }
    if (next !== labels) ann.set(s.position, next);
  }
  return { ...r, yaoAnnotations: ann };
}

// ---- helpers ----

function dayEffectLabels(d: DayFacts): string[] {
  return [
    [d.sheng, "生"],
    [d.ke, "克"],
    [d.fu, "扶"],
    [d.chong, "冲"],
    [d.he, "合"],
  ]
    .filter(([on]) => on)
    .map(([, label]) => label as string);
}

function dedupeSorted(xs: readonly number[]): number[] {
  return [...new Set(xs)].sort((a, b) => a - b);
}
