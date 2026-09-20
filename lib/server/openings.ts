import "server-only";

import { getDb } from "@/lib/server/db";

export interface OpeningRow {
  id: number;
  created_at: number;
  price_paid_minor: number;
  value_minor: number;
  roll: number;
  total_weight: number;
  username: string;
  avatar_seed: string;
  case_name: string;
  case_slug: string;
  market_name: string;
  weapon: string;
  finish: string;
  image_url: string | null;
  rarity_slug: string;
  rarity_name: string;
  rarity_color: string;
  art_kind: string;
  art_pattern: string;
  art_color_a: string;
  art_color_b: string;
}

const SELECT_OPENING = `
  SELECT o.id, o.created_at, o.price_paid_minor, o.value_minor,
         o.roll, o.total_weight,
         u.username, u.avatar_seed,
         c.name AS case_name, c.slug AS case_slug,
         s.market_name, s.weapon, s.finish,
         s.art_kind, s.art_pattern, s.art_color_a, s.art_color_b,
         r.slug AS rarity_slug, r.name AS rarity_name, r.color AS rarity_color,
         (SELECT si.url FROM skin_images si
           WHERE si.skin_id = s.id AND si.is_primary = 1
           ORDER BY si.id LIMIT 1) AS image_url
    FROM case_openings o
    JOIN users u ON u.id = o.user_id
    JOIN cases c ON c.id = o.case_id
    JOIN skins s ON s.id = o.skin_id
    JOIN rarities r ON r.id = s.rarity_id
`;

/** A user's own history. */
export function listUserOpenings(
  userId: number,
  limit = 50,
  offset = 0,
): { items: OpeningRow[]; total: number } {
  const db = getDb();
  const items = db
    .prepare(`${SELECT_OPENING} WHERE o.user_id = ?
              ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`)
    .all(userId, limit, offset) as OpeningRow[];
  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM case_openings WHERE user_id = ?`)
    .get(userId) as { total: number };
  return { items, total };
}

/** Every opening on the platform. Owner only. */
export function listAllOpenings(
  limit = 100,
  offset = 0,
): { items: OpeningRow[]; total: number } {
  const db = getDb();
  const items = db
    .prepare(`${SELECT_OPENING}
              ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`)
    .all(limit, offset) as OpeningRow[];
  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM case_openings`)
    .get() as { total: number };
  return { items, total };
}

/**
 * The public live feed.
 *
 * These are real openings by real accounts — nothing here is fabricated.
 * Only above-common drops are surfaced so the rail stays interesting.
 */
export function listLiveDrops(limit = 20): OpeningRow[] {
  return getDb()
    .prepare(`${SELECT_OPENING}
              WHERE r.sort_order >= 2
              ORDER BY o.created_at DESC, o.id DESC LIMIT ?`)
    .all(limit) as OpeningRow[];
}
