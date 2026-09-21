/** @type {import('next').NextConfig} */

/**
 * Two builds come out of this file.
 *
 * The default one is the real application: server components, API routes,
 * SQLite behind them. `ZEVORA_STATIC=1` produces the other — a fully
 * static export for GitHub Pages, where the same interface runs against
 * an in-browser backend (`lib/client/demo/`). Pages serves files, not
 * processes, so the export carries no API routes; `scripts/build-static.mjs`
 * moves them aside for the duration of the build.
 */
const STATIC = process.env.ZEVORA_STATIC === "1";
const BASE_PATH = process.env.ZEVORA_BASE_PATH ?? "";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // better-sqlite3 is a native addon; it must stay external to the bundle.
  serverExternalPackages: ["better-sqlite3"],

  ...(STATIC
    ? {
        output: "export",
        // Pages serves the site from /<repo>/, so every asset and route
        // needs the prefix baked in at build time.
        basePath: BASE_PATH,
        // Pages has no image optimiser behind it.
        images: { unoptimized: true },
        // Directory-style URLs, so /cases/foo resolves to foo/index.html
        // without any server-side rewriting.
        trailingSlash: true,
        env: {
          NEXT_PUBLIC_ZEVORA_STATIC: "1",
          NEXT_PUBLIC_ZEVORA_BASE_PATH: BASE_PATH,
        },
      }
    : {
        images: {
          // Steam's CDN hosts the real CS2 skin artwork.
          remotePatterns: [
            { protocol: "https", hostname: "community.cloudflare.steamstatic.com" },
            { protocol: "https", hostname: "community.akamai.steamstatic.com" },
            { protocol: "https", hostname: "steamcommunity-a.akamaihd.net" },
            { protocol: "https", hostname: "raw.githubusercontent.com" },
          ],
        },
      }),
};

export default nextConfig;
