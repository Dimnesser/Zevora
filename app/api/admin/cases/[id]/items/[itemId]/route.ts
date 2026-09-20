import { bootstrap } from "@/lib/server/bootstrap";
import { getDb, now, transact } from "@/lib/server/db";
import { getCaseItems } from "@/lib/server/cases";
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

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  bootstrap();
  await requireOwner();
  const { id, itemId } = await ctx.params;
  const caseId = Number(id);
  const rowId = Number(itemId);

  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM case_items WHERE id = ? AND case_id = ?`)
    .get(rowId, caseId);
  if (!existing) throw new ApiError("not_found", "Предмет кейса не найден");

  const body = await readJson<Record<string, unknown>>(req);
  const sets: string[] = [];
  const params: unknown[] = [];

  if (body.weight !== undefined) {
    sets.push("weight = ?");
    params.push(asInt(body.weight, "weight", { min: 1, max: 10_000_000 }));
  }
  if (body.sort_order !== undefined) {
    sets.push("sort_order = ?");
    params.push(asInt(body.sort_order, "sort_order", { min: 0, max: 10_000 }));
  }
  if (body.stattrak_enabled !== undefined) {
    sets.push("stattrak_enabled = ?");
    params.push(asBool(body.stattrak_enabled) ? 1 : 0);
  }
  if (body.min_float !== undefined) {
    sets.push("min_float = ?");
    params.push(floatOrThrow(body.min_float));
  }
  if (body.max_float !== undefined) {
    sets.push("max_float = ?");
    params.push(floatOrThrow(body.max_float));
  }

  if (sets.length === 0) throw new ApiError("invalid_input", "Нет полей для обновления");

  params.push(rowId, caseId);
  transact(() => {
    db.prepare(
      `UPDATE case_items SET ${sets.join(", ")} WHERE id = ? AND case_id = ?`,
    ).run(...params);
    db.prepare(`UPDATE cases SET updated_at = ? WHERE id = ?`).run(now(), caseId);
  });

  const item = getCaseItems(caseId).find((i) => i.id === rowId)!;
  return ok({ item: publicCaseItem(item) });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  bootstrap();
  await requireOwner();
  const { id, itemId } = await ctx.params;
  const caseId = Number(id);

  const db = getDb();
  const res = transact(() => {
    const r = db
      .prepare(`DELETE FROM case_items WHERE id = ? AND case_id = ?`)
      .run(Number(itemId), caseId);
    db.prepare(`UPDATE cases SET updated_at = ? WHERE id = ?`).run(now(), caseId);
    return r;
  });

  if (res.changes === 0) throw new ApiError("not_found", "Предмет кейса не найден");

  // A case with no items can never be opened, so flag the state back.
  const { n } = db
    .prepare(`SELECT COUNT(*) AS n FROM case_items WHERE case_id = ?`)
    .get(caseId) as { n: number };
  if (n === 0) {
    db.prepare(`UPDATE cases SET is_active = 0 WHERE id = ?`).run(caseId);
  }

  return ok({ deleted: true, remaining: n });
});

function floatOrThrow(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || Number.isNaN(n) || n < 0 || n > 1) {
    throw new ApiError("invalid_input", "float должен быть в диапазоне 0..1");
  }
  return n;
}
