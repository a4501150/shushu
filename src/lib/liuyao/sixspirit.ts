/** 六神. Port of SixSpirit.java. */
export type SixSpirit = "青龙" | "朱雀" | "勾陈" | "螣蛇" | "白虎" | "玄武";

/** Declaration order, matching SixSpirit.values() in the Java reference. */
export const SIX_SPIRITS: readonly SixSpirit[] = [
  "青龙",
  "朱雀",
  "勾陈",
  "螣蛇",
  "白虎",
  "玄武",
];

export function startSpiritFor(dayGan: string): SixSpirit {
  switch (dayGan) {
    case "甲":
    case "乙":
      return "青龙";
    case "丙":
    case "丁":
      return "朱雀";
    case "戊":
      return "勾陈";
    case "己":
      return "螣蛇";
    case "庚":
    case "辛":
      return "白虎";
    case "壬":
    case "癸":
      return "玄武";
    default:
      throw new Error(`Unknown day gan: ${dayGan}`);
  }
}

export function spiritAtYao(start: SixSpirit, position: number): SixSpirit {
  return SIX_SPIRITS[(SIX_SPIRITS.indexOf(start) + position - 1) % 6];
}
