import { bootstrap } from "@/lib/server/bootstrap";
import { expireStaleOrders, getOrder, publicOrder } from "@/lib/server/payments";
import { ApiError, handler, ok, requireUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Polls one order. Scoped to its owner, so an id is not a lookup key. */
export const GET = handler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    bootstrap();
    const user = await requireUser();
    expireStaleOrders();

    const { id } = await ctx.params;
    const order = getOrder(id);
    if (!order || order.user_id !== user.id) {
      throw new ApiError("not_found", "Заказ не найден");
    }
    return ok({ order: publicOrder(order) });
  },
);
