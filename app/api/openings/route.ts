import { bootstrap } from "@/lib/server/bootstrap";
import { listAllOpenings, listUserOpenings } from "@/lib/server/openings";
import { ApiError, handler, ok, requireUser } from "@/lib/server/http";
import { publicOpening } from "@/lib/server/presenters";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  bootstrap();
  const user = await requireUser();

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "me";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50) || 50, 200);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);

  if (scope === "all") {
    // Platform-wide history is an owner view.
    if (user.role !== "owner") {
      throw new ApiError("forbidden", "Недостаточно прав");
    }
    const { items, total } = listAllOpenings(limit, offset);
    return ok({ openings: items.map(publicOpening), total, scope: "all" });
  }

  const { items, total } = listUserOpenings(user.id, limit, offset);
  return ok({ openings: items.map(publicOpening), total, scope: "me" });
});
