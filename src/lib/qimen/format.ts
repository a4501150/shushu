// 奇门盘面纯文本渲染：洛书 4-9-2 / 3-5-7 / 8-1-6 九宫格 + 事实清单头。
import { LUOSHU_ROWS } from "./constants";
import { pad } from "../textwidth";
import type { PalaceCell, QimenChart } from "./types";

const CELL_WIDTH = 16;

const CN_NUM = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"] as const;

function cellLines(cell: PalaceCell, chart: QimenChart): [string, string, string, string] {
  const god = cell.god ?? "　";
  const star = cell.starNames.length > 0 ? `${cell.starNames.join("/")} ${cell.heavenStems.join("")}` : "　";
  const door = cell.door ?? (cell.palace === 5 ? "（中宫）" : "　");
  const earth = `地 ${cell.earthStems.join("")}`;
  const head =
    cell.palace === 5
      ? `${cell.name}${chart.yang ? "阳" : "阴"}${CN_NUM[chart.ju] ?? chart.ju}局`
      : cell.name;
  return [`${god} ${head}`, star, door, earth];
}

export function formatText(chart: QimenChart): string {
  const p = chart.pillars;
  const lines: string[] = [];
  lines.push(
    `节气：${chart.jieqi}（${chart.jieqiSolarDate}交）  ${chart.yang ? "阳" : "阴"}遁${CN_NUM[chart.ju] ?? chart.ju}局（${chart.jieqi}${chart.yuan}）`,
  );
  lines.push(
    `符头：${chart.fuTou}（${chart.yuan}）  旬首：${chart.xunShou}（遁${chart.xunShouYi}）  时旬序：${chart.hourOrdinal}`,
  );
  lines.push(
    `值符：${chart.zhifuStar} 落${chart.palaces[chart.zhifuPalace - 1]?.name}  值使：${chart.zhishiDoor} 落${chart.palaces[chart.zhishiPalace - 1]?.name}`,
  );
  lines.push(`四柱：${p.year}年 ${p.month}月 ${p.day}日 ${p.time}时`);

  const byPalace = new Map(chart.palaces.map((c) => [c.palace, c]));
  const border = `+${`${"-".repeat(CELL_WIDTH)}+`.repeat(3)}`;
  for (const row of LUOSHU_ROWS) {
    lines.push(border);
    const cells = row.map((palaceId) => cellLines(byPalace.get(palaceId) as PalaceCell, chart));
    for (let li = 0; li < 4; li++) {
      lines.push(`|${cells.map((cell) => pad(cell[li], CELL_WIDTH)).join("|")}|`);
    }
  }
  lines.push(border);
  return `${lines.join("\n")}\n`;
}
