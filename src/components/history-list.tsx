"use client";

import { useEffect, useState } from "react";
import { historyRepo, YI_ARTS, type SavedReading } from "@/lib/store/history";

const ART_NAMES: Record<SavedReading["art"], string> = {
  liuyao: "六爻",
  xiaoliuren: "小六壬",
  bazi: "四柱",
  ziwei: "紫微",
  qimen: "奇门",
  shanghan: "伤寒",
  jinkui: "金匮",
  wuyunliuqi: "五运",
  sanyin: "三因",
  fuxingjue: "辅行",
};


export function HistoryList({ onOpen }: { onOpen: (reading: SavedReading) => void }) {
  const [items, setItems] = useState<SavedReading[]>([]);
  const refresh = () => setItems(historyRepo.list());

  useEffect(() => {
    refresh();
    window.addEventListener("shushu:history-saved", refresh);
    return () => window.removeEventListener("shushu:history-saved", refresh);
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="history" aria-label="历史课式">
      <div className="history-head">
        <h2 className="history-title">历史</h2>
        <button
          type="button"
          className="history-clear"
          onClick={() => {
            historyRepo.clear();
            refresh();
          }}
        >
          清空
        </button>
      </div>
      <ul className="history-items">
        {items.slice(0, 10).map((r) => (
          <li key={r.id}>
            <button type="button" className="history-btn" onClick={() => onOpen(r)}>
              <span className="history-art">{ART_NAMES[r.art]}</span>
              <span className="history-q">
                {r.question || (YI_ARTS.has(r.art) ? "（医道参考）" : "（本命解读）")}
              </span>
              <time className="history-time" dateTime={r.createdAt}>
                {new Date(r.createdAt).toLocaleString("zh-CN", { hour12: false })}
              </time>
            </button>
            <button
              type="button"
              className="history-del"
              aria-label={`删除这条${ART_NAMES[r.art]}记录`}
              onClick={() => {
                historyRepo.remove(r.id);
                refresh();
              }}
            >
              删
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
