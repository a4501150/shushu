"use client";

import { useEffect, useState } from "react";
import { BOOKS, formatPatternEntry, type YiBook } from "@/lib/yi";

interface YiGuideProps {
  bookId: "shanghan" | "jinkui" | "sanyin" | "fuxingjue";
  /** 选中某证型条目：纯文本 + 来源行，交回 Wizard 存历史并展示 */
  onPick: (entryText: string, artifacts: string) => void;
  /** 按方剂名定位并展开该条目（五运六气盘面跳转用） */
  focusFormula?: string;
}

function findFocus(book: YiBook, formula: string) {
  for (const s of book.sections) {
    for (const p of s.patterns) {
      if (p.formulas.some((f) => formula.includes(f.name) || f.name.includes(formula))) {
        return { sectionId: s.id, patternId: p.id };
      }
    }
  }
  return null;
}

/** 医家辨证目录：篇（经）折叠 → 总纲 → 分支证型折叠 → 参考方剂。 */
export function YiGuide({ bookId, onPick, focusFormula }: YiGuideProps) {
  const book: YiBook = BOOKS[bookId];
  // 初始展开链即定，之后用户自行开合（非受控 details）
  const [focus] = useState(() =>
    focusFormula ? findFocus(book, focusFormula) : null,
  );
  useEffect(() => {
    if (focus) {
      document
        .getElementById(`yi-${focus.patternId}`)
        ?.scrollIntoView({ block: "center" });
    }
  }, [focus]);
  return (
    <section className="yibook" aria-label={book.title}>
      <p className="yibook-intro">{book.intro}</p>
      {book.sections.map((s) => (
        <details key={s.id} className="yisection" open={focus?.sectionId === s.id}>
          <summary>
            <span className="yisection-title">{s.title}</span>
            <span className="yisection-summary">{s.summary}</span>
          </summary>
          <pre className="yi-outline">{s.outline}</pre>
          {s.patterns.length === 0 && (
            <p className="yi-empty">本篇为总论/杂篇，仅存篇旨。</p>
          )}
          {s.patterns.map((p) => (
            <details
              key={p.id}
              id={`yi-${p.id}`}
              className="yipattern"
              open={focus?.patternId === p.id}
            >
              <summary>
                <span className="yipattern-name">{p.name}</span>
                {p.treatment && <span className="yipattern-treat">{p.treatment}</span>}
              </summary>
              <p className="yi-keypoints">{p.keyPoints}</p>
              {p.analysis && <p className="yi-analysis">{p.analysis}</p>}
              {p.formulas.length > 0 && (
                <ul className="yiformulas">
                  {p.formulas.map((f) => (
                    <li key={f.name} className="yiformula">
                      <span className="yiformula-name">{f.name}</span>
                      <span className="yiformula-comp">{f.composition}</span>
                      <span className="yiformula-ind">{f.indication}</span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="btn-quiet yi-save"
                onClick={() =>
                  onPick(
                    formatPatternEntry(book, s, p),
                    `医道参考 · ${book.title} · ${s.title} · ${p.name}`,
                  )
                }
              >
                存此证参考
              </button>
            </details>
          ))}
        </details>
      ))}
    </section>
  );
}
