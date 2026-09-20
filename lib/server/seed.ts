import "server-only";

import { getDb, now, transact } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/auth";
import { toMinor } from "@/lib/server/money";
import { CASES, RARITIES, SKINS } from "@/lib/server/seed-data";
import SKIN_IMAGES from "@/lib/server/skin-images.json";

/**
 * Snapshot of real CS2 artwork, taken from ByMykel/CSGO-API.
 *
 * Bundling it means a fresh install shows Valve's own renders straight
 * away, with no import step to remember. `npm run import:skins` refreshes
 * it against the live source and validates every URL.
 */
interface SkinImageEntry {
  market_hash_name: string;
  /** What the site loads: the cached file, or the upstream render. */
  image: string;
  source: "local" | "cdn";
  /** The upstream render this entry came from, kept for provenance. */
  origin: string;
  rarity: string | null;
  min_float: number;
  max_float: number;
}

const IMAGES = SKIN_IMAGES as Record<string, SkinImageEntry>;

/**
 * Idempotent seed.
 *
 * Runs on first boot and after `npm run db:reset`. Every statement is an
 * upsert, so re-running is safe and never duplicates rows or clobbers
 * edits the owner made in the admin panel (weights and prices are only
 * written when the row is created).
 */

export function isSeeded(): boolean {
  const row = getDb().prepare(`SELECT COUNT(*) AS n FROM cases`).get() as {
    n: number;
  };
  return row.n > 0;
}

