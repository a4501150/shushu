import { astro } from "iztro";
import type { ChartMoment } from "@/lib/calendar";
import { qianKun, type Gender } from "@/lib/bazi";
import { pad } from "@/lib/textwidth";

// 紫微斗数 via iztro (battle-tested open-source 紫微 engine — same strategy
// as the 八字 engine wrapping lunar-javascript). iztro's tables follow the
// 通行本 (壬干四化 梁紫左武); the 全书 variant 梁紫府武 exists.
// fixLeap=true (iztro): a leap month is split at day 15 — 上半月（≤15日）按本
// 月、下半月按下月安宫，即通行"闰月半前作上半、半后作下半"惯例（源自《全书》
// "闰月正月生者要在二月内起安身命"的按月减半说法）；iztro 实现为 闰月且日>15 进一月，
// 唯 timeIndex=12（早子时）生人不进月（iztro utils needToAdd 条件）。

export interface ZiweiStar {
  name: string;
  type: string;
  brightness?: string;
  /** set on the 4 stars touched by birth-year 四化: 禄/权/科/忌 */
  mutagen?: string;
}

export interface ZiweiPalace {
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  isBodyPalace: boolean;
  majorStars: ZiweiStar[];
  minorStars: ZiweiStar[];
  adjectiveStars: string[];
  /** 大限 age range, e.g. [24, 33] */
  decadalRange?: [number, number];
}

export interface ZiweiResult {
  palaces: ZiweiPalace[]; // fixed order 寅→丑
  fiveElementsClass: string;
  soulStar: string; // 命主
  bodyStar: string; // 身主
  soulPalaceBranch: string;
  bodyPalaceBranch: string;
  lunarDate: string;
  chineseDate: string; // 四柱
  timeRange: string;
  gender: Gender;
}

/** iztro timeIndex: 0 = 00:00-00:59, 1..11 = 丑..亥, 12 = 23:00-23:59 (夜子归次日子时). */
export function timeIndexOf(m: ChartMoment): number {
  if (m.solar.hour < 1) return 0;
  if (m.solar.hour >= 23) return 12;
  return m.shiChenIndex;
}

export function computeZiwei(m: ChartMoment, gender: Gender): ZiweiResult {
  const a = astro.bySolar(
    `${m.solar.year}-${m.solar.month}-${m.solar.day}`,
    timeIndexOf(m),
    gender === "male" ? "男" : "女",
    true,
    "zh-CN"
  );
  return {
    palaces: a.palaces.map((p) => ({
      name: p.name,
      heavenlyStem: p.heavenlyStem,
      earthlyBranch: p.earthlyBranch,
      isBodyPalace: p.isBodyPalace,
      majorStars: p.majorStars.map((s) => ({
        name: s.name,
        type: s.type,
        brightness: s.brightness,
        mutagen: s.mutagen,
      })),
      minorStars: p.minorStars.map((s) => ({
        name: s.name,
        type: s.type,
        brightness: s.brightness,
        mutagen: s.mutagen,
      })),
      adjectiveStars: p.adjectiveStars.map((s) => s.name),
      decadalRange: p.decadal ? [p.decadal.range[0], p.decadal.range[1]] : undefined,
    })),
    fiveElementsClass: a.fiveElementsClass,
    soulStar: a.soul,
    bodyStar: a.body,
    soulPalaceBranch: a.earthlyBranchOfSoulPalace,
    bodyPalaceBranch: a.earthlyBranchOfBodyPalace,
    lunarDate: a.lunarDate,
    chineseDate: a.chineseDate,
    timeRange: a.timeRange,
    gender,
  };
}

function starText(s: ZiweiStar): string {
  const bright = s.brightness ? `(${s.brightness})` : "";
  const hua = s.mutagen ? `(化${s.mutagen})` : "";
  return `${s.name}${bright}${hua}`;
}

export function formatText(r: ZiweiResult): string {
  const lines: string[] = [];
  lines.push(`${qianKun(r.gender)} ${r.chineseDate}（${r.lunarDate} ${r.timeRange}）`);
  lines.push(
    `${r.fiveElementsClass} 命主${r.soulStar} 身主${r.bodyStar} ` +
      `命宫${r.soulPalaceBranch} 身宫${r.bodyPalaceBranch}`
  );
  lines.push("");
  for (const p of r.palaces) {
    const marks = [p.name === "命宫" ? "命" : "", p.isBodyPalace ? "身" : ""]
      .filter(Boolean)
      .join("");
    const head = `${p.heavenlyStem}${p.earthlyBranch} ${p.name}${marks ? `(${marks}宫)` : ""}`;
    const majors = p.majorStars.map(starText).join(" ") || "空宫";
    const minors = p.minorStars.map(starText).join(" ");
    const dasian = p.decadalRange ? ` 大限${p.decadalRange[0]}-${p.decadalRange[1]}` : "";
    lines.push([pad(head, 16), majors, minors, dasian].filter(Boolean).join("  "));
  }
  return lines.join("\n");
}
