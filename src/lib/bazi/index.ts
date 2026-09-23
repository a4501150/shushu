// 八字四柱 engine — a typed wrapper over lunar-javascript's EightChar (the
// JS twin of the Java cn.6tail:lunar reference implementation).
//
// Conventions:
// - Pillars use EightChar sect 1 (setSect(1)): the 晚子时 (23:00-23:59) day
//   pillar belongs to the *next* day, matching ChartMoment.dayGanZhi
//   (getDayInGanZhiExact, day rolls at 23:00) and every other engine here.
// - 大运 uses Yun sect 1: 起运按天数和时辰数计算（3天=1年，1天=4个月，1时辰=10天）。
import type { ChartMoment } from "../calendar";
import { eightChar } from "../calendar";
import type { WuXing } from "../liuyao/wuxing";
import { BRANCH_WU_XING } from "../liuyao/tables";
import { pad, pad2 } from "../textwidth";

export type Gender = "male" | "female";

export const genderLabel = (g: Gender): "男" | "女" => (g === "male" ? "男" : "女");
export const qianKun = (g: Gender): "乾造" | "坤造" => (g === "male" ? "乾造" : "坤造");

export type PillarName = "年柱" | "月柱" | "日柱" | "时柱";

export interface Pillar {
  name: PillarName;
  /** 干支，如 "丙寅" */
  ganZhi: string;
  /** 天干 */
  gan: string;
  /** 地支 */
  zhi: string;
  /** 天干十神（日柱为 "日主"） */
  shiShenGan: string;
  /** 地支藏干 */
  hideGan: string[];
  /** 藏干十神，与 hideGan 一一对应 */
  shiShenZhi: string[];
  /** 纳音，如 "炉中火" */
  naYin: string;
}

export interface WuXingCount {
  金: number;
  木: number;
  水: number;
  火: number;
  土: number;
}

/** 起运（Yun）信息：出生后多久起运。 */
export interface QiYun {
  /** 出生后 X 年 */
  afterYears: number;
  afterMonths: number;
  afterDays: number;
  /** 时辰数（sect 1 流派下 1 时辰 = 10 天） */
  afterShiChen: number;
  /** 顺排 true / 逆排 false（阳男阴女顺，阴男阳女逆） */
  forward: boolean;
}

export interface DaYunItem {
  ganZhi: string;
  /** 起始虚岁 */
  startAge: number;
  startYear: number;
  endYear: number;
}

export interface BaziResult {
  gender: Gender;
  solar: ChartMoment["solar"];
  /** 年、月、日、时四柱，固定顺序 */
  pillars: [Pillar, Pillar, Pillar, Pillar];
  /** 五行计数：四柱八字（含地支藏干） */
  wuXing: WuXingCount;
  qiYun: QiYun;
  /** 大运列表（不含起运前的命宫前运，起运后每步 10 年） */
  daYun: DaYunItem[];
}

const GAN_WU_XING: Record<string, WuXing> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};
function countChar(c: string, wuXing: WuXingCount): void {
  const w = GAN_WU_XING[c] ?? BRANCH_WU_XING.get(c);
  if (w) wuXing[w] += 1;
}

/**
 * 排八字：四柱（干支/藏干/十神/纳音）、五行统计（含藏干）、大运。
 *
 * gender 映射到 lunar-javascript 的 getYun 参数（1=男，0=女），流派取
 * sect=1（按天数和时辰数计算起运）。
 */
