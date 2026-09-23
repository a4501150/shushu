/**
 * 五运六气推演：岁运→主客运→主客气→客主加临→运气同化→三因方。
 * 规则据《素问》天元纪/六微旨/气交变大论等七篇大论之通行教材框架；
 * 客气相因顺序为「一厥阴、二少阴、三太阴、少阳、二阳明、三太阳」，
 * 司天居三之气，在泉即其对冲（相火对厥阴、君火对寒水、湿土对燥金）。
 */

import { ganzhiFromIndex, type Gan, type Zhi } from "@/lib/ganzhi";
import { SUYUN_FANG, SITIAN_FANG, type Qi6, type SuiyunFang, type SitianFang } from "@/lib/yi/sanyin";
import { jieqiDate } from "@/lib/calendar";

export { formatText, formatNatalText } from "@/lib/wuyunliuqi/format";

export type WuXing = "木" | "火" | "土" | "金" | "水";

/** 客气相因、在泉对冲所用六气环（三阴尽、三阳续） */
export const QI_CYCLE: readonly Qi6[] = [
  "厥阴风木", "少阴君火", "太阴湿土", "少阳相火", "阳明燥金", "太阳寒水",
];

/** 主气六步之序（动气次序，火间于木土之间） */
export const ZHU_QI: readonly Qi6[] = [
  "厥阴风木", "少阴君火", "少阳相火", "太阴湿土", "阳明燥金", "太阳寒水",
];

const QI_WX: Record<Qi6, WuXing> = {
  厥阴风木: "木", 少阴君火: "火", 太阴湿土: "土",
  少阳相火: "火", 阳明燥金: "金", 太阳寒水: "水",
};

/** 六气君相之火，判客主加临「臣居君位」用 */
const isJunhuo = (qi: Qi6) => qi === "少阴君火";
const isXianghuo = (qi: Qi6) => qi === "少阳相火";

const SITIAN_BY_ZHI: Record<Zhi, Qi6> = {
  子: "少阴君火", 午: "少阴君火",
  丑: "太阴湿土", 未: "太阴湿土",
  寅: "少阳相火", 申: "少阳相火",
  卯: "阳明燥金", 酉: "阳明燥金",
  辰: "太阳寒水", 戌: "太阳寒水",
  巳: "厥阴风木", 亥: "厥阴风木",
};

/** 地支方位五行（岁会判定用） */
const ZHI_WX: Record<Zhi, WuXing> = {
  寅: "木", 卯: "木", 巳: "火", 午: "火", 申: "金", 酉: "金",
  亥: "水", 子: "水", 辰: "土", 戌: "土", 丑: "土", 未: "土",
};

/** 我生者 */
const SHENG: Record<WuXing, WuXing> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
/** 我克者 */
const KE: Record<WuXing, WuXing> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

/** 十干化运：阳干太过、阴干不及 */
const YUN_BY_GAN: Record<Gan, { wx: WuXing; tai: boolean }> = {
  甲: { wx: "土", tai: true }, 己: { wx: "土", tai: false },
  乙: { wx: "金", tai: false }, 庚: { wx: "金", tai: true },
  丙: { wx: "水", tai: true }, 辛: { wx: "水", tai: false },
  丁: { wx: "木", tai: false }, 壬: { wx: "木", tai: true },
  戊: { wx: "火", tai: true }, 癸: { wx: "火", tai: false },
};

const WX_YIN = { 木: "角", 火: "徵", 土: "宫", 金: "商", 水: "羽" } as const;
const SHENG_ORDER: readonly WuXing[] = ["木", "火", "土", "金", "水"];

const BU_QI = ["初之气", "二之气", "三之气", "四之气", "五之气", "终之气"];
const YUN_BU = ["初运", "二运", "三运", "四运", "终运"];
/** 六步交司节气；终之气至于次年大寒 */
const JIEQI = ["大寒", "春分", "小满", "大暑", "秋分", "小雪"];

export interface YunBu {
  bu: string;
  /** 如「太角（木）」「少徵（火）」 */
  name: string;
  tai: boolean;
}

