/**
 * 医家辨证参考书的数据模型。伤寒六经、金匮要略共用一套结构：
 * 书 → 篇章（伤寒=一经，金匮=一病篇）→ 分支证型 → 参考方剂。
 */

export interface Formula {
  /** 方剂名，如「桂枝汤」 */
  name: string;
  /** 药物组成（教材通说剂量可省，写药味与关键炮制） */
  composition: string;
  /** 主治/运用要点，一到两句 */
  indication: string;
}

export interface Pattern {
  /** 全书内唯一，如「太阳中风表虚」 */
  id: string;
  /** 证型名，如「中风表虚证」 */
  name: string;
  /** 辨证要点：主症、兼症、舌脉 */
  keyPoints: string;
  /** 病机简析，可省 */
  analysis?: string;
  /** 参考方剂；只给治法的证型可为空数组 */
  formulas: Formula[];
  /** 治法（有方剂时也建议写，如「解肌发表，调和营卫」） */
  treatment?: string;
}

export interface Section {
  /** 全书内唯一，如「太阳病篇」→「taiyang」 */
  id: string;
  /** 篇题，如「太阳病篇」「痓湿暍病脉证治第二」 */
  title: string;
  /** 辨证总纲：提纲原文 + 释义，多段用 \n\n 分隔 */
  outline: string;
  /** 总纲一行摘要（目录折叠态展示） */
  summary: string;
  patterns: Pattern[];
}

export interface YiBook {
  id: "shanghan" | "jinkui" | "sanyin" | "fuxingjue";
  title: string;
  /** 一句话书目简介 */
  intro: string;
  sections: Section[];
}
