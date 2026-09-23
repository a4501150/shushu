declare module "lunar-javascript" {
  export interface LunarApi {
    getMonth(): number;
    getDay(): number;
    getYearInGanZhi(): string;
    getYearInGanZhiExact(): string;
    getMonthInGanZhi(): string;
    getMonthInGanZhiExact(): string;
    getDayInGanZhi(): string;
    getDayInGanZhiExact(): string;
    getDayInGanZhiExact2(): string;
    getTimeInGanZhi(): string;
    /** 上一个节气；omit=true 时含当日节气（节气当日即管全天，奇门拆补法所需口径）。 */
    getPrevJieQi(omit?: boolean): JieQiApi;
    getEightChar(): EightCharApi;
    [key: string]: unknown;
  }
  export interface JieQiApi {
    getName(): string;
    getSolar(): {
      toYmd(): string;
      toYmdHms(): string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }
  export interface EightCharApi {
    /** 1 = 晚子时日柱作次日; 2 = 夜子时归当日 (default). */
    setSect(sect: number): void;
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    getDayWuXing(): string[];
    getYearHideGan(): string[];
    getYearShiShenGan(): string;
    getYearShiShenZhi(): string[];
    getMonthHideGan(): string[];
    getMonthShiShenGan(): string;
    getMonthShiShenZhi(): string[];
    getDayHideGan(): string[];
    getDayShiShenGan(): string;
    getDayShiShenZhi(): string[];
    getTimeHideGan(): string[];
    getTimeShiShenGan(): string;
    getTimeShiShenZhi(): string[];
    getYearNaYin(): string;
    getMonthNaYin(): string;
    getDayNaYin(): string;
    getTimeNaYin(): string;
    getYun(gender: number, sect?: number, genderName?: string): YunApi;
    [key: string]: unknown;
  }
  export interface YunApi {
    getStartYear(): number;
    getStartMonth(): number;
    getStartDay(): number;
    getStartHour(): number;
    isForward(): boolean;
    getDaYun(n?: number): DaYunApi[];
    [key: string]: unknown;
  }
  export interface DaYunApi {
    getStartYear(): number;
    getEndYear(): number;
    getStartAge(): number;
    getGanZhi(): string;
    getLiuNian(n?: number): unknown[];
    [key: string]: unknown;
  }
  export const Solar: {
    fromYmdHms(
      y: number,
      m: number,
      d: number,
      h: number,
      i: number,
      s: number
    ): { getLunar(): LunarApi; [key: string]: unknown };
    fromYmd(y: number, m: number, d: number): { getLunar(): LunarApi };
    [key: string]: unknown;
  };
  export const Lunar: {
    fromYmdHms(
      y: number,
      m: number,
      d: number,
      h: number,
      i: number,
      s: number
    ): LunarApi;
    [key: string]: unknown;
  };
  export const LunarUtil: {
    getTimeZhiIndex(hhmm: string): number;
    [key: string]: unknown;
  };
}