export interface QiBu {
  bu: string;
  qi: Qi6;
  /** 本步起于何节气 */
  jieqi: string;
  /** 该节气当年交节日；查历不历时为本年名目 */
  qiri: string;
  /** 客主加临断辞；仅客气步有 */
  jialin?: string;
}

export interface WuyunResult {
  year: number;
  ganZhi: string;
  gan: Gan;
  zhi: Zhi;
  suiyun: SuiyunFang;
  /** 岁运一步的推导说明（如「丙辛化水；丙为阳干，水运太过」） */
  suiyunStep: string;
  zhuYun: YunBu[];
  keYun: YunBu[];
  zhuQi: QiBu[];
  keQi: QiBu[];
  /** 司天六气名（SITIAN_FANG 的键） */
  sitianQi: Qi6;
  /** 在泉六气名 */
  zaiquan: Qi6;
  sitian: SitianFang;
  /** 客气四步间气（左/右间），六步全列于 keQi，此处存三阴三阳环说明 */
  tonghua: string[];
  fang: { source: string; text: string }[];
  /** 编号推导步骤，逐条展示 */
  steps: { title: string; lines: string[] }[];
  conclusion: string[];
}

function yunStepLabels(yunWx: WuXing, yunTai: boolean, fromYun: boolean): YunBu[] {
  const start = fromYun ? SHENG_ORDER.indexOf(yunWx) : 0; // 客运始自岁运，主运始自木
  return YUN_BU.map((bu, k) => {
    const idx = (start + k) % 5;
    const wx = SHENG_ORDER[idx];
    // 太少相生：相邻两运递互太少，以岁运之太少定其位（主运按相隔步数）
    const d = fromYun ? k : Math.abs(idx - SHENG_ORDER.indexOf(yunWx));
    const tai = d % 2 === 0 ? yunTai : !yunTai;
    return { bu, name: `${tai ? "太" : "少"}${WX_YIN[wx]}（${wx}）`, tai };
  });
}

function jialin(zhu: Qi6, ke: Qi6): string {
  const zw = QI_WX[zhu];
  const kw = QI_WX[ke];
  if (isXianghuo(ke) && isJunhuo(zhu)) return "相火加临君火，臣居君位，逆";
  if (isJunhuo(ke) && isXianghuo(zhu)) return "君火临相火之位，顺";
  if (ke === zhu) return "客主同气，相得";
  if (SHENG[kw] === zw) return `${ke}生${zhu}，客生主，相生相得`;
  if (SHENG[zw] === kw) return `${zhu}生${ke}，主生客，相生相得`;
  if (KE[kw] === zw) return `${ke}克${zhu}，客克主，不相得为逆，其病速而甚`;
  return `${zhu}克${ke}，主克客，不相得（主胜，差缓）`;
}


