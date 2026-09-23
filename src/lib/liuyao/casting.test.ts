import { describe, expect, it } from "vitest";
import { coinSum, handCasting, tossCoins, universeCasting, UniverseNoiseError } from "./casting";

describe("tossCoins / coinSum", () => {
  it("produces faces in {2,3} and sums in 6..9", () => {
    for (let i = 0; i < 50; i++) {
      const coins = tossCoins();
      for (const c of coins) expect(c === 2 || c === 3).toBe(true);
      const s = coinSum(coins);
      expect(s >= 6 && s <= 9).toBe(true);
    }
  });
});

describe("handCasting", () => {
  it("sums six rounds", () => {
    const rounds = [
      [3, 3, 3],
      [2, 2, 2],
      [3, 2, 2],
      [2, 3, 3],
      [3, 3, 2],
      [2, 2, 3],
    ] as const;
    expect(handCasting(rounds)).toEqual([9, 6, 7, 8, 8, 7]);
  });
  it("rejects wrong round count", () => {
    expect(() => handCasting([[3, 3, 3]])).toThrow(/6 rounds/);
  });
});

describe("universeCasting", () => {
  const fakeFetch =
    (body: string, ok = true, status = 200) =>
    async () =>
      ({ ok, status, text: async () => body }) as Response;

  it("groups 18 ints into six sums", async () => {
    const sums = await universeCasting(
      fakeFetch("3\n3\n3\n2\n2\n2\n3\n2\n2\n2\n3\n3\n3\n3\n2\n2\n2\n3\n")
    );
    expect(sums).toEqual([9, 6, 7, 8, 8, 7]);
  });
  it("fails on short payload", async () => {
    await expect(universeCasting(fakeFetch("3\n3\n3"))).rejects.toBeInstanceOf(
      UniverseNoiseError
    );
  });
  it("fails on out-of-range values", async () => {
    const body = "7\n".repeat(18);
    await expect(universeCasting(fakeFetch(body))).rejects.toBeInstanceOf(UniverseNoiseError);
  });
  it("fails on http error", async () => {
    await expect(universeCasting(fakeFetch("", false, 503))).rejects.toThrow(/HTTP 503/);
  });
  it("fails on network error", async () => {
    await expect(
      universeCasting(async () => {
        throw new Error("boom");
      })
    ).rejects.toBeInstanceOf(UniverseNoiseError);
  });
});
