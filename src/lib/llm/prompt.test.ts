import { describe, expect, it } from "vitest";
import { buildLlmPrompt } from "./prompt";

describe("buildLlmPrompt", () => {
  it("占卜类：问题 + 排盘 + 断语指令", () => {
    const p = buildLlmPrompt({ art: "liuyao", question: "去不去", boardText: "BOARD" });
    expect(p).toContain("【求测问题】去不去");
    expect(p).toContain("【排盘】\nBOARD");
    expect(p).toContain("卜筮正宗");
    expect(p).not.toContain("【占问时点】");
  });

  it("命盘类本命解读：无问题时不出现断语指令，论一生", () => {
    const p = buildLlmPrompt({ art: "bazi", boardText: "BOARD" });
    expect(p).toContain("（无——本命解读）");
    expect(p).toContain("一生倾向");
    expect(p).not.toContain("应期");
  });

  it("命盘类流年占问：本命为体、岁运为用，附占问时点", () => {
    const p = buildLlmPrompt({
      art: "bazi",
      question: "今年能升职吗",
      boardText: "BOARD",
      readingTime: "公历 2026-09-24 10:00 · 流年丙午 流月丁酉 流日甲子 流时己巳",
    });
    expect(p).toContain("【求测问题】今年能升职吗");
    expect(p).toContain("【占问时点】公历 2026-09-24 10:00 · 流年丙午");
    expect(p).toContain("一生倾向"); // 本命部分保留
    expect(p).toContain("吉凶与应期"); // 岁运层
    // 本命盘先排，动态岁运在后
    expect(p.indexOf("【排盘】")).toBeLessThan(p.indexOf("【占问时点】"));
  });

  it("紫微本命/占问同理", () => {
    expect(buildLlmPrompt({ art: "ziwei", boardText: "B" })).toContain("命宫身宫");
    const p = buildLlmPrompt({ art: "ziwei", question: "何年成家", boardText: "B", readingTime: "T" });
    expect(p).toContain("【占问时点】T");
    expect(p).toContain("本命盘为体");
  });
});