export function compute(year: number): WuyunResult {
  const gzIdx = (((year - 4) % 60) + 60) % 60;
  const ganZhi = ganzhiFromIndex(gzIdx);
  const gan = ganZhi[0] as Gan;
  const zhi = ganZhi[1] as Zhi;
  const yun = YUN_BY_GAN[gan];
  const suiyun = SUYUN_FANG[gan];
  const sitianQi = SITIAN_BY_ZHI[zhi];
  const sitian = SITIAN_FANG[sitianQi];
  const zaiquanIdx = (QI_CYCLE.indexOf(sitianQi) + 3) % 6;
  const zaiquan = QI_CYCLE[zaiquanIdx];

  const steps: { title: string; lines: string[] }[] = [];

  const ganRule = { 甲: "甲己化土", 己: "甲己化土", 乙: "乙庚化金", 庚: "乙庚化金", 丙: "丙辛化水", 辛: "丙辛化水", 丁: "丁壬化木", 壬: "丁壬化木", 戊: "戊癸化火", 癸: "戊癸化火" }[gan];
  const taiRule = yun.tai ? "阳干，其运太过" : "阴干，其运不及";
  const suiyunStep = `年干${gan}：${ganRule}；${gan}为${taiRule} → ${suiyun.yun}（${suiyun.ji}）`;
  steps.push({
    title: "定岁运（大运）",
    lines: [
      `${suiyunStep}。`,
      `岁运通统全年（自本年大寒至次年大寒）。病机：${suiyun.bingji}`,
    ],
  });

  const zhuYun = yunStepLabels(yun.wx, yun.tai, false);
  const keYun = yunStepLabels(yun.wx, yun.tai, true);
  steps.push({
    title: "主运五步",
    lines: [
      "主运五步常于相生之序，太少递相生成，以岁运之太少为定盘之锚。",
      `五步：${zhuYun.map((b) => `${b.bu}${b.name}`).join(" → ")}`,
    ],
  });
  steps.push({
    title: "客运五步",
    lines: [
      "客运初运即岁运，自后逐运相生、太少递更。",
      `五步：${keYun.map((b) => `${b.bu}${b.name}`).join(" → ")}`,
    ],
  });

  const jd = JIEQI.map((jq) => ({ jq, date: jieqiDate(year, jq) ?? "" }));
  const zhuQi: QiBu[] = ZHU_QI.map((qi, k) => ({
    bu: BU_QI[k],
    qi,
    jieqi: jd[k].jq,
    qiri: jd[k].date,
  }));
  steps.push({
    title: "主气六步",
    lines: [
      "主气有常：厥阴风木→少阴君火→少阳相火→太阴湿土→阳明燥金→太阳寒水。",
      ...zhuQi.map(
        (b, k) =>
          `${b.bu} ${b.qi}：始于${b.jieqi}（${b.qiri}）` +
          (k === 5 ? `，至大寒（${jieqiDate(year + 1, "大寒") ?? ""}）` : ""),
      ),
    ],
  });

  const g = QI_CYCLE.indexOf(sitianQi);
  const keQi: QiBu[] = BU_QI.map((bu, k) => {
    const qi = QI_CYCLE[(g + k - 2 + 12) % 6];
    return { bu, qi, jieqi: zhuQi[k].jieqi, qiri: zhuQi[k].qiri, jialin: jialin(ZHU_QI[k], qi) };
  });
  steps.push({
    title: "客气六步（定司天在泉）",
    lines: [
      `年支${zhi}：${Object.entries(SITIAN_BY_ZHI).filter(([, q]) => q === sitianQi).map(([z]) => z).join("")}岁${sitianQi}司天，对冲${zaiquan}在泉。`,
      "客气相因：厥阴→少阴→太阴→少阳→阳明→太阳，司天居三之气，在泉居终之气。",
      ...keQi.map((b) => `${b.bu} ${b.qi}（${b.jieqi}）：${b.jialin}`),
    ],
  });

  const tonghua: string[] = [];
  const zaiquanWx = QI_WX[zaiquan];
  if (yun.wx === QI_WX[sitianQi]) tonghua.push(yun.tai ? "太乙天符（岁运与司天同气，太过之年）" : "天符（岁运与司天同气）");
  if (yun.wx === ZHI_WX[zhi] && !yun.tai) tonghua.push("岁会（岁运与年支方位同气，运气相平）");
  if (yun.wx === zaiquanWx && yun.tai) tonghua.push("同天符（岁运太过与在泉同气）");
  if (yun.wx === zaiquanWx && !yun.tai) tonghua.push("同岁会（岁运不及与在泉同气）");
  steps.push({
    title: "运气同化",
    lines: tonghua.length ? tonghua.map((t) => `${t}。`) : ["无天符、岁会、同天符、同岁会之同化，运气平气与否随加临而变。"],
  });

  const conclusion = [
    `${ganZhi}岁：${suiyun.yun}主全年，${sitianQi}司天主上半年（三之气正位），${zaiquan}在泉主下半年（终之气正位）。${tonghua.length ? `${tonghua.join("、")}。` : ""}`,
    `岁运病机：${suiyun.bingji}`,
    `司天在泉病机：${sitian.bingji}`,
  ];
  if (sitian.zhifa) conclusion.push(`治则：${sitian.zhifa}`);

  const fang = [
    {
      source: `三因司天方·岁干${gan}方（${suiyun.yun}）`,
      text: `${suiyun.formula.name}——${suiyun.formula.composition}。${suiyun.formula.indication}`,
    },
    {
      source: `三因司天方·${sitian.zhis}岁${sitianQi}司天方`,
      text: `${sitian.formula.name}——${sitian.formula.composition}。${sitian.formula.indication}`,
    },
  ];

  return {
    year, ganZhi, gan, zhi,
    suiyun, suiyunStep,
    zhuYun, keYun, zhuQi, keQi,
    sitianQi, zaiquan,
    sitian, tonghua, fang, steps, conclusion,
  };
}

