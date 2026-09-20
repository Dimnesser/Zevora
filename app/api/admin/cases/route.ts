import { bootstrap } from "@/lib/server/bootstrap";
import { getDb, now, transact } from "@/lib/server/db";
import { listCases } from "@/lib/server/cases";
import {
  ApiError,
  asBool,
  asInt,
  asString,
  handler,
  ok,
  readJson,
  requireOwner,
} from "@/lib/server/http";
import { publicCase } from "@/lib/server/presenters";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

/** Owner view: includes disabled and partner-only cases. */
export const GET = handler(async () => {
  bootstrap();
  await requireOwner();
  return ok({ cases: listCases({ includeInactive: true }).map(publicCase) });
});

/** Creates a case. Items are added through the items endpoint. */
export const POST = handler(async (req: Request) => {
  bootstrap();
  await requireOwner();

  const body = await readJson<Record<string, unknown>>(req);
  const name = asString(body.name, "name", { min: 2, max: 80 });
  const slug = asString(body.slug ?? slugify(name), "slug", {
    min: 3,
    max: 50,
    pattern: SLUG_RE,
  });
  const description = asString(body.description ?? "", "description", { max: 400 });
  const priceMinor = asInt(body.price_minor, "price_minor", {
    min: 0,
    max: 100_000_000,
  });

  const db = getDb();
  if (db.prepare(`SELECT id FROM cases WHERE slug = ?`).get(slug)) {
    throw new ApiError("conflict", "Кейс с таким slug уже существует");
  }

  const ts = now();
  const id = transact(() => {
    const res = db
      .prepare(
        `INSERT INTO cases
           (slug, name, description, image_url, price_minor, is_active,
            is_demo, partner_only, tags, art_emblem, art_color_a,
            art_color_b, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        slug,
        name,
        description,
        typeof body.image_url === "string" ? body.image_url : null,
        priceMinor,
        asBool(body.is_active, true) ? 1 : 0,
        asBool(body.partner_only, false) ? 1 : 0,
        JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
        typeof body.art_emblem === "string" ? body.art_emblem : "hex",
        typeof body.art_color_a === "string" ? body.art_color_a : "#6E71FF",
        typeof body.art_color_b === "string" ? body.art_color_b : "#22D3EE",
        asInt(body.sort_order ?? 100, "sort_order", { min: 0, max: 10_000 }),
        ts,
        ts,
      );
    return Number(res.lastInsertRowid);
  });

  const row = db.prepare(`SELECT * FROM cases WHERE id = ?`).get(id);
  return ok({ case: publicCase(row as never) }, { status: 201 });
});

function slugify(value: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh",
    щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return value
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}
