import { bootstrap } from "@/lib/server/bootstrap";
import { getDb, now, transact } from "@/lib/server/db";
import { getCaseById, getCaseItems } from "@/lib/server/cases";
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
import { publicCase, publicCaseItem } from "@/lib/server/presenters";

export const dynamic = "force-dynamic";

export const GET = handler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    bootstrap();
    await requireOwner();
    const id = Number((await ctx.params).id);

    const kase = getCaseById(id);
    if (!kase) throw new ApiError("not_found", "Кейс не найден");

    const items = getCaseItems(id);
    const ev = items.reduce((s, i) => s + i.chance * i.base_price_minor, 0);

    return ok({
      case: publicCase(kase),
      items: items.map(publicCaseItem),
      expected_value_minor: Math.round(ev),
      total_weight: items.reduce((s, i) => s + i.weight, 0),
    });
  },
);

export const PATCH = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    bootstrap();
    await requireOwner();
    const id = Number((await ctx.params).id);

    const kase = getCaseById(id);
    if (!kase) throw new ApiError("not_found", "Кейс не найден");

    const body = await readJson<Record<string, unknown>>(req);
    const sets: string[] = [];
    const params: unknown[] = [];

    const push = (column: string, value: unknown) => {
      sets.push(`${column} = ?`);
      params.push(value);
    };

    if (body.name !== undefined) push("name", asString(body.name, "name", { min: 2, max: 80 }));
    if (body.description !== undefined)
      push("description", asString(body.description, "description", { max: 400 }));
    if (body.price_minor !== undefined)
      push("price_minor", asInt(body.price_minor, "price_minor", { min: 0, max: 100_000_000 }));
    if (body.image_url !== undefined)
      push("image_url", body.image_url === null ? null : asString(body.image_url, "image_url", { max: 500 }));
    if (body.is_active !== undefined) push("is_active", asBool(body.is_active) ? 1 : 0);
    if (body.partner_only !== undefined)
      push("partner_only", asBool(body.partner_only) ? 1 : 0);
    if (body.tags !== undefined)
      push("tags", JSON.stringify(Array.isArray(body.tags) ? body.tags : []));
    if (body.art_emblem !== undefined)
      push("art_emblem", asString(body.art_emblem, "art_emblem", { max: 20 }));
    if (body.art_color_a !== undefined)
      push("art_color_a", asString(body.art_color_a, "art_color_a", { max: 20 }));
    if (body.art_color_b !== undefined)
      push("art_color_b", asString(body.art_color_b, "art_color_b", { max: 20 }));
    if (body.sort_order !== undefined)
      push("sort_order", asInt(body.sort_order, "sort_order", { min: 0, max: 10_000 }));

    if (sets.length === 0) throw new ApiError("invalid_input", "Нет полей для обновления");

    push("updated_at", now());
    params.push(id);

    transact(() => {
      getDb()
        .prepare(`UPDATE cases SET ${sets.join(", ")} WHERE id = ?`)
        .run(...params);
    });

    return ok({ case: publicCase(getCaseById(id)!) });
  },
);

/**
 * Archives a case by default (openings reference it, so a hard delete
 * would break history). `?hard=1` deletes outright and is refused once
 * the case has been opened.
 */
export const DELETE = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    bootstrap();
    await requireOwner();
    const id = Number((await ctx.params).id);
    const hard = new URL(req.url).searchParams.get("hard") === "1";

    const kase = getCaseById(id);
    if (!kase) throw new ApiError("not_found", "Кейс не найден");

    const db = getDb();

    if (hard) {
      const { n } = db
        .prepare(`SELECT COUNT(*) AS n FROM case_openings WHERE case_id = ?`)
        .get(id) as { n: number };
      if (n > 0) {
        throw new ApiError(
          "conflict",
          `Кейс уже открывали (${n} раз). Его можно только архивировать`,
        );
      }
      transact(() => {
        db.prepare(`DELETE FROM case_items WHERE case_id = ?`).run(id);
        db.prepare(`DELETE FROM cases WHERE id = ?`).run(id);
      });
      return ok({ deleted: true });
    }

    transact(() => {
      db.prepare(`UPDATE cases SET is_active = 0, updated_at = ? WHERE id = ?`).run(
        now(),
        id,
      );
    });
    return ok({ archived: true });
  },
);
