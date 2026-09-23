import { YI_ARTS, type ArtKind } from "@/lib/store/history";

/** 医类共用模板：ask 带求测问题，plain 无问题（求方求辨）。 */
function medicalPair(bookDesc: string): { ask: string; plain: string } {
  return {
    ask:
      `所给为${bookDesc}与参考方剂。请对照【求测问题】所述情况，` +
      "判断是否属此证型、所处方剂是否对证、如何加减化裁，并提示禁忌与何时应就医。",
    plain:
      `所给为${bookDesc}的一条条目。请先解释其病机与辨证眼目，` +
      "再逐方说明方义；若我另有自述症状，请判断是否吻合此证，可否以此方加减，并提示禁忌与就医必要。",
  };
}

const SHANGHAN = medicalPair("《伤寒论》六经辨证的一条证型");
const JINKUI = medicalPair("《金匮要略》的一篇病证辨治");
const SANYIN = medicalPair("《三因极一病证方论》的一条运气病证治方");
const FUXINGJUE = medicalPair("《辅行诀脏腑用药法要》的一条脏腑补泻方治");
const WUYUN = medicalPair("一年五运六气推演（岁运、主客运、主客气、司天在泉、客主加临、运气同化，附三因司天方）");

/** 占卜类：对具体事件的断语指令（问题必填）；医类：条目对问辨析。 */
const INSTRUCTIONS: Partial<Record<ArtKind, string>> = {
  liuyao:
    "解一下卦。首先抛开问题解释一下卦象，逐字解释本卦卦辞以及动爻爻辞；" +
    "上盘为按卜筮正宗排出的完整纳甲、六亲、六神、世应、旬空、月建日辰及伏神，" +
    "请结合各爻旺衰、日月动变生克，对【求测问题】给出确切的答案。",
  xiaoliuren:
    "所给为小六壬起课结果（农历月日与时辰落宫）。请先解释该六神的本诀与类象，" +
    "再结合所问之事给出确切的答案。",
  qimen:
    "所给为时家奇门排盘（局数、天盘九星、八门、八神、三奇六仪）。请先定用神，" +
    "再据用神所落宫位的星门神仪与天地盘生克，对【求测问题】给出明确的判断。",
  shanghan: SHANGHAN.ask,
  jinkui: JINKUI.ask,
  sanyin: SANYIN.ask,
  fuxingjue: FUXINGJUE.ask,
  wuyunliuqi:
    "所给为某年五运六气推演与三因司天方。请对照【求测问题】，" +
    "分析当年气化对该问题所述病证的影响、所附方剂是否宜用，并给出调养宜忌。",
};

/** 命盘类与医类：问题可不填的默认指令。 */
const LIFE_READING: Partial<Record<ArtKind, string>> = {
  bazi:
    "所给为四柱八字排盘（含干支、藏干、十神、纳音、大运）。请先分析日主旺衰与格局用神，" +
    "再论性格、事业、财帛、婚缘、健康的一生倾向，并给出大运宜忌。",
  ziwei:
    "所给为紫微斗数命盘（十二宫、主星、生年四化、主要辅星）。请先解释命宫身宫与各宫主星组合，" +
    "再结合生年四化，论十二宫一生倾向。",
  shanghan: SHANGHAN.plain,
  jinkui: JINKUI.plain,
  sanyin: SANYIN.plain,
  fuxingjue: FUXINGJUE.plain,
  wuyunliuqi:
    "所给为某年五运六气推演（岁运、主客运、主客气、司天在泉、客主加临、运气同化，附三因司天方）" +
    "或五运六气禀赋盘（含生日所落气步与先天禀赋断语）。" +
    "请先总论该年气化与致病倾向，再评述所附方剂是否对证；禀赋盘请据先天禀赋论体质、易感病证与调养宜忌；" +
    "若我另有自述症状，请结合运气判断宜忌。",
};

/** 命盘类带具体占问时追加：本命为体、岁运为用。 */
const YEARLY_ADDON =
  "以上本命部分必须先完整解读。再以本命盘为体、所给时点的流年流月（及盘面所载大运/大限）为用，" +
  "判断此事在该时点的吉凶与应期。";

export interface LlmPromptInput {
  art: ArtKind;
  /** 占卜类必填；命盘类（八字/紫微）留空即本命解读 */
  question?: string;
  /** plain-text board, same string the copy button shows */
  boardText: string;
  /** raw casting data: coin sums / timestamp / lunar inputs */
  artifacts?: string;
  /** 流年占问的时点说明行（八字/紫微带问题时附带） */
  readingTime?: string;
}

export function buildLlmPrompt(input: LlmPromptInput): string {
  const parts = [
    input.question
      ? `【求测问题】${input.question}`
      : YI_ARTS.has(input.art)
        ? "【求测问题】（无——医道参考条目）"
        : "【求测问题】（无——本命解读）",
  ];
  if (input.artifacts) parts.push(`【起卦原始数据】${input.artifacts}`);
  const life = LIFE_READING[input.art];
  const instruction = input.question
    ? (INSTRUCTIONS[input.art] ?? `${life}\n\n${YEARLY_ADDON}`)
    : life;
  if (instruction === undefined) throw new Error(`no prompt instruction for art: ${input.art}`);
  // 本命盘先排，动态岁运在后
  parts.push(`【排盘】\n${input.boardText}`);
  if (input.readingTime) parts.push(`【占问时点】${input.readingTime}`);
  parts.push(instruction);
  return parts.join("\n\n");
}
