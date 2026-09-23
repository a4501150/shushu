import { describe, expect, it } from "vitest";
import {
  PLACES,
  equationOfTimeMinutes,
  fmtUtcOffset,
  trueSolarCorrectionMinutes,
  trueSolarOf,
} from "./solar-time";
import { fromSolar } from "./index";

const wlmq = PLACES.find((p) => p.name === "乌鲁木齐")!;
const bj = PLACES.find((p) => p.name === "北京")!;

describe("均时差", () => {
  it("2月11日前后为年内最深负值（约 −14 分）", () => {
    const v = equationOfTimeMinutes(new Date(2026, 1, 11));
    expect(v).toBeGreaterThan(-16.5);
    expect(v).toBeLessThan(-12.5);
  });

  it("11月3日前后为年内最高正值（约 +16 分）", () => {
    const v = equationOfTimeMinutes(new Date(2026, 10, 3));
    expect(v).toBeGreaterThan(14);
    expect(v).toBeLessThan(18);
  });

  it("4月中旬过零", () => {
    expect(Math.abs(equationOfTimeMinutes(new Date(2026, 3, 15)))).toBeLessThan(1.5);
  });
});

describe("真太阳时校正", () => {
  it("乌鲁木齐 9 月末：经度 −129.6 分 + 均时差约 +7 分 ≈ −122 分", () => {
    const c = trueSolarCorrectionMinutes(new Date(2026, 8, 29), wlmq);
    expect(c).toBeGreaterThanOrEqual(-126);
    expect(c).toBeLessThanOrEqual(-118);
  });

  it("北京 2 月：经度 −14.4 分，均时差 −14 分上下", () => {
    const c = trueSolarCorrectionMinutes(new Date(2026, 1, 11), bj);
    expect(c).toBeGreaterThanOrEqual(-32);
    expect(c).toBeLessThanOrEqual(-24);
  });

  it("校正跨午夜时换日、换时辰", () => {
    const { moment } = trueSolarOf(new Date(2026, 8, 24, 0, 5), wlmq);
    // 00:05 钟表 − 约 122 分 → 前一日 22:0x，亥时
    expect(moment.solar.day).toBe(23);
    expect(moment.solar.hour).toBe(22);
    expect(moment.dayGanZhi).toBe(fromSolar(2026, 9, 23, 22, 5).dayGanZhi);
  });

  it("半小时时区：新德里 UTC+5:30，标准经线 82.5°E", () => {
    const delhi = PLACES.find((p) => p.name === "新德里")!;
    // 2月：均时差约 −14 分；经度 77.2−82.5 = −5.3° → −21 分
    const c = trueSolarCorrectionMinutes(new Date(2026, 1, 11), delhi);
    expect(c).toBeGreaterThanOrEqual(-38);
    expect(c).toBeLessThanOrEqual(-32);
  });

  it("UTC 文案", () => {
    expect(fmtUtcOffset(8)).toBe("UTC+8");
    expect(fmtUtcOffset(-5)).toBe("UTC−5");
    expect(fmtUtcOffset(5.5)).toBe("UTC+5:30");
    expect(fmtUtcOffset(5.75)).toBe("UTC+5:45");
    expect(fmtUtcOffset(0)).toBe("UTC+0");
  });

  it("未选地点时刻与原钟表一致", () => {
    const { moment, correctionMinutes } = trueSolarOf(new Date(2026, 8, 24, 10, 30), null);
    expect(correctionMinutes).toBe(0);
    expect(moment.solar).toEqual({ year: 2026, month: 9, day: 24, hour: 10, minute: 30 });
  });
});
