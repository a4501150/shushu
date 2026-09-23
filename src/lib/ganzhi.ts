/** 干支 sequences and 60-cycle math — the single source for all engines. */

export const GAN = [
  "甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸",
] as const;

export const ZHI = [
  "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥",
] as const;

export type Gan = (typeof GAN)[number];
export type Zhi = (typeof ZHI)[number];

/** Index in the 60-cycle (0 = 甲子). -1 for an impossible stem/branch pair. */
export function ganzhiIndex(gz: string): number {
  const g = GAN.indexOf(gz[0] as Gan);
  const z = ZHI.indexOf(gz[1] as Zhi);
  if (g < 0 || z < 0) return -1;
  for (let i = g; i < 60; i += 10) if (i % 12 === z) return i;
  return -1;
}

export function ganzhiFromIndex(i: number): string {
  return `${GAN[((i % 10) + 10) % 10]}${ZHI[((i % 12) + 12) % 12]}`;
}

export function splitGanZhi(gz: string): [Gan, Zhi] {
  if (gz.length !== 2) throw new Error(`不是干支: ${gz}`);
  return [gz[0] as Gan, gz[1] as Zhi];
}

/** Index of the 旬首 (nearest 甲 at or before) within the 60-cycle. */
export function xunHeadIndex(i: number): number {
  return i - (i % 10);
}

/** 旬首 offset (0-5) of the 甲子/甲戌/甲申/甲午/甲辰/甲寅 旬. */
export function xunOrdinal(i: number): number {
  return xunHeadIndex(i) / 10;
}
