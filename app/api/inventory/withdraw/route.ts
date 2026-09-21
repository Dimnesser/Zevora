import { bootstrap } from "@/lib/server/bootstrap";
import {
  createWithdrawal,
  itemsOf,
  listForUser,
  publicWithdrawal,
} from "@/lib/server/withdrawals";
import {
  ApiError,
  handler,
  ok,
  rateLimit,
  readJson,
  requireUser,
} from "@/lib/server/http";

export const dynamic = "force-dynamic";

const TRADE_URL_RE = /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[\w-]+$/;

/** The player's own withdrawal requests, newest first. */
export const GET = handler(async () => {
  bootstrap();
  const user = await requireUser();
  const rows = listForUser(user.id);
  return ok({
    withdrawals: rows.map((row) => publicWithdrawal(row, itemsOf(row.id))),
  });
});

export const POST = handler(async (req: Request) => {
  bootstrap();
  const user = await requireUser();
  rateLimit(`withdraw:${user.id}`, 10, 60_000);

  const body = await readJson<{ ids?: unknown; trade_url?: unknown }>(req);
  if (typeof body.trade_url !== "string" || !TRADE_URL_RE.test(body.trade_url.trim())) {
    throw new ApiError("invalid_input", "Укажите корректную ссылку на обмен Steam");
  }
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    throw new ApiError("invalid_input", "Передайте список id предметов");
  }

  const ids = body.ids.map((id) => {
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
      throw new ApiError("invalid_input", "Некорректный id предмета");
    }
    return id;
  });

  const { withdrawal, queued } = createWithdrawal({
    userId: user.id,
    itemIds: ids,
    tradeUrl: body.trade_url.trim(),
  });

  return ok({ queued, withdrawal: publicWithdrawal(withdrawal, itemsOf(withdrawal.id)) });
});
