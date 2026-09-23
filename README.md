# 数术 (shushu)

起卦排盘 web app：六爻（手摇 / 随机噪声起卦）、小六壬、八字四柱、紫微斗数、奇门遁甲。
所有算法为确定性计算，全部在浏览器内完成；解卦交给用户或 LLM——排盘结果一键复制为提示文本。

## Run

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm test           # vitest
pnpm build && pnpm start

# static export (GitHub Pages):
pnpm build:static   # → out/
```

## Layout

- `src/lib/liuyao` — 六爻纳甲 engine (ported 1:1 from the verified Java reference
  in ~/src/liuren, golden-tested against `__fixtures__/liuyao-golden.txt`),
  plus a 增删卜易-style 旺衰 layer (`wang-shuai.ts`, TS-only).
- `src/lib/calendar` — single seam over lunar-javascript (晚子时 day convention).
- `src/lib/store` — HistoryRepo interface, localStorage implementation (backend seam).
- `src/lib/api` — ApiClient interface, no-op implementation (auth/sync seam).
- `src/lib/llm` — builds the copy-paste 解卦 prompt string.

When a backend lands, drop `output: export` from next.config.ts and add route handlers.
