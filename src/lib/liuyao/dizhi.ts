/** 天干地支关系表. Port of DiZhi.java. */
import type { WuXing } from "./wuxing";
import { GAN, ZHI } from "../ganzhi";

const LIU_CHONG: ReadonlyMap<string, string> = new Map([
  ["子", "午"],
  ["午", "子"],
  ["丑", "未"],
  ["未", "丑"],
  ["寅", "申"],
  ["申", "寅"],
  ["卯", "酉"],
  ["酉", "卯"],
  ["辰", "戌"],
  ["戌", "辰"],
  ["巳", "亥"],
  ["亥", "巳"],
]);

const LIU_HE: ReadonlyMap<string, string> = new Map([
  ["子", "丑"],
  ["丑", "子"],
  ["寅", "亥"],
  ["亥", "寅"],
  ["卯", "戌"],
  ["戌", "卯"],
  ["辰", "酉"],
  ["酉", "辰"],
  ["巳", "申"],
  ["申", "巳"],
  ["午", "未"],
  ["未", "午"],
]);

// 化进神/退神 per 增删卜易·进退神章: 亥化子/寅化卯/巳化午/申化酉/丑化辰/辰化未/未化戌/戌化丑.
// (土_pair 戌→丑 was in the source all along; the Java reference omitted it — corrected here.)
const JIN_SHEN: ReadonlyMap<string, string> = new Map([
  ["寅", "卯"],
  ["巳", "午"],
  ["申", "酉"],
  ["亥", "子"],
  ["丑", "辰"],
  ["辰", "未"],
  ["未", "戌"],
  ["戌", "丑"],
]);

const TUI_SHEN: ReadonlyMap<string, string> = new Map([
  ["卯", "寅"],
  ["午", "巳"],
  ["酉", "申"],
  ["子", "亥"],
  ["辰", "丑"],
  ["未", "辰"],
  ["戌", "未"],
  ["丑", "戌"],
]);

const MU_BRANCH: ReadonlyMap<WuXing, string> = new Map<WuXing, string>(
  [
    ["木", "未"],
    ["火", "戌"],
    ["土", "戌"],
    ["金", "丑"],
    ["水", "辰"],
  ],
);

const JUE_BRANCH: ReadonlyMap<WuXing, string> = new Map<WuXing, string>(
  [
    ["木", "申"],
    ["火", "亥"],
    ["土", "亥"],
    ["金", "寅"],
    ["水", "巳"],
  ],
);

function xunStartZhi(dayGan: string, dayBranch: string): number {
  const ganIdx = GAN.indexOf(dayGan as (typeof GAN)[number]);
  const zhiIdx = ZHI.indexOf(dayBranch as (typeof ZHI)[number]);
  return (zhiIdx - ganIdx + 12) % 12;
}

export function xunKong(dayGan: string, dayBranch: string): string[] {
  const startZhi = xunStartZhi(dayGan, dayBranch);
  return [ZHI[(startZhi + 10) % 12], ZHI[(startZhi + 11) % 12]];
}

export function xunName(dayGan: string, dayBranch: string): string {
  return `甲${ZHI[xunStartZhi(dayGan, dayBranch)]}旬`;
}

export function isChong(a: string, b: string): boolean {
  return b === LIU_CHONG.get(a);
}

export function isHe(a: string, b: string): boolean {
  return b === LIU_HE.get(a);
}

export function isJinShen(from: string, to: string): boolean {
  return to === JIN_SHEN.get(from);
}

export function isTuiShen(from: string, to: string): boolean {
  return to === TUI_SHEN.get(from);
}

export function isMu(wx: WuXing, branch: string): boolean {
  return branch === MU_BRANCH.get(wx);
}

export function isJue(wx: WuXing, branch: string): boolean {
  return branch === JUE_BRANCH.get(wx);
}
