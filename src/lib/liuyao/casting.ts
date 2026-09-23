export type YaoSum = 6 | 7 | 8 | 9;
export type CoinFace = 2 | 3; // 字(阴)=2 背(阳)=3

/** One toss of three coins, cryptographically random. */
export function tossCoins(): [CoinFace, CoinFace, CoinFace] {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ((b & 1) === 1 ? 3 : 2)) as [
    CoinFace,
    CoinFace,
    CoinFace,
  ];
}

export function coinSum(coins: readonly CoinFace[]): YaoSum {
  const sum = coins[0] + coins[1] + coins[2];
  if (sum < 6 || sum > 9) throw new Error(`Invalid coin sum: ${sum}`);
  return sum as YaoSum;
}

/** Hand-shake mode: six rounds, each settled by the user. */
export function handCasting(rounds: readonly (readonly CoinFace[])[]): YaoSum[] {
  if (rounds.length !== 6) throw new Error("hand casting needs 6 rounds");
  return rounds.map(coinSum);
}

const RANDOM_ORG_URL =
  "https://www.random.org/integers/?num=18&min=2&max=3&col=1&base=10&format=plain&rnd=new";

export class UniverseNoiseError extends Error {
  constructor(reason: string) {
    super(`宇宙噪声取数失败：${reason}，请重试或改用摇卦。`);
    this.name = "UniverseNoiseError";
  }
}

/**
 * Universe-noise mode: 18 atmospheric integers (2 or 3) from random.org,
 * grouped into six yao sums (three coins per yao, same as the Java LiuYaoUtil).
 */
export async function universeCasting(
  fetchImpl: typeof fetch = fetch,
  url: string = RANDOM_ORG_URL,
  signal?: AbortSignal
): Promise<YaoSum[]> {
  let body: string;
  try {
    const res = await fetchImpl(url, { signal });
    if (!res.ok) throw new UniverseNoiseError(`HTTP ${res.status}`);
    body = await res.text();
  } catch (e) {
    if (e instanceof UniverseNoiseError) throw e;
    if (signal?.aborted) throw e;
    throw new UniverseNoiseError("网络请求未完成");
  }
  const nums = body
    .trim()
    .split(/\s+/)
    .map((n) => Number(n));
  if (nums.length !== 18 || nums.some((n) => n !== 2 && n !== 3)) {
    throw new UniverseNoiseError("返回数据不是 18 个 2/3");
  }
  // Validated above: every element is 2 or 3, i.e. a CoinFace.
  const faces = nums as CoinFace[];
  const sums: YaoSum[] = [];
  for (let i = 0; i < 6; i++) {
    sums.push(coinSum([faces[i * 3], faces[i * 3 + 1], faces[i * 3 + 2]]));
  }
  return sums;
}
