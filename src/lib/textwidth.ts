/**
 * Terminal-style display-width padding for text boards. One policy for the
 * whole app: CJK ideographs, fullwidth forms and the ideographic space count
 * as 2 columns; everything else 1.
 * U+3000 is pinned wide explicitly: renderers disagree on its east-asian
 * width and the text boards depend on one stable answer. U+2585 (▅, the 爻
 * bar) stays width 1 — matching the Java reference the liuyao goldens pin.
 */

/** 盘面/步骤编号用的中文数字 */
export const CN_NUM = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"] as const;

function isWide(cp: number): boolean {
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x20000 && cp <= 0x2a6df) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xff01 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    cp === 0x3000
  );
}

export function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += isWide(ch.codePointAt(0)!) ? 2 : 1;
  return w;
}

export function pad(s: string, targetDisplayWidth: number): string {
  const dw = displayWidth(s);
  return dw >= targetDisplayWidth ? s : s + " ".repeat(targetDisplayWidth - dw);
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