export function computeBazi(m: ChartMoment, gender: Gender): BaziResult {
  const ec = eightChar(m);
  ec.setSect(1);
  const specs: [PillarName, () => string, () => string[], () => string, () => string][] = [
    ["年柱", () => ec.getYear(), () => ec.getYearHideGan(), () => ec.getYearShiShenGan() === "" ? "—" : ec.getYearShiShenGan(), () => ec.getYearNaYin()],
    ["月柱", () => ec.getMonth(), () => ec.getMonthHideGan(), () => ec.getMonthShiShenGan(), () => ec.getMonthNaYin()],
    ["日柱", () => ec.getDay(), () => ec.getDayHideGan(), () => ec.getDayShiShenGan(), () => ec.getDayNaYin()],
    ["时柱", () => ec.getTime(), () => ec.getTimeHideGan(), () => ec.getTimeShiShenGan(), () => ec.getTimeNaYin()],
  ];
  const pillars = specs.map(([name, ganZhi, hideGan, shiShenGan, naYin]): Pillar => {
    const gz = ganZhi();
    return {
      name,
      ganZhi: gz,
      gan: gz.charAt(0),
      zhi: gz.charAt(1),
      shiShenGan: shiShenGan(),
      hideGan: hideGan(),
      shiShenZhi: shiShenZhiOf(ec, name),
      naYin: naYin(),
    };
  }) as [Pillar, Pillar, Pillar, Pillar];

  const wuXing: WuXingCount = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
  for (const p of pillars) {
    countChar(p.gan, wuXing);
    // 藏干首位即地支本气，五行与地支同——只数藏干，地支不再单计，避免本气重复计数。
    for (const hg of p.hideGan) countChar(hg, wuXing);
  }

  const yun = ec.getYun(gender === "male" ? 1 : 0, 1);
  const daYun: DaYunItem[] = yun
    .getDaYun()
    // The first entry covers the pre-起运 span and has no 干支.
    .filter((d) => d.getGanZhi() !== "")
    .map((d) => ({
      ganZhi: d.getGanZhi(),
      startAge: d.getStartAge(),
      startYear: d.getStartYear(),
      endYear: d.getEndYear(),
    }));

  return {
    gender,
    solar: m.solar,
    pillars,
    wuXing,
    qiYun: {
      afterYears: yun.getStartYear(),
      afterMonths: yun.getStartMonth(),
      afterDays: yun.getStartDay(),
      afterShiChen: yun.getStartHour(),
      forward: yun.isForward(),
    },
    daYun,
  };
}

function shiShenZhiOf(ec: ReturnType<typeof eightChar>, name: PillarName): string[] {
  switch (name) {
    case "年柱":
      return ec.getYearShiShenZhi();
    case "月柱":
      return ec.getMonthShiShenZhi();
    case "日柱":
      return ec.getDayShiShenZhi();
    case "时柱":
      return ec.getTimeShiShenZhi();
  }
}

/** Compact plain-text board, suitable for an LLM prompt. */
export function formatText(r: BaziResult): string {
  const s = r.solar;
  const cols = r.pillars;
  const row = (label: string, cells: string[]) =>
    pad(label, 8) + cells.map((c) => pad(c, 10)).join("");
  const lines: string[] = [];
  lines.push(`四柱八字排盘（${qianKun(r.gender)}）`);
  lines.push(`阳历：${s.year}-${pad2(s.month)}-${pad2(s.day)} ${pad2(s.hour)}:${pad2(s.minute)}`);
  lines.push(row("", ["年柱", "月柱", "日柱", "时柱"]));
  lines.push(row("干支", cols.map((p) => p.ganZhi)));
  lines.push(row("十神", cols.map((p) => p.shiShenGan)));
  lines.push(row("藏干", cols.map((p) => p.hideGan.join(""))));
  lines.push(row("藏干十神", cols.map((p) => p.shiShenZhi.join(""))));
  lines.push(row("纳音", cols.map((p) => p.naYin)));
  lines.push(
    `五行：金${r.wuXing.金} 木${r.wuXing.木} 水${r.wuXing.水} 火${r.wuXing.火} 土${r.wuXing.土}（按天干与地支藏干计）`
  );
  const span = ([
    [r.qiYun.afterYears, "年"],
    [r.qiYun.afterMonths, "月"],
    [r.qiYun.afterDays, "日"],
    [r.qiYun.afterShiChen, "时辰"],
  ] as [number, string][])
    .filter(([n]) => n > 0)
    .map(([n, u]) => `${n}${u}`)
    .join("");
  lines.push(
    `起运：出生后${span || "即时"}起运，大运${r.qiYun.forward ? "顺排" : "逆排"}`
  );
  lines.push("大运（岁数为虚岁）：");
  for (const d of r.daYun) {
    lines.push(`  ${d.ganZhi} ${d.startAge}岁 ${d.startYear}-${d.endYear}`);
  }
  return lines.join("\n");
}
