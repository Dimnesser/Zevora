import { bootstrap } from "@/lib/server/bootstrap";
import { withdrawItems } from "@/lib/server/inventory";
import { ApiError, handler, ok, readJson, requireUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const TRADE_URL_RE = /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[\w-]+$/;

export const POST = handler(async (req: Request) => {
  bootstrap();
  const user = await requireUser();

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

  return ok(withdrawItems(user.id, ids));
});
