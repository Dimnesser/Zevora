import type { MetadataRoute } from "next";

// Emitted as a file at build time, which the static export requires and
// the server build is happy with either way.
export const dynamic = "force-static";
import catalogue from "@/lib/server/cases.json";

const BASE = process.env.ZEVORA_SITE_URL ?? "https://zevora.example";

/**
 * Public pages only, and every case — the catalogue is the part of the
 * site worth finding. Account pages are excluded for the same reason
 * robots.txt disallows them.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = ["", "/cases", "/contracts", "/upgrade", "/shop", "/leaderboard", "/partners", "/fair", "/terms", "/support"];

  return [
    ...pages.map((path) => ({
      url: `${BASE}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...(catalogue as { slug: string }[]).map(({ slug }) => ({
      url: `${BASE}/cases/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
