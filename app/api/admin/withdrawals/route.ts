import { bootstrap } from "@/lib/server/bootstrap";
import { getDb } from "@/lib/server/db";
import { itemsOf, listAll, publicWithdrawal } from "@/lib/server/withdrawals";
import { handler, ok, requireOwner } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** The operator's queue. Open requests first, oldest first within it. */
export const GET = handler(async (req: Request) => {
  bootstrap();
  await requireOwner();

  const status = new URL(req.url).searchParams.get("status") ?? "all";
  const rows = listAll(status);
  const names = getDb().prepare(`SELECT id, username FROM users`).all() as {
    id: number;
    username: string;
  }[];
  const byId = new Map(names.map((u) => [u.id, u.username]));

  return ok({
    withdrawals: rows.map((row) => ({
      ...publicWithdrawal(row, itemsOf(row.id)),
      username: byId.get(row.user_id) ?? "—",
      trade_url: row.trade_url,
    })),
  });
});
