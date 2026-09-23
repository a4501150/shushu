// Golden tests: byte-for-byte equality against output captured from the
// verified Java reference engine (PaiPan.formatRaw / PaiPan.format).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { format, formatRaw } from "./format";
import { compute } from "./panel";
import type { PanResult } from "./types";

interface GoldenCase {
  id: string;
  sums: readonly number[];
  dayGan: string;
  dayBranch?: string;
  monthBranch?: string;
}

const CASES: readonly GoldenCase[] = [
  { id: "guai-no-daymonth", sums: [7, 7, 7, 7, 7, 8], dayGan: "甲" },
  {
    id: "guai-daymonth",
    sums: [7, 7, 7, 7, 7, 8],
    dayGan: "戊",
    dayBranch: "申",
    monthBranch: "午",
  },
  { id: "dui-zhi-kun", sums: [9, 7, 8, 7, 7, 8], dayGan: "丙" },
  {
    id: "qian-zhi-kun",
    sums: [9, 9, 9, 9, 9, 9],
    dayGan: "戊",
    dayBranch: "申",
    monthBranch: "午",
  },
  {
    id: "mixed",
    sums: [8, 6, 7, 7, 7, 9],
    dayGan: "壬",
    dayBranch: "午",
    monthBranch: "寅",
  },
];

interface GoldenBlock {
  raw: string;
  board: string;
}

function parseFixtures(text: string): Map<string, GoldenBlock> {
  const lines = text.split("\n");
  const blocks = new Map<string, GoldenBlock>();
  let i = 0;
  while (i < lines.length) {
    // A trailing newline at EOF leaves one empty final line; ignore it.
    if (i === lines.length - 1 && lines[i] === "") break;
    const m = /^===GOLDEN (.+)$/.exec(lines[i]);
    if (m === null) {
      throw new Error(`Expected ===GOLDEN header at line ${i + 1}`);
    }
    const id = m[1];
    i++;
    const rawLines: string[] = [];
    while (lines[i] !== "---BOARD---") {
      if (i >= lines.length) throw new Error(`Unterminated block ${id}`);
      rawLines.push(lines[i]);
      i++;
    }
    i++; // skip ---BOARD---
    const boardLines: string[] = [];
    while (lines[i] !== "===END") {
      if (i >= lines.length) throw new Error(`Unterminated block ${id}`);
      boardLines.push(lines[i]);
      i++;
    }
    i++; // skip ===END
    // The Java generator used print(formatRaw) / print(format) followed by
    // println of the boundary lines, so each section ends with exactly \n.
    blocks.set(id, {
      raw: rawLines.join("\n") + "\n",
      board: boardLines.join("\n") + "\n",
    });
  }
  return blocks;
}

const fixtureText = readFileSync(
  new URL("./__fixtures__/liuyao-golden.txt", import.meta.url),
  "utf8",
);
const fixtures = parseFixtures(fixtureText);

function runCase(c: GoldenCase): PanResult {
  return c.dayBranch === undefined
    ? compute(c.sums, c.dayGan)
    : compute(c.sums, c.dayGan, c.dayBranch, c.monthBranch);
}

describe("golden fixtures", () => {
  it("fixture contains exactly the expected blocks", () => {
    expect([...fixtures.keys()].sort()).toEqual(
      CASES.map((c) => c.id).sort(),
    );
  });

  for (const c of CASES) {
    it(`${c.id}: formatRaw matches Java byte-for-byte`, () => {
      expect(formatRaw(c.sums, runCase(c))).toBe(fixtures.get(c.id)?.raw);
    });

    it(`${c.id}: format matches Java byte-for-byte`, () => {
      expect(format(runCase(c))).toBe(fixtures.get(c.id)?.board);
    });
  }
});
