import { bootstrap } from "@/lib/server/bootstrap";
import { sellItems } from "@/lib/server/inventory";
import {
  ApiError,
  handler,
  ok,
  rateLimit,
  readJson,
  requireUser,
} from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  bootstrap();
  const user = await requireUser();
  rateLimit(`sell:${user.id}`, 40, 10_000);

  const body = await readJson<{ ids?: unknown }>(req);
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    throw new ApiError("invalid_input", "Передайте список id предметов");
  }
  if (body.ids.length > 200) {
    throw new ApiError("invalid_input", "За один раз можно продать до 200 предметов");
  }

  const ids = body.ids.map((id) => {
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
      throw new ApiError("invalid_input", "Некорректный id предмета");
    }
    return id;
  });

  return ok(sellItems(user.id, ids));
});
