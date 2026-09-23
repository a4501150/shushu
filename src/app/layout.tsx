import type { Metadata, Viewport } from "next";
import { Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const notoSerifSc = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-noto-serif-sc",
  display: "swap",
});

export const metadata: Metadata = {
  title: "道家五术 — 山医命相卜",
  description:
    "山医命相卜：四柱八字、紫微斗数本命排盘；六爻、小六壬、奇门遁甲起卦占断；" +
    "伤寒金匮辨证参考、五运六气推演与先天禀赋：一键复制给 AI 解盘。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={notoSerifSc.variable}>{children}</body>
    </html>
  );
}