export function seed(opts: { force?: boolean } = {}): void {
  const db = getDb();
  if (isSeeded() && !opts.force) return;

  transact(() => {
    const ts = now();

    // ── rarities ──
    const insertRarity = db.prepare(
      `INSERT INTO rarities (slug, name, color, default_weight, effect, sort_order, created_at)
       VALUES (@slug, @name, @color, @default_weight, @effect, @sort_order, @created_at)
       ON CONFLICT(slug) DO UPDATE SET
         name = excluded.name,
         color = excluded.color,
         sort_order = excluded.sort_order`,
    );
    for (const r of RARITIES) insertRarity.run({ ...r, created_at: ts });

    const rarityIds = new Map(
      (db.prepare(`SELECT id, slug FROM rarities`).all() as {
        id: number;
        slug: string;
      }[]).map((r) => [r.slug, r.id]),
    );

    // ── skins ──
    const insertSkin = db.prepare(
      `INSERT INTO skins
         (slug, market_name, market_hash_name, weapon, finish, rarity_id,
          base_price_minor, stattrak_capable, art_kind, art_pattern,
          art_color_a, art_color_b, image_url, image_source, image_status,
          created_at, updated_at)
       VALUES (@slug, @market_name, @hash, @weapon, @finish, @rarity_id,
               @price_minor, @stattrak, @kind, @pattern, @a, @b,
               @image_url, @image_source, @image_status, @ts, @ts)
       ON CONFLICT(slug) DO UPDATE SET
         market_name = excluded.market_name,
         market_hash_name = excluded.market_hash_name,
         rarity_id = excluded.rarity_id,
         updated_at = excluded.updated_at,
         -- Artwork already imported and validated is left alone; only a
         -- row that never got one is filled from the snapshot.
         image_url = COALESCE(skins.image_url, excluded.image_url),
         image_source = COALESCE(skins.image_source, excluded.image_source)`,
    );

    for (const s of SKINS) {
      const art = IMAGES[s.market_name];
      // The snapshot carries Valve's real rarity; the seed's own value is
      // only a fallback for a skin the snapshot does not cover.
      const raritySlug = art?.rarity ?? s.rarity;
      const rarityId = rarityIds.get(raritySlug) ?? rarityIds.get(s.rarity);
      if (!rarityId) throw new Error(`seed: unknown rarity ${raritySlug}`);

      insertSkin.run({
        slug: s.slug,
        market_name: s.market_name,
        hash: art?.market_hash_name ?? s.market_name,
        weapon: s.weapon,
        finish: s.finish,
        rarity_id: rarityId,
        price_minor: toMinor(s.price),
        stattrak: s.stattrak ? 1 : 0,
        kind: s.art.kind,
        pattern: s.art.pattern,
        a: s.art.a,
        b: s.art.b,
        image_url: art?.image ?? null,
        image_source: art ? art.source : null,
        image_status: art ? "valid" : "missing",
        ts,
      });
    }

    const skinIds = new Map(
      (db.prepare(`SELECT id, slug FROM skins`).all() as {
        id: number;
        slug: string;
      }[]).map((s) => [s.slug, s.id]),
    );

    // Record where each bundled picture came from. The importer writes
    // the same rows; doing it here too means a fresh clone can prove the
    // provenance of its artwork without running the import first.
    const insertImage = db.prepare(
      `INSERT INTO skin_images (skin_id, url, source, is_primary, created_at)
       VALUES (@skin_id, @url, @source, @primary, @ts)
       ON CONFLICT(skin_id, url) DO NOTHING`,
    );
    for (const s of SKINS) {
      const art = IMAGES[s.market_name];
      const skinId = skinIds.get(s.slug);
      if (!art || !skinId) continue;
      insertImage.run({
        skin_id: skinId,
        url: art.image,
        source: art.source,
        primary: 1,
        ts,
      });
      if (art.origin) {
        insertImage.run({
          skin_id: skinId,
          url: art.origin,
          source: "cdn",
          primary: art.source === "cdn" ? 1 : 0,
          ts,
        });
      }
    }

    // ── cases ──
    const insertCase = db.prepare(
      `INSERT INTO cases
         (slug, name, description, price_minor, is_active, is_demo,
          partner_only, tags, art_emblem, art_color_a, art_color_b,
          sort_order, created_at, updated_at)
       VALUES (@slug, @name, @description, @price_minor, 1, 1,
               @partner_only, @tags, @emblem, @a, @b, @sort, @ts, @ts)
       ON CONFLICT(slug) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         updated_at = excluded.updated_at`,
    );

    const insertItem = db.prepare(
      `INSERT INTO case_items
         (case_id, skin_id, weight, min_float, max_float,
          stattrak_enabled, sort_order, created_at)
       VALUES (?, ?, ?, 0.0, 1.0, 1, ?, ?)
       ON CONFLICT(case_id, skin_id) DO NOTHING`,
    );

    CASES.forEach((c, index) => {
      insertCase.run({
        slug: c.slug,
        name: c.name,
        description: c.description,
        price_minor: toMinor(c.price),
        partner_only: c.partner_only ? 1 : 0,
        tags: JSON.stringify(c.tags),
        emblem: c.art.emblem,
        a: c.art.a,
        b: c.art.b,
        sort: index,
        ts,
      });

      const caseRow = db
        .prepare(`SELECT id FROM cases WHERE slug = ?`)
        .get(c.slug) as { id: number };

      Object.entries(c.items).forEach(([skinSlug, weight], i) => {
        const skinId = skinIds.get(skinSlug);
        if (!skinId) throw new Error(`seed: unknown skin ${skinSlug}`);
        insertItem.run(caseRow.id, skinId, weight, i, ts);
      });
    });

    // ── demo accounts ──
    seedUser({
      username: "dimnesser",
      password: "zevora123",
      role: "owner",
      balanceMajor: 25000,
    });
    seedUser({
      username: "player",
      password: "player123",
      role: "user",
      balanceMajor: 5000,
    });

    // ── promo codes ──
    const insertPromo = db.prepare(
      `INSERT INTO promo_codes (code, amount_minor, is_active, created_at)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(code) DO NOTHING`,
    );
    insertPromo.run("ZEVORA", toMinor(500), ts);
    insertPromo.run("START300", toMinor(300), ts);
    insertPromo.run("NEON1000", toMinor(1000), ts);
  });
}

function seedUser(opts: {
  username: string;
  password: string;
  role: "user" | "owner";
  balanceMajor: number;
}): void {
  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM users WHERE username = ?`)
    .get(opts.username);
  if (existing) return;

  const { hash, salt } = hashPassword(opts.password);
  const ts = now();
  db.prepare(
    `INSERT INTO users
       (username, password_hash, password_salt, role, balance_minor,
        avatar_seed, level, xp, ref_code, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?)`,
  ).run(
    opts.username,
    hash,
    salt,
    opts.role,
    toMinor(opts.balanceMajor),
    opts.username,
    opts.username,
    ts,
    ts,
  );
}

/** Drops all data. Used by `npm run db:reset` and the test harness. */
export function resetDatabase(): void {
  const db = getDb();
  transact(() => {
    for (const table of [
      "promo_redemptions",
      "promo_codes",
      "idempotency_keys",
      "transactions",
      "case_openings",
      "inventory_items",
      "case_items",
      "cases",
      "skin_images",
      "skins",
      "rarities",
      "sessions",
      "users",
    ]) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
    db.prepare(`DELETE FROM sqlite_sequence`).run();
  });
}
