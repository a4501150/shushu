/**
 * 医家书目注册：伤寒六经 / 金匮要略 / 三因极一病证方论。UI 只依赖此模块。
 */

import { SHANGHAN } from "@/lib/yi/shanghan";
import { JINKUI } from "@/lib/yi/jinkui";
import { SITIAN_FANG, SUYUN_FANG, type Qi6 } from "@/lib/yi/sanyin";
import { FUXINGJUE } from "@/lib/yi/fuxingjue";
import { GAN, type Gan } from "@/lib/ganzhi";
import type { Pattern, Section, YiBook } from "@/lib/yi/types";

export type { Formula, Pattern, Section, YiBook } from "@/lib/yi/types";

/** 三因司天方由映射表组装成目录：总论一节 + 五运十方 + 六气六司天方。 */
const SANYIN: YiBook = {
  id: "sanyin",
  title: "《三因极一病证方论》运气病证方",
  intro: "宋·陈言《三因极一病证方论》卷九：五运六气时行民病证治一十六方（岁干十方、司天六方）。",
  sections: [
    {
      id: "sanyin-zonggang",
      title: "三因大纲",
      summary: "以内因、外因、不内外因立论；卷九五运六气病证治，先岁运后六气。",
      outline:
        "陈言以病因三分立论：外因，六淫疫疠之气，中于经络而内传；内因，七情动郁，先伤其脏而后见于外；" +
        "不内外因，饮食房帷、金刃仆坠，既非表里所受。治疾必先求因，因既殊途，证治随异，而要不越阴阳表里虚实之极，故名三因极一。\n\n" +
        "卷九「五运时气民病证治」「六气时行民病证治」：岁运通治一岁——太过则本气流行、乘其所胜，" +
        "不及则所不胜者来乘，故岁干十方各随其运预调所伤之脏；六气循三阴三阳之序，司天主上半年、在泉主下半年，" +
        "其治一取「高者抑之，下者举之，温者清之，清者温之」之旨。此十六方乃因时预调之剂，病机相合者方可用之。",
      patterns: [],
    },
    {
      id: "sanyin-suyun",
      title: "五运·岁运致病十方",
      summary: "十干化运，太过不及各一主方，先议岁运病机、次列出方。",
      outline:
        "十干化运：甲己土、乙庚金、丙辛水、丁壬木、戊癸火；阳干太过、阴干不及。" +
        "岁运通统全年（自大寒至次年大寒），或本气流行乘所胜，或虚邪来乘，所伤之脏即其病机。" +
        "十方逐干列于下，皆《三因方》原书组成。",
      patterns: (GAN as readonly Gan[]).map((g) => {
        const s = SUYUN_FANG[g];
        return {
          id: `sanyin-${g}`,
          name: `${g}年 · ${s.yun}（${s.ji}）`,
          keyPoints: s.bingji,
          formulas: [s.formula],
        } satisfies Pattern;
      }),
    },
    {
      id: "sanyin-sitian",
      title: "六气·司天在泉六方",
      summary: "司天居三之气主上半年，在泉居终之气主下半年；病机治法与主方。",
      outline:
        "六气循三阴三阳之序：厥阴、少阴、太阴、少阳、阳明、太阳。" +
        "子午少阴君火、丑未太阴湿土、寅申少阳相火、卯酉阳明燥金、辰戌太阳寒水、巳亥厥阴风木司天；" +
        "在泉即司天之对冲。六方各附治法，随六气时节加减。",
      patterns: Object.entries(SITIAN_FANG).map(([qi, s]) => ({
        id: `sanyin-${qi.slice(0, 2)}`,
        name: `${s.zhis}岁 · ${qi as Qi6}司天（${s.zaiquan}在泉）`,
        keyPoints: s.bingji,
        treatment: s.zhifa,
        formulas: [s.formula],
      }) satisfies Pattern),
    },
  ],
};

export const BOOKS: Record<"shanghan" | "jinkui" | "sanyin" | "fuxingjue", YiBook> = {
  shanghan: SHANGHAN,
  jinkui: JINKUI,
  sanyin: SANYIN,
  fuxingjue: FUXINGJUE,
};

/** 存入历史 / 复制给 AI 的纯文本辨证条目。 */
export function formatPatternEntry(book: YiBook, section: Section, pattern: Pattern): string {
  const lines = [
    `《${book.title.replace(/[（(].*$/, "")}》${section.title} · ${pattern.name}`,
    "",
    pattern.treatment ? `治法：${pattern.treatment}` : null,
    `辨证要点：${pattern.keyPoints}`,
    pattern.analysis ? `病机简析：${pattern.analysis}` : null,
  ].filter((l): l is string => l !== null);
  if (pattern.formulas.length > 0) {
    lines.push("", "参考方剂：");
    for (const f of pattern.formulas) {
      lines.push(`- ${f.name}：${f.composition}。${f.indication}`);
    }
  }
  return lines.join("\n");
}
