import { describe, expect, it } from "vitest";
import {
  isChong,
  isHe,
  isJinShen,
  isJue,
  isMu,
  isTuiShen,
  xunKong,
  xunName,
} from "./dizhi";

// Ported from LiuYaoUtilTest.java (xunKong / 六冲 / 六合 / 墓 / 绝 tests).

describe("xunKong", () => {
  it("甲辰旬: 戊申日 空亡 寅卯", () => {
    expect(xunKong("戊", "申")).toEqual(["寅", "卯"]);
    expect(xunName("戊", "申")).toBe("甲辰旬");
  });

  it("甲子旬: 甲子日 空亡 戌亥", () => {
    expect(xunKong("甲", "子")).toEqual(["戌", "亥"]);
    expect(xunName("甲", "子")).toBe("甲子旬");
  });

  it("甲辰旬: 壬子日 空亡 寅卯", () => {
    expect(xunKong("壬", "子")).toEqual(["寅", "卯"]);
    expect(xunName("壬", "子")).toBe("甲辰旬");
  });

  it("甲戌旬: 甲戌日 空亡 申酉", () => {
    expect(xunKong("甲", "戌")).toEqual(["申", "酉"]);
    expect(xunName("甲", "戌")).toBe("甲戌旬");
  });

  it("甲申旬: 乙酉日 空亡 午未", () => {
    expect(xunKong("乙", "酉")).toEqual(["午", "未"]);
    expect(xunName("乙", "酉")).toBe("甲申旬");
  });

  it("甲午旬: 甲午日 空亡 辰巳", () => {
    expect(xunKong("甲", "午")).toEqual(["辰", "巳"]);
    expect(xunName("甲", "午")).toBe("甲午旬");
  });

  it("甲寅旬: 甲寅日 空亡 子丑", () => {
    expect(xunKong("甲", "寅")).toEqual(["子", "丑"]);
    expect(xunName("甲", "寅")).toBe("甲寅旬");
  });
});

describe("dongBian 墓/绝", () => {
  it("化墓", () => {
    expect(isMu("木", "未")).toBe(true);
    expect(isMu("火", "戌")).toBe(true);
    expect(isMu("土", "戌")).toBe(true);
    expect(isMu("金", "丑")).toBe(true);
    expect(isMu("水", "辰")).toBe(true);
    expect(isMu("木", "辰")).toBe(false);
  });

  it("化绝", () => {
    expect(isJue("木", "申")).toBe(true);
    expect(isJue("火", "亥")).toBe(true);
    expect(isJue("土", "亥")).toBe(true);
    expect(isJue("金", "寅")).toBe(true);
    expect(isJue("水", "巳")).toBe(true);
    expect(isJue("木", "未")).toBe(false);
  });
});

describe("进退神", () => {
  it("port of testDongBian_HuaJinShen utility assertions", () => {
    expect(isJinShen("寅", "卯")).toBe(true);
    expect(isJinShen("巳", "午")).toBe(true);
    expect(isJinShen("申", "酉")).toBe(true);
    expect(isJinShen("亥", "子")).toBe(true);
    expect(isJinShen("丑", "辰")).toBe(true);
    expect(isJinShen("辰", "未")).toBe(true);
    expect(isJinShen("未", "戌")).toBe(true);
    expect(isJinShen("戌", "丑")).toBe(true); // 增删卜易 土进神

    expect(isTuiShen("卯", "寅")).toBe(true);
    expect(isTuiShen("午", "巳")).toBe(true);
    expect(isTuiShen("酉", "申")).toBe(true);
    expect(isTuiShen("子", "亥")).toBe(true);
    expect(isTuiShen("辰", "丑")).toBe(true);
    expect(isTuiShen("未", "辰")).toBe(true);
    expect(isTuiShen("戌", "未")).toBe(true);
    expect(isTuiShen("丑", "戌")).toBe(true); // 增删卜易 土退神

    expect(isJinShen("子", "丑")).toBe(false);
    expect(isTuiShen("寅", "卯")).toBe(false);
  });
});

describe("六冲", () => {
  it("port of testLiuChong", () => {
    expect(isChong("子", "午")).toBe(true);
    expect(isChong("午", "子")).toBe(true);
    expect(isChong("丑", "未")).toBe(true);
    expect(isChong("寅", "申")).toBe(true);
    expect(isChong("卯", "酉")).toBe(true);
    expect(isChong("辰", "戌")).toBe(true);
    expect(isChong("巳", "亥")).toBe(true);
    expect(isChong("子", "丑")).toBe(false);
    expect(isChong("寅", "卯")).toBe(false);
  });
});

describe("六合", () => {
  it("port of testLiuHe", () => {
    expect(isHe("子", "丑")).toBe(true);
    expect(isHe("丑", "子")).toBe(true);
    expect(isHe("寅", "亥")).toBe(true);
    expect(isHe("卯", "戌")).toBe(true);
    expect(isHe("辰", "酉")).toBe(true);
    expect(isHe("巳", "申")).toBe(true);
    expect(isHe("午", "未")).toBe(true);
    expect(isHe("子", "午")).toBe(false);
    expect(isHe("寅", "卯")).toBe(false);
  });
});
