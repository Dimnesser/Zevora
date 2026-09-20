import { bootstrap } from "@/lib/server/bootstrap";
import { getDb, now, transact } from "@/lib/server/db";
import {
  ApiError,
  asInt,
  asString,
  handler,
  ok,
  readJson,
  requireOwner,
} from "@/lib/server/http";

export const dynamic = "force-dynamic";

const EFFECTS = ["none", "glow", "shine", "pulse", "aurora"];

export const GET = handler(async () => {
  bootstrap();
  await requireOwner();
  const rarities = getDb()
    .prepare(
      `SELECT r.*, (SELECT COUNT(*) FROM skins s WHERE s.rarity_id = r.id) AS skin_count
         FROM rarities r ORDER BY r.sort_order ASC`,
    )
    .all();
  return ok({ rarities });
});

/** Custom rarities are first-class: the scale is data, not an enum. */
export const POST = handler(async (req: Request) => {
  bootstrap();
  await requireOwner();

  const body = await readJson<Record<string, unknown>>(req);
  const slug = asString(body.slug, "slug", {
    min: 2,
    max: 30,
    pattern: /^[a-z0-9-]+$/,
  });
  const name = asString(body.name, "name", { min: 2, max: 40 });
  const color = asString(body.color, "color", { pattern: /^#[0-9a-fA-F]{6}$/ });
  const effect = asString(body.effect ?? "none", "effect");
  if (!EFFECTS.includes(effect)) {
    throw new ApiError("invalid_input", `effect должен быть одним из: ${EFFECTS.join(", ")}`);
  }

  const db = getDb();
  if (db.prepare(`SELECT id FROM rarities WHERE slug = ?`).get(slug)) {
    throw new ApiError("conflict", "Редкость с таким slug уже существует");
  }

  const id = transact(() => {
    const res = db
      .prepare(
        `INSERT INTO rarities
           (slug, name, color, default_weight, effect, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        slug,
        name,
        color,
        asInt(body.default_weight ?? 1000, "default_weight", { min: 1, max: 10_000_000 }),
        effect,
        asInt(body.sort_order ?? 0, "sort_order", { min: 0, max: 1000 }),
        now(),
      );
    return Number(res.lastInsertRowid);
  });

  return ok({ rarity: db.prepare(`SELECT * FROM rarities WHERE id = ?`).get(id) }, { status: 201 });
});
