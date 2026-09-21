import type { MetadataRoute } from "next";

// Emitted as a file at build time, which the static export requires and
// the server build is happy with either way.
export const dynamic = "force-static";

/**
 * The account area has nothing a crawler should index and plenty it
 * should not fetch — every page there is behind a session and produces a
 * personal response.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/profile", "/inventory", "/wallet", "/history"],
    },
  };
}
