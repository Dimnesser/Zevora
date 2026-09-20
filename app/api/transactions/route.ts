import { bootstrap } from "@/lib/server/bootstrap";
import { getDb } from "@/lib/server/db";
import { handler, ok, requireUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  bootstrap();
  const user = await requireUser();
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 60) || 60, 200);

  const items = getDb()
    .prepare(
      `SELECT id, kind, label, amount_minor, balance_after_minor, created_at
         FROM transactions
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?`,
    )
    .all(user.id, limit);

  return ok({ transactions: items });
});
