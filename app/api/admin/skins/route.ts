import { bootstrap } from "@/lib/server/bootstrap";
import { getDb } from "@/lib/server/db";
import { handler, ok, requireOwner } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Skin picker for the admin case editor. */
export const GET = handler(async (req: Request) => {
  bootstrap();
  await requireOwner();

  const url = new URL(req.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const rarity = url.searchParams.get("rarity") ?? "";

  const where: string[] = [];
  const params: unknown[] = [];
  if (query) {
    where.push("s.market_name LIKE ?");
    params.push(`%${query}%`);
  }
  if (rarity && rarity !== "all") {
    where.push("r.slug = ?");
    params.push(rarity);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const skins = getDb()
    .prepare(
      `SELECT s.id, s.slug, s.market_name, s.weapon, s.finish,
              s.base_price_minor, s.stattrak_capable,
              s.art_kind, s.art_pattern, s.art_color_a, s.art_color_b,
              r.slug AS rarity_slug, r.name AS rarity_name,
              r.color AS rarity_color, r.default_weight,
              (SELECT si.url FROM skin_images si
                WHERE si.skin_id = s.id AND si.is_primary = 1
                ORDER BY si.id LIMIT 1) AS image_url
         FROM skins s
         JOIN rarities r ON r.id = s.rarity_id
         ${whereSql}
        ORDER BY r.sort_order DESC, s.base_price_minor DESC
        LIMIT 300`,
    )
    .all(...params);

  return ok({ skins });
});
