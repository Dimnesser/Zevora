import { bootstrap } from "@/lib/server/bootstrap";
import { itemsOf, byPublicId, publicWithdrawal, transition } from "@/lib/server/withdrawals";
import { ApiError, handler, ok, rateLimit, requireUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Cancels a request the player has changed their mind about.
 *
 * Only while it is still pending: once the offer is out, cancelling here
 * would put the items back in the inventory while a trade for them is
 * live in Steam.
 */
export const DELETE = handler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    bootstrap();
    const user = await requireUser();
    rateLimit(`withdraw-cancel:${user.id}`, 20, 60_000);

    const { id } = await ctx.params;
    const row = transition({
      publicId: id,
      to: "cancelled",
      actorId: user.id,
      byOwner: false,
    });
    return ok({ withdrawal: publicWithdrawal(row, itemsOf(row.id)) });
  },
);

export const GET = handler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    bootstrap();
    const user = await requireUser();
    const { id } = await ctx.params;
    const row = byPublicId(id);
    if (!row || row.user_id !== user.id) {
      throw new ApiError("not_found", "Заявка не найдена");
    }
    return ok({ withdrawal: publicWithdrawal(row, itemsOf(row.id)) });
  },
);
