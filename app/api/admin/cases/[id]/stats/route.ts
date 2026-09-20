import { bootstrap } from "@/lib/server/bootstrap";
import { getCaseById } from "@/lib/server/cases";
import { caseStats, type Period } from "@/lib/server/stats";
import { ApiError, handler, ok, requireOwner } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const PERIODS: Period[] = ["today", "week", "month", "all"];

export const GET = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    bootstrap();
    await requireOwner();
    const id = Number((await ctx.params).id);
    if (!getCaseById(id)) throw new ApiError("not_found", "Кейс не найден");

    const param = new URL(req.url).searchParams.get("period") as Period | null;
    const period: Period = param && PERIODS.includes(param) ? param : "all";

    return ok({ period, stats: caseStats(id, period) });
  },
);
