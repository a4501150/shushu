// Ported from LiuYaoUtilTest.java testPalaceTableCompleteness.
import { describe, expect, it } from "vitest";
import {
  BRANCH_WU_XING,
  GUA64,
  HEXAGRAM_PALACE,
  INNER_NA_JIA,
  OUTER_NA_JIA,
  SHI_YING,
} from "./tables";

describe("表条目数", () => {
  it("matches the Java reference", () => {
    expect(GUA64.size).toBe(64);
    expect(HEXAGRAM_PALACE.size).toBe(64);
    expect(INNER_NA_JIA.size).toBe(8);
    expect(OUTER_NA_JIA.size).toBe(8);
    expect(BRANCH_WU_XING.size).toBe(12);
    expect(SHI_YING).toHaveLength(8);
  });
});

describe("八宫表完整性", () => {
  it("HEXAGRAM_PALACE covers all 64 hexagrams", () => {
    expect(HEXAGRAM_PALACE.size).toBe(64);
    for (const [key, name] of GUA64) {
      expect(
        HEXAGRAM_PALACE.get(key),
        `Missing palace entry for ${key} (${name})`,
      ).toBeDefined();
    }
  });
});
