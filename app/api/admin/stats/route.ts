import { bootstrap } from "@/lib/server/bootstrap";
import { platformStats, type Period } from "@/lib/server/stats";
import { handler, ok, requireOwner } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const PERIODS: Period[] = ["today", "week", "month", "all"];

export const GET = handler(async (req: Request) => {
  bootstrap();
  await requireOwner();
  const param = new URL(req.url).searchParams.get("period") as Period | null;
  const period: Period = param && PERIODS.includes(param) ? param : "all";
  return ok({ period, stats: platformStats(period) });
});