/**
 * 纳子法：十二时辰值经（金·何若愚《子午流注针经》之十二经流注）。
 * 原穴配属系今人借用（值经取其原穴为「入穴」），非古籍原文，盘面已注。
 */
export const NAYI_HOUR: readonly {
  zhi: string;
  hours: string;
  jing: string;
  yuan: string;
}[] = [
  { zhi: "子", hours: "23–01", jing: "足少阳胆经", yuan: "丘墟" },
  { zhi: "丑", hours: "01–03", jing: "足厥阴肝经", yuan: "太冲" },
  { zhi: "寅", hours: "03–05", jing: "手太阴肺经", yuan: "太渊" },
  { zhi: "卯", hours: "05–07", jing: "手阳明大肠经", yuan: "合谷" },
  { zhi: "辰", hours: "07–09", jing: "足阳明胃经", yuan: "冲阳" },
  { zhi: "巳", hours: "09–11", jing: "足太阴脾经", yuan: "太白" },
  { zhi: "午", hours: "11–13", jing: "手少阴心经", yuan: "神门" },
  { zhi: "未", hours: "13–15", jing: "手太阳小肠经", yuan: "腕骨" },
  { zhi: "申", hours: "15–17", jing: "足太阳膀胱经", yuan: "京骨" },
  { zhi: "酉", hours: "17–19", jing: "足少阴肾经", yuan: "太溪" },
  { zhi: "戌", hours: "19–21", jing: "手厥阴心包经", yuan: "大陵" },
  { zhi: "亥", hours: "21–23", jing: "手少阳三焦经", yuan: "阳池" },
];

/** 小时（0–23，钟表）→ 时辰（子时起于前日 23 点） */
export function shichenOfHour(hour: number): (typeof NAYI_HOUR)[number] {
  return NAYI_HOUR[Math.floor(((hour + 1) % 24) / 2)];
}

/** 五运六气通用推演法（天元纪七篇大论之通行教材框架）；盘面折叠展示用 */
export const METHOD_NOTES = [
  "【总纲】运气所推者三：岁运统全年之气化，主气纪四时之常，客气纪一岁之变（司天在泉主之）。运气相加临，相得则平和，不相得则为病。所推步骤：定年干支→起岁运→主客运→主客气→客主加临→运气同化→按病机选方。",
  "",
  "一、定年干支：公元纪年换算六十甲子；岁名以立春为界——年初大寒后、立春前，气交已行新岁之步而岁名仍属上岁。",
  "二、起岁运：十干化五运——甲己化土、乙庚化金、丙辛化水、丁壬化木、戊癸化火。阳干（甲丙戊庚壬）太过，本气流行、乘其所胜；阴干（乙丁己辛癸）不及，所不胜者来乘。岁运通统全年，纪名取《素问·五常政大论》——太过曰发生、赫曦、坚成、流衍、敦阜之纪，不及曰委和、伏明、从革、涸流、卑监之纪。",
  "三、主运五步：木（角）→火（徵）→土（宫）→金（商）→水（羽）常序，每步约三十日余五刻（五步终始于大寒）。太少相生：隔位递互太少，以岁运所在宫位之太少定盘，由是上推初运、顺布五步。",
  "四、客运五步：初运即岁运，自后逐运相生、太少递更，主一岁中气之变。",
  "五、主气六步（常）：厥阴风木→少阴君火→少阳相火→太阴湿土→阳明燥金→太阳寒水；始于大寒、春分、小满、大暑、秋分、小雪，每步终前节气之交，终之气至次年大寒。交司日用当年历书节气实录，不用刻数概略。",
  "六、客气六步（变）：先以年支定司天——子午少阴君火、丑未太阴湿土、寅申少阳相火、卯酉阳明燥金、辰戌太阳寒水、巳亥厥阴风木。司天居三之气主上半年；其对冲之气为在泉，居终之气主下半年。六客以三阴三阳相因次序环布：厥阴→少阴→太阴→少阳→阳明→太阳（复环），由司天逆推得初之气，顺排四间气（司天左右间、在泉左右间）。",
  "七、客主加临：逐步合主客断顺逆——客主同气或相生为相得；客克主为逆，其病速而甚；主克客为不相得而差缓；客之相火加临主之君火，臣居君位为逆，君火临相火之位为顺。",
  "八、运气同化五判：岁运与司天同气——阴干曰天符、阳干曰太乙天符；阴干运同年支方位五行曰岁会；运太过与在泉同气曰同天符；运不及与在泉同气曰同岁会。同化之年气化偏聚，发病较专；平气（不及得司天之助等）之判从简未立。",
  "九、界与时刻：气交自该年大寒起算，六步终于次年大寒；运之五步亦周岁而成。推太乙（岁侯）不预焉。",
  "十、病机与立方：岁运病机据《气交变大论》太过不及之民病；司天在泉病机据《六元正纪大论》所至之病。立方取《三因极一病证方论》卷九：岁干十方治一岁之运，司天六方治一年之气，皆因时预调之剂，病机相合者方可用。",
].join("\n");

