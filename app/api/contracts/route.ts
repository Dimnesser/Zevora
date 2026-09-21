import { bootstrap } from "@/lib/server/bootstrap";
import { CONTRACT_SIZE, contractGroups, runContract } from "@/lib/server/contracts";
import { ApiError, asInt, handler, ok, rateLimit, readJson, requireUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** What this player could trade up, and how far off each rarity is. */
export const GET = handler(async () => {
  bootstrap();
  const user = await requireUser();
  return ok({ size: CONTRACT_SIZE, groups: contractGroups(user.id) });
});

export const POST = handler(async (req: Request) => {
  bootstrap();
  const user = await requireUser();
  rateLimit(`contract:${user.id}`, 20, 10_000);

  const body = await readJson<{ item_ids?: unknown }>(req);
  if (!Array.isArray(body.item_ids)) {
    throw new ApiError("invalid_input", "Выберите предметы для контракта");
  }
  const itemIds = body.item_ids.map((v) => asInt(v, "item_ids", { min: 1 }));

  return ok(runContract(user.id, itemIds));
});
