import { describe, expect, it } from "vitest";
import { BOOKS, formatPatternEntry } from "@/lib/yi";
import { SITIAN_FANG, SUYUN_FANG } from "@/lib/yi/sanyin";

/** 各书结构下限：[篇章数, 证型数, 方剂数] */
const MIN: Record<string, [number, number, number]> = {
  shanghan: [6, 20, 40],
  jinkui: [6, 20, 40],
  sanyin: [2, 15, 15],
  fuxingjue: [4, 8, 25],
};

describe("医家辨证数据", () => {
  for (const [id, book] of Object.entries(BOOKS)) {
    it(`${id}：篇目齐全、结构完整`, () => {
      const sectionIds = new Set<string>();
      const patternIds = new Set<string>();
      let patterns = 0;
      let formulas = 0;
      for (const s of book.sections) {
        expect(s.id.length, `section ${s.title} 缺 id`).toBeGreaterThan(0);
        expect(sectionIds.has(s.id), `section id 重复: ${s.id}`).toBe(false);
        sectionIds.add(s.id);
        expect(s.outline.length, `section ${s.id} 缺 outline`).toBeGreaterThan(0);
        expect(s.summary.length, `section ${s.id} 缺 summary`).toBeGreaterThan(0);
        for (const p of s.patterns) {
          expect(patternIds.has(p.id), `pattern id 重复: ${p.id}`).toBe(false);
          patternIds.add(p.id);
          expect(p.keyPoints.length).toBeGreaterThan(0);
          for (const f of p.formulas) {
            expect(f.name.length).toBeGreaterThan(0);
            expect(f.composition.length).toBeGreaterThan(0);
            expect(f.indication.length).toBeGreaterThan(0);
            formulas++;
          }
          patterns++;
        }
      }
      const [minSections, minPatterns, minFormulas] = MIN[id];
      expect(book.sections.length, `${id} 篇章过少`).toBeGreaterThanOrEqual(minSections);
      expect(patterns, `${id} 证型过少`).toBeGreaterThanOrEqual(minPatterns);
      expect(formulas, `${id} 方剂过少`).toBeGreaterThanOrEqual(minFormulas);
    });
  }

  it("三因司天方覆盖十干与六气", () => {
    expect(Object.keys(SUYUN_FANG)).toHaveLength(10);
    expect(Object.keys(SITIAN_FANG)).toHaveLength(6);
    for (const s of Object.values(SITIAN_FANG)) expect(s.zaiquan.length).toBe(4);
  });

  it("formatPatternEntry 输出完整条目", () => {
    const book = BOOKS.shanghan;
    const section = book.sections[0];
    const pattern = section.patterns.find((p) => p.formulas.length > 0)!;
    const text = formatPatternEntry(book, section, pattern);
    expect(text).toContain(pattern.name);
    expect(text).toContain(pattern.formulas[0].name);
    expect(text).toContain("参考方剂：");
  });
});