/**
 * 禀赋排盘：以出生日期（公历）定其落五运六气哪一步。
 * 排盘岁气以气交为界：六步自该年大寒行起，本年大寒前（含年初）生人从上一年盘；
 * 岁名干支仍以立春为准，盘面注语已载。
 */
export interface NatalInfo {
  birthDate: string; // YYYY-MM-DD
  /** 生日所落之气步（初之气…终之气） */
  bu: string;
  /** 该步起讫：节气名与交司日 */
  from: { jieqi: string; date: string };
  to: { jieqi: string; date: string };
  /** 该步主气 / 客气 / 加临断辞 */
  zhuQi: Qi6;
  keQi: Qi6;
  jialin: string;
  /** 生时值经入穴断语（纳子法）；未填时辰则无 */
  ruxue?: string;
}

export function computeNatal(
  y: number,
  m: number,
  d: number,
  hour?: number,
): NatalInfo & { result: WuyunResult } {
  const d1 = (n: number) => (n < 10 ? "0" + n : "" + n);
  const bDate = `${y}-${d1(m)}-${d1(d)}`;
  const dahan = jieqiDate(y, "大寒");
  const gzYear = dahan && bDate < dahan ? y - 1 : y;
  const result = compute(gzYear);
  // 终之气终于次年大寒；生日按 YYYY-MM-DD 字典序即日期序
  const endNext = jieqiDate(gzYear + 1, "大寒") ?? `${gzYear + 1}-01-20`;
  let idx = -1;
  result.zhuQi.forEach((b, k) => {
    const end = k < 5 ? result.zhuQi[k + 1].qiri : endNext;
    if (b.qiri && bDate >= b.qiri && bDate < end) idx = k;
  });
  if (idx < 0) throw new Error(`birthday ${bDate} does not fall in ${gzYear} 气交 range`);
  return {
    birthDate: bDate,
    bu: result.zhuQi[idx].bu,
    from: { jieqi: result.zhuQi[idx].jieqi, date: result.zhuQi[idx].qiri },
    to:
      idx < 5
        ? { jieqi: result.zhuQi[idx + 1].jieqi, date: result.zhuQi[idx + 1].qiri }
        : { jieqi: "大寒", date: endNext },
    zhuQi: result.zhuQi[idx].qi,
    keQi: result.keQi[idx].qi,
    jialin: result.keQi[idx].jialin ?? "",
    ruxue:
      hour === undefined
        ? undefined
        : (() => {
            const s = shichenOfHour(hour);
            return (
              `${s.zhi}时（${s.hours}）生，纳子法${s.jing}值时，` +
              `投穴当其原穴${s.yuan}——值经即先天受气之门，此说借针家流注，非运气本文。`
            );
          })(),
    result,
  };
}
