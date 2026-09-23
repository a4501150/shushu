/** 排盘渲染. Port of PaiPan.java (formatting). */
import { BRANCH_WU_XING, TRIGRAM_NATURE, YAO_NAMES, trigramFromBits } from "./tables";
import { pad } from "../textwidth";
import type { FuShenInfo, PanResult, YaoInfo } from "./types";

function yaoTypeName(sum: number): string {
  switch (sum) {
    case 6:
      return "老阴 ▅▅ ▅▅ ×  (变)";
    case 7:
      return "少阳 ▅▅▅▅▅";
    case 8:
      return "少阴 ▅▅ ▅▅";
    case 9:
      return "老阳 ▅▅▅▅▅ ○  (变)";
    default:
      throw new Error(`Unexpected sum: ${sum}`);
  }
}

const PALACE_TYPES = [
  "本宫卦",
  "一世卦",
  "二世卦",
  "三世卦",
  "四世卦",
  "五世卦",
  "游魂卦",
  "归魂卦",
];

const BEN_COL = 27;
const BIAN_COL = 18;

export function formatRaw(
  sixSums: readonly number[],
  r: PanResult,
): string {
  let sb = "摇卦得六爻（自上而下，上爻居首）:\n";
  for (let i = 5; i >= 0; i--) {
    sb += `  第${i + 1}爻 ${YAO_NAMES[i]}: ${sixSums[i]} ${yaoTypeName(sixSums[i])}\n`;
  }
  sb += `本卦: ${fullGuaName(r.benGuaName, r.benGuaYaos)}`;
  if (r.bianGuaName != null) {
    sb += `  变卦: ${fullGuaName(r.bianGuaName, r.bianGuaYaos ?? [])}`;
  }
  sb += "\n";
  return sb;
}

export function format(r: PanResult): string {
  let sb = "";
  const hasBian = r.bianGuaName != null;

  const benFullName = fullGuaName(r.benGuaName, r.benGuaYaos);
  const bianFullName = hasBian
    ? fullGuaName(r.bianGuaName!, r.bianGuaYaos ?? [])
    : null;

  // header line
  sb += `${r.palace}宫：${benFullName}（${PALACE_TYPES[r.palaceIndex]}）`;
  if (r.xunName != null) {
    sb += `  旬空：${r.xunKong.join("")}`;
  }
  if (r.monthBranch != null) {
    const mWx = BRANCH_WU_XING.get(r.monthBranch)!;
    sb += `  月建：${r.monthBranch}${mWx}`;
  }
  if (r.dayBranch != null) {
    const dWx = BRANCH_WU_XING.get(r.dayBranch)!;
    sb += `  日辰：${r.dayGan}${r.dayBranch}${dWx}`;
  }
  sb += "\n";

  const totalWidth = BEN_COL + 3 + BIAN_COL + 3 + 10;
  const sep = "━".repeat(totalWidth);
  sb += `${sep}\n`;

  // column header
  const benHeader = `本卦：${benFullName}`;
  const bianHeader = hasBian ? `变卦：${bianFullName}` : "";
  sb += `${pad(benHeader, BEN_COL)} │ ${pad(bianHeader, BIAN_COL)} │ 备注\n`;
  sb += `${sep}\n`;

  // build fuShen lookup
  const fuShenMap = new Map<number, FuShenInfo>();
  if (r.fuShen != null) {
    for (const fs of r.fuShen) fuShenMap.set(fs.position, fs);
  }

  // yaos top to bottom
  for (let i = 5; i >= 0; i--) {
    const y = r.benGuaYaos[i];
    const ann = r.yaoAnnotations.get(y.position) ?? [];
    const dba = r.dongBianAnnotations.get(y.position) ?? [];

    // -- 本卦 column --
    const yaoLine = y.sum === 7 || y.sum === 9 ? "▅▅▅▅▅" : "▅▅ ▅▅";
    let benSb = `${y.liuShen} ${y.liuQin} ${y.heavenlyStem}${y.earthlyBranch}${y.wuXing} ${yaoLine}`;
    if (y.isShiYao) benSb += " 世";
    else if (y.isYingYao) benSb += " 应";
    if (y.isDong) benSb += y.sum === 6 ? " ×" : " ○";
    const benCol = pad(benSb, BEN_COL);

    // -- 变卦 column --
    let bianCol: string;
    if (hasBian && y.isDong && r.bianGuaYaos != null) {
      const by = r.bianGuaYaos[i];
      const bianLine =
        by.sum === 7 || by.sum === 9 ? "▅▅▅▅▅" : "▅▅ ▅▅";
      bianCol = pad(
        `${by.liuQin} ${by.heavenlyStem}${by.earthlyBranch}${by.wuXing} ${bianLine}`,
        BIAN_COL,
      );
    } else {
      bianCol = " ".repeat(BIAN_COL);
    }

    // -- 备注 column --
    let noteSb = "";
    if (dba.length > 0) noteSb += dba.join(" ");
    if (ann.length > 0) {
      if (noteSb !== "") noteSb += " ";
      noteSb += ann.join(" ");
    }
    const fs = fuShenMap.get(y.position);
    if (fs != null) {
      if (noteSb !== "") noteSb += " ";
      noteSb += `伏：${fs.liuQin} ${fs.heavenlyStem}${fs.earthlyBranch}${fs.wuXing} ${fs.relationship}`;
      if (r.xunKong.length > 0 && r.xunKong.includes(fs.earthlyBranch)) {
        noteSb += "(空)";
      }
    }

    sb += `${benCol} │ ${bianCol} │ ${noteSb}\n`;
  }

  sb += `${sep}\n`;
  return sb;
}

function fullGuaName(
  shortName: string,
  yaos: readonly YaoInfo[],
): string {
  const key = keyFromYaos(yaos);
  const outer = trigramFromBits(key.substring(0, 3));
  const inner = trigramFromBits(key.substring(3, 6));
  if (outer === inner) {
    return `${outer}为${TRIGRAM_NATURE[outer]}`;
  }
  return `${TRIGRAM_NATURE[outer]}${TRIGRAM_NATURE[inner]}${shortName}`;
}

function keyFromYaos(yaos: readonly YaoInfo[]): string {
  let s = "";
  for (let i = 5; i >= 0; i--) {
    const sum = yaos[i].sum;
    s += sum === 7 || sum === 9 ? "1" : "0";
  }
  return s;
}

// ---- helpers ----
