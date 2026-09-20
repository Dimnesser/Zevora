import { bootstrap } from "@/lib/server/bootstrap";
import { listInventory, rarityCounts, type InventorySort } from "@/lib/server/inventory";
import { handler, ok, requireUser } from "@/lib/server/http";
import { publicInventoryItem } from "@/lib/server/presenters";

export const dynamic = "force-dynamic";

const SORTS: InventorySort[] = ["recent", "price-desc", "price-asc", "rarity"];

export const GET = handler(async (req: Request) => {
  bootstrap();
  const user = await requireUser();

  const url = new URL(req.url);
  const sortParam = url.searchParams.get("sort") as InventorySort | null;
  const sort = sortParam && SORTS.includes(sortParam) ? sortParam : "recent";
  const rarity = url.searchParams.get("rarity") ?? "all";

  // The user id comes from the session, never from the query string, so
  // there is no way to read another player's inventory.
  const { items, total, value_minor } = listInventory({
    userId: user.id,
    sort,
    rarity,
    limit: 300,
  });

  return ok({
    items: items.map(publicInventoryItem),
    total,
    value_minor,
    counts: rarityCounts(user.id),
  });
});
