import { bootstrap } from "@/lib/server/bootstrap";
import { getDb, now, transact } from "@/lib/server/db";
import { getCaseById, getCaseItems } from "@/lib/server/cases";
import {
  ApiError,
  asBool,
  asInt,
  handler,
  ok,
  readJson,
  requireOwner,
} from "@/lib/server/http";
import { publicCaseItem } from "@/lib/server/presenters";

export const dynamic = "force-dynamic";

export const GET = handler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    bootstrap();
    await requireOwner();
    const id = Number((await ctx.params).id);
    if (!getCaseById(id)) throw new ApiError("not_found", "Кейс не найден");
    return ok({ items: getCaseItems(id).map(publicCaseItem) });
  },
);

/** Adds a skin to a case. Weight is an integer ticket count. */
export const POST = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    bootstrap();
    await requireOwner();
    const caseId = Number((await ctx.params).id);
    if (!getCaseById(caseId)) throw new ApiError("not_found", "Кейс не найден");

    const body = await readJson<Record<string, unknown>>(req);
    const skinId = asInt(body.skin_id, "skin_id", { min: 1 });
    const weight = asInt(body.weight, "weight", { min: 1, max: 10_000_000 });

    const minFloat = clampFloat(body.min_float, 0);
    const maxFloat = clampFloat(body.max_float, 1);
    if (minFloat > maxFloat) {
      throw new ApiError("invalid_input", "min_float не может быть больше max_float");
    }

    const db = getDb();
    if (!db.prepare(`SELECT id FROM skins WHERE id = ?`).get(skinId)) {
      throw new ApiError("not_found", "Скин не найден");
    }
    if (
      db
        .prepare(`SELECT id FROM case_items WHERE case_id = ? AND skin_id = ?`)
        .get(caseId, skinId)
    ) {
      throw new ApiError("conflict", "Этот скин уже есть в кейсе");
    }

    const ts = now();
    const id = transact(() => {
      const res = db
        .prepare(
          `INSERT INTO case_items
             (case_id, skin_id, weight, min_float, max_float,
              stattrak_enabled, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          caseId,
          skinId,
          weight,
          minFloat,
          maxFloat,
          asBool(body.stattrak_enabled, true) ? 1 : 0,
          asInt(body.sort_order ?? 0, "sort_order", { min: 0, max: 10_000 }),
          ts,
        );
      db.prepare(`UPDATE cases SET updated_at = ? WHERE id = ?`).run(ts, caseId);
      return Number(res.lastInsertRowid);
    });

    const item = getCaseItems(caseId).find((i) => i.id === id)!;
    return ok({ item: publicCaseItem(item) }, { status: 201 });
  },
);

function clampFloat(value: unknown, fallback: number): number {
  if (value === undefined || value === null) return fallback;
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || Number.isNaN(n) || n < 0 || n > 1) {
    throw new ApiError("invalid_input", "float должен быть в диапазоне 0..1");
  }
  return n;
}
