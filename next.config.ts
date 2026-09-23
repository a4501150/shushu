import type { NextConfig } from "next";

// BUILD_STATIC=1 → fully static export (GitHub Pages); the app is 100%
// client-computed, so no server features are used yet. When a backend lands,
// drop the export and add route handlers.
const staticExport = process.env.BUILD_STATIC === "1";

const nextConfig: NextConfig = {
  output: staticExport ? "export" : undefined,
  images: { unoptimized: staticExport },
  // GitHub Pages project site: the export is served under /shushu/.
  basePath: staticExport ? "/shushu" : undefined,
  // *.api.ts routes exist only when the Next server runs: excluding the
  // extension at build time keeps `output: export` from seeing them.
  pageExtensions: staticExport ? ["ts", "tsx"] : ["ts", "tsx", "api.ts"],
  env: { NEXT_PUBLIC_STATIC: staticExport ? "1" : "" },
};

export default nextConfig;
