import { bootstrap } from "@/lib/server/bootstrap";
import {
  activeProvider,
  getOrder,
  isSimulated,
  publicOrder,
  settleOrder,
  signPayload,
} from "@/lib/server/payments";
import {
  ApiError,
  asString,
  handler,
  ok,
  rateLimit,
  readJson,
  requireUser,
} from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Stands in for the customer completing or abandoning a payment.
 *
 * It exists only while the bundled test provider is active — with a real
 * acquirer configured this route refuses, because the only thing allowed
 * to settle an order then is that acquirer's signed callback.
 *
 * It does not shortcut the pipeline: it builds the same payload a
 * provider would send, signs it with the same secret, and runs it through
 * the same verification. So what the demo exercises is the real path.
 */
export const POST = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    bootstrap();
    const user = await requireUser();

    if (!isSimulated()) {
      throw new ApiError(
        "forbidden",
        "Подтверждение оплаты приходит от платёжного провайдера",
      );
    }
    rateLimit(`simulate:${user.id}`, 30, 60_000);

    const { id } = await ctx.params;
    const order = getOrder(id);
    if (!order || order.user_id !== user.id) {
      throw new ApiError("not_found", "Заказ не найден");
    }

    const body = await readJson<{ outcome?: unknown }>(req);
    const outcome = asString(body.outcome ?? "paid", "outcome", { min: 4, max: 8 });
    if (outcome !== "paid" && outcome !== "failed") {
      throw new ApiError("invalid_input", "Неизвестный исход платежа");
    }

    const payload = JSON.stringify({
      public_id: order.public_id,
      provider_ref: order.provider_ref ?? `mock_${order.public_id}`,
      status: outcome,
      amount_minor: order.amount_minor,
      failure_reason: outcome === "failed" ? "Платёж отменён плательщиком" : undefined,
    });

    const headers = new Headers({ "x-zevora-signature": signPayload(payload) });
    const event = activeProvider().parseWebhook(payload, headers);

    const result = settleOrder({
      publicId: event.public_id,
      status: event.status,
      providerRef: event.provider_ref,
      failureReason: event.failure_reason,
      amountMinor: event.amount_minor,
    });

    return ok({
      order: publicOrder(result.order),
      credited: result.credited,
      balance_minor: result.balance_minor,
    });
  },
);
