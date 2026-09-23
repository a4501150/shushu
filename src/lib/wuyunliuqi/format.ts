import type { NatalInfo, WuyunResult } from "@/lib/wuyunliuqi";
import { CN_NUM } from "@/lib/textwidth";

function stepsAndFang(r: WuyunResult): string[] {
  const out: string[] = [];
  r.steps.forEach((s, i) => {
    out.push(`【第${CN_NUM[i]}步 · ${s.title}】`);
    s.lines.forEach((l) => out.push(`  ${l}`));
    out.push("");
  });
  return out;
}

function conclusion(r: WuyunResult): string[] {
  const out = ["【推导结论】"];
  r.conclusion.forEach((l) => out.push(`  ${l}`));
  out.push("");
  return out;
}

function fangSection(r: WuyunResult): string[] {
  const out = ["【三因极一病证方论·对应方剂】"];
  r.fang.forEach((f) => {
    out.push(`  ◈ ${f.source}`);
    out.push(`    ${f.text}`);
  });
  out.push("");
  out.push("  注：气交自该年大寒起算；年初大寒至立春之间年名未换，干支以立春为准。");
  return out;
}

/** 排成进入盘面/历史的纯文本板。 */
export function formatText(r: WuyunResult): string {
  return [
    `${r.year}年 ${r.ganZhi}岁　五运六气推演`,
    "",
    ...stepsAndFang(r),
    ...conclusion(r),
    ...fangSection(r),
  ].join("\n");
}

/** 禀赋盘：生日所落气步 + 该年推演 + 先天禀赋断语。 */
export function formatNatalText(r: WuyunResult, n: NatalInfo): string {
  return [
    `${n.birthDate} 生人 · ${r.year}年 ${r.ganZhi}岁　五运六气禀赋`,
    "",
    "【生日运气定位】",
    `  生于${r.ganZhi}岁${n.bu}：${n.from.jieqi}（${n.from.date}）交司，至${n.to.jieqi}（${n.to.date}）。`,
    `  该步主气${n.zhuQi}、客气${n.keQi}，加临：${n.jialin}。`,
    ...(n.ruxue ? [`  ${n.ruxue}`] : []),
    "",
    ...stepsAndFang(r),
    "【先天禀赋】",
    `  禀${r.suiyun.yun}之运而生（${r.suiyun.ji}）——岁运病机即禀赋之偏：${r.suiyun.bingji}`,
    `  司天${r.sitianQi}主半岁、在泉${r.zaiquan}主半岁，生时${n.bu}内客主${n.jialin}，幼岁易感即在此数。`,
    "",
    ...conclusion(r),
    ...fangSection(r),
  ].join("\n");
}
