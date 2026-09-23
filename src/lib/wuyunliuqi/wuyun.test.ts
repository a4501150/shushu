import { describe, expect, it } from "vitest";
import { compute, computeNatal, shichenOfHour } from "@/lib/wuyunliuqi";
import { formatText, formatNatalText } from "@/lib/wuyunliuqi/format";
import { QI_CYCLE } from "@/lib/wuyunliuqi";
import { SITIAN_FANG, SUYUN_FANG } from "@/lib/yi/sanyin";

/** 黄金用例：《三因方》卷九原文与各年客气初之气对照 */
describe("五运六气推演", () => {
  it("2024 甲辰：土运太过、太阳寒水司天、太阴湿土在泉、同天符", () => {
    const r = compute(2024);
    expect(r.ganZhi).toBe("甲辰");
    expect(r.suiyun.yun).toBe("土运太过");
    expect(r.sitian.formula.name).toBe("静顺汤");
    expect(r.keQi[2].qi).toBe("太阳寒水"); // 司天居三之气
    expect(r.keQi[5].qi).toBe("太阴湿土"); // 在泉居终之气
    expect(r.keQi[0].qi).toBe("少阳相火"); // 原文：初之气少阳相火加临厥阴风木
    expect(r.tonghua).toContain("同天符（岁运太过与在泉同气）");
    expect(r.fang[0].text).toContain("附子山茱萸汤");
  });

  it("2025 乙巳：金运不及、厥阴风木司天、少阳相火在泉", () => {
    const r = compute(2025);
    expect(r.ganZhi).toBe("乙巳");
    expect(r.suiyun.yun).toBe("金运不及");
    expect(r.keQi[0].qi).toBe("阳明燥金"); // 原文：初之气阳明金加厥阴木
    expect(r.keQi[1].qi).toBe("太阳寒水");
    expect(r.fang[0].text).toContain("紫菀汤");
    expect(r.fang[1].text).toContain("敷和汤");
  });

  it("2026 丙午：水运太过、少阴君火司天、阳明燥金在泉", () => {
    const r = compute(2026);
    expect(r.ganZhi).toBe("丙午");
    expect(r.suiyun.yun).toBe("水运太过");
    expect(r.suiyun.ji).toBe("流衍之纪");
    expect(r.keQi[0].qi).toBe("太阳寒水"); // 原文：初之气太阳水加厥阴木
    expect(r.keQi[5].qi).toBe("阳明燥金");
    expect(r.fang[0].text).toContain("川连茯苓汤");
    expect(r.fang[1].text).toContain("正阳汤");
    expect(formatText(r)).toContain("三因极一病证方论");
  });

  it("2027 丁未：木运不及、太阴湿土司天、太阳寒水在泉", () => {
    const r = compute(2027);
    expect(r.ganZhi).toBe("丁未");
    expect(r.suiyun.yun).toBe("木运不及");
    expect(r.keQi[0].qi).toBe("厥阴风木"); // 原文：初之气厥阴风木加风木
    expect(r.fang[1].text).toContain("备化汤");
  });

  it("2029 己酉：二之气相火加临君火，臣居君位", () => {
    const r = compute(2029);
    expect(r.keQi[1].qi).toBe("少阳相火");
    expect(r.keQi[1].jialin).toContain("臣居君位");
  });

  it("主运太少：相生序逐步递互，以岁运太少为锚", () => {
    // 太少相生：相邻两运递互太少，生岁运者当其反
    const yi = compute(2025); // 乙巳 金运不及
    expect(yi.zhuYun.map((b) => b.name)).toEqual([
      "太角（木）", "少徵（火）", "太宫（土）", "少商（金）", "太羽（水）",
    ]);
    const bing = compute(2026); // 丙午 水运太过
    expect(bing.zhuYun.map((b) => b.name)).toEqual([
      "太角（木）", "少徵（火）", "太宫（土）", "少商（金）", "太羽（水）",
    ]);
  });

  it("六十年通检：司天恒居三之气、在泉恒居终之气，十六方全覆盖", () => {
    const used = new Set<string>();
    for (let y = 1984; y <= 2043; y++) {
      const r = compute(y);
      const sitianKey = (Object.keys(SITIAN_FANG) as (keyof typeof SITIAN_FANG)[]).find(
        (q) => SITIAN_FANG[q] === r.sitian,
      );
      expect(r.keQi[2].qi).toBe(sitianKey); // 司天恒居三之气
      expect(r.keQi[5].qi).toBe(r.sitian.zaiquan);
      expect(QI_CYCLE).toContain(r.keQi[0].qi);
      used.add(r.fang[0].text.split("——")[0]);
      used.add(r.fang[1].text.split("——")[0]);
    }
    for (const f of Object.values(SUYUN_FANG)) used.has(f.formula.name) || expect.fail(`岁运方未用: ${f.formula.name}`);
    for (const f of Object.values(SITIAN_FANG)) used.has(f.formula.name) || expect.fail(`司天方未用: ${f.formula.name}`);
  });
});

describe("五运六气禀赋排盘", () => {
  it("2026-07-01 生：丙午岁三之气，客气君火临相火", () => {
    const n = computeNatal(2026, 7, 1);
    expect(n.result.ganZhi).toBe("丙午");
    expect(n.bu).toBe("三之气");
    expect(n.from.jieqi).toBe("小满");
    expect(n.to.jieqi).toBe("大暑");
    expect(n.zhuQi).toBe("少阳相火");
    expect(n.keQi).toBe("少阴君火"); // 司天正位
    expect(n.jialin).toContain("君火临相火");
    expect(formatNatalText(n.result, n)).toContain("先天禀赋");
  });

  it("2026-01-10 生：本年大寒前，从乙巳岁终之气盘", () => {
    const n = computeNatal(2026, 1, 10);
    expect(n.result.ganZhi).toBe("乙巳");
    expect(n.bu).toBe("终之气");
    expect(n.to.date).toMatch(/^2026-01/); // 终于本年大寒
    expect(n.keQi).toBe("少阳相火"); // 乙巳在泉
    expect(n.jialin).toContain("主克客"); // 寒水克相火
  });

  it("生日恰在大寒当日：归新岁初之气", () => {
    const n = computeNatal(2026, 1, 20); // 2026大寒即此日
    expect(n.result.ganZhi).toBe("丙午");
    expect(n.bu).toBe("初之气");
  });

  it("六十年凡生日皆有定步，起讫交司日齐备", () => {
    for (let y = 1984; y <= 2043; y++) {
      for (const [m, d] of [[1, 25], [3, 21], [5, 25], [7, 23], [9, 27], [11, 2]] as const) {
        const n = computeNatal(y, m, d);
        expect(n.bu).toBeTruthy();
        expect(n.from.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(n.to.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});

describe("纳子法值经", () => {
  it("23点归子时胆经，4点归寅时肺经", () => {
    expect(shichenOfHour(23).jing).toContain("胆");
    expect(shichenOfHour(0).zhi).toBe("子");
    expect(shichenOfHour(4).yuan).toBe("太渊");
  });
  it("禀赋盘填时辰则带入穴一语，不填则无", () => {
    const withHour = computeNatal(1990, 6, 15, 10);
    expect(withHour.ruxue).toContain("巳时");
    expect(withHour.ruxue).toContain("太白");
    expect(computeNatal(1990, 6, 15).ruxue).toBeUndefined();
  });
});
