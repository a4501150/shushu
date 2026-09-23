import { fromSolar, type ChartMoment } from "@/lib/calendar";
import { pad2 } from "@/lib/textwidth";

/**
 * 真太阳时校正：钟表时间（时区标准经线 tz×15° 的地方平时）换算到
 * 当地真太阳时 = 钟表 + 经度差（4 分/度）+ 均时差。
 * 时辰、日辰（晚子时换日）都随校正后的时刻走。
 */
export interface Place {
  name: string;
  /** 东经为正、西经为负 */
  lng: number;
  /** 钟表时间使用的 UTC 偏移（小时，可半小时/45分制）；海外按标准时区，夏令时自行加减 */
  tz: number;
  region: string;
}

export const REGIONS = ["国内", "亚洲", "欧洲", "非洲", "美洲", "大洋洲"] as const;

const CN = (name: string, lng: number): Place => ({ name, lng, tz: 8, region: "国内" });

export const PLACES: readonly Place[] = [
  CN("北京", 116.4),
  CN("上海", 121.5),
  CN("广州", 113.3),
  CN("深圳", 114.1),
  CN("成都", 104.1),
  CN("重庆", 106.5),
  CN("武汉", 114.3),
  CN("杭州", 120.2),
  CN("南京", 118.8),
  CN("天津", 117.2),
  CN("西安", 108.9),
  CN("郑州", 113.6),
  CN("长沙", 112.9),
  CN("济南", 117.0),
  CN("青岛", 120.4),
  CN("沈阳", 123.4),
  CN("哈尔滨", 126.5),
  CN("大连", 121.6),
  CN("兰州", 103.8),
  CN("乌鲁木齐", 87.6),
  CN("昆明", 102.7),
  CN("拉萨", 91.1),
  CN("西宁", 101.7),
  CN("银川", 106.3),
  CN("呼和浩特", 111.7),
  CN("南宁", 108.4),
  CN("贵阳", 106.7),
  CN("南昌", 115.9),
  CN("福州", 119.3),
  CN("厦门", 118.1),
  CN("苏州", 120.6),
  CN("宁波", 121.6),
  CN("石家庄", 114.5),
  CN("太原", 112.5),
  CN("合肥", 117.2),
  CN("香港", 114.2),
  CN("澳门", 113.5),
  CN("台北", 121.5),
  { name: "新加坡", lng: 103.8, tz: 8, region: "亚洲" },
  { name: "吉隆坡", lng: 101.7, tz: 8, region: "亚洲" },
  { name: "东京", lng: 139.7, tz: 9, region: "亚洲" },
  { name: "首尔", lng: 127.0, tz: 9, region: "亚洲" },
  { name: "曼谷", lng: 100.5, tz: 7, region: "亚洲" },
  { name: "马尼拉", lng: 121.0, tz: 8, region: "亚洲" },
  { name: "雅加达", lng: 106.8, tz: 7, region: "亚洲" },
  { name: "胡志明市", lng: 106.7, tz: 7, region: "亚洲" },
  { name: "河内", lng: 105.8, tz: 7, region: "亚洲" },
  { name: "卡拉奇", lng: 67.0, tz: 5, region: "亚洲" },
  { name: "达卡", lng: 90.4, tz: 6, region: "亚洲" },
  { name: "加德满都", lng: 85.3, tz: 5.75, region: "亚洲" },
  { name: "新德里", lng: 77.2, tz: 5.5, region: "亚洲" },
  { name: "孟买", lng: 72.8, tz: 5.5, region: "亚洲" },
  { name: "迪拜", lng: 55.3, tz: 4, region: "亚洲" },
  { name: "利雅得", lng: 46.7, tz: 3, region: "亚洲" },
  { name: "伊斯坦布尔", lng: 29.0, tz: 3, region: "亚洲" },
  { name: "莫斯科", lng: 37.6, tz: 3, region: "欧洲" },
  { name: "伦敦", lng: -0.1, tz: 0, region: "欧洲" },
  { name: "巴黎", lng: 2.4, tz: 1, region: "欧洲" },
  { name: "柏林", lng: 13.4, tz: 1, region: "欧洲" },
  { name: "马德里", lng: -3.7, tz: 1, region: "欧洲" },
  { name: "罗马", lng: 12.5, tz: 1, region: "欧洲" },
  { name: "阿姆斯特丹", lng: 4.9, tz: 1, region: "欧洲" },
  { name: "雅典", lng: 23.7, tz: 2, region: "欧洲" },
  { name: "开罗", lng: 31.2, tz: 2, region: "非洲" },
  { name: "拉各斯", lng: 3.4, tz: 1, region: "非洲" },
  { name: "内罗毕", lng: 36.8, tz: 3, region: "非洲" },
  { name: "约翰内斯堡", lng: 28.0, tz: 2, region: "非洲" },
  { name: "纽约", lng: -74.0, tz: -5, region: "美洲" },
  { name: "洛杉矶", lng: -118.2, tz: -8, region: "美洲" },
  { name: "多伦多", lng: -79.4, tz: -5, region: "美洲" },
  { name: "温哥华", lng: -123.1, tz: -8, region: "美洲" },
  { name: "墨西哥城", lng: -99.1, tz: -6, region: "美洲" },
  { name: "圣保罗", lng: -46.6, tz: -3, region: "美洲" },
  { name: "布宜诺斯艾利斯", lng: -58.4, tz: -3, region: "美洲" },
  { name: "利马", lng: -77.0, tz: -5, region: "美洲" },
  { name: "檀香山", lng: -157.9, tz: -10, region: "美洲" },
  { name: "悉尼", lng: 151.2, tz: 10, region: "大洋洲" },
  { name: "墨尔本", lng: 145.0, tz: 10, region: "大洋洲" },
  { name: "奥克兰", lng: 174.8, tz: 12, region: "大洋洲" },
];

/** +5.5 → "UTC+5:30"，供地点选项文案使用。 */
export function fmtUtcOffset(tz: number): string {
  const h = Math.floor(Math.abs(tz));
  const m = Math.round((Math.abs(tz) - h) * 60);
  return `UTC${tz < 0 ? "−" : "+"}${h}${m ? `:${pad2(m)}` : ""}`;
}

/** NOAA 均时差公式，分钟；真太阳时 − 平太阳时，全年 ±16 分内，精度约 ±1 分。 */
export function equationOfTimeMinutes(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const n = Math.floor((Date.UTC(date.getUTCFullYear(), date.getMonth(), date.getDate()) - start) / 86400000) + 1;
  const g = ((2 * Math.PI) / 365.25) * (n - 1);
  return (
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.04089 * Math.sin(2 * g))
  );
}

/** 钟表 → 真太阳时的总校正量（分钟，四舍五入）。 */
export function trueSolarCorrectionMinutes(date: Date, place: Place): number {
  return Math.round(4 * (place.lng - 15 * place.tz) + equationOfTimeMinutes(date));
}

/** 本地墙钟 Date → ChartMoment（不做校正）。 */
export function fromLocalDate(d: Date): ChartMoment {
  return fromSolar(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes());
}

/** 把墙钟 Date 按地点校正为排盘用 ChartMoment。 */
export function trueSolarOf(
  date: Date,
  place: Place | null
): { moment: ChartMoment; correctionMinutes: number } {
  if (!place) return { moment: fromLocalDate(date), correctionMinutes: 0 };
  const corr = trueSolarCorrectionMinutes(date, place);
  const shifted = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes() + corr
  );
  return { moment: fromLocalDate(shifted), correctionMinutes: corr };
}
