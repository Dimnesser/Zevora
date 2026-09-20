import { bootstrap } from "@/lib/server/bootstrap";
import { listLiveDrops } from "@/lib/server/openings";
import { handler, ok } from "@/lib/server/http";
import { publicOpening } from "@/lib/server/presenters";

export const dynamic = "force-dynamic";

/**
 * Public live feed. Every entry is a real opening by a real account —
 * there is no synthetic drop generator anywhere in this codebase.
 */
export const GET = handler(async (req: Request) => {
  bootstrap();
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20) || 20, 50);
  return ok({ drops: listLiveDrops(limit).map(publicOpening) });
});
