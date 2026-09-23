import { Solar, LunarUtil } from "lunar-javascript";
import type { EightCharApi } from "lunar-javascript";
import { ZHI, type Zhi } from "@/lib/ganzhi";
import { pad2 } from "@/lib/textwidth";

// Single seam over lunar-javascript (same author as the Java cn.6tail:lunar
// used by the reference implementation). The raw library object is NOT
// exposed — engines consume ChartMoment fields only.
//
// Day-ganzhi convention: 晚子时 — the day rolls at 23:00 (getDayInGanZhiExact).
// This is what every engine here uses, so the choice lives here once.

export const SHI_CHEN_ZHI: readonly Zhi[] = ZHI;
export type { Zhi as ShiChenZhi } from "@/lib/ganzhi";
export type ShiChenIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export { pad2 };

export interface JieqiInfo {
  /** e.g. 冬至 */
  name: string;
  /** 交节 date, yyyy-MM-dd */
  date: string;
}

export interface ChartMoment {
  solar: { year: number; month: number; day: number; hour: number; minute: number };
  /** 农历月，负数表示闰月 */
  lunarMonth: number;
  /** 农历日 1-30 */
  lunarDay: number;
  shiChenIndex: ShiChenIndex;
  yearGanZhi: string;
  monthGanZhi: string;
  dayGanZhi: string;
  timeGanZhi: string;
  /** 节气 governing this day (节气管全天；the term on the day itself counts) */
  prevJieqi: JieqiInfo;
}

export function fromSolar(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): ChartMoment {
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
  const jieqi = lunar.getPrevJieQi(true);
  return {
    solar: { year, month, day, hour, minute },
    lunarMonth: lunar.getMonth(),
    lunarDay: lunar.getDay(),
    shiChenIndex: LunarUtil.getTimeZhiIndex(`${pad2(hour)}:${pad2(minute)}`) as ShiChenIndex,
    yearGanZhi: lunar.getYearInGanZhiExact(),
    monthGanZhi: lunar.getMonthInGanZhiExact(),
    dayGanZhi: lunar.getDayInGanZhiExact(),
    timeGanZhi: lunar.getTimeInGanZhi(),
    prevJieqi: { name: jieqi.getName(), date: jieqi.getSolar().toYmd() },
  };
}

/** 公历 n 年某节气的交节日（yyyy-MM-dd）；节气表取自立春后一日，全年齐备 */
export function jieqiDate(year: number, name: string): string | null {
  const lunar = Solar.fromYmdHms(year, 3, 1, 12, 0, 0).getLunar();
  const table = (lunar as unknown as {
    getJieQiTable?: () => Record<string, { toYmd(): string } | undefined>;
  }).getJieQiTable?.();
  return table?.[name]?.toYmd() ?? null;
}

export function now(): ChartMoment {
  const d = new Date();
  return fromSolar(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes());
}

/** Deliberate second seam for the 八字 engine (which needs 干支/十神/大运). */
export function eightChar(m: ChartMoment): EightCharApi {
  return Solar.fromYmdHms(
    m.solar.year,
    m.solar.month,
    m.solar.day,
    m.solar.hour,
    m.solar.minute,
    0
  )
    .getLunar()
    .getEightChar();
}
