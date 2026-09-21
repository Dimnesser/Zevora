import { bootstrap } from "@/lib/server/bootstrap";
import { activeProvider, settleOrder } from "@/lib/server/payments";
import { ApiError, fail, handler, ok, rateLimit } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Where a payment provider reports the outcome.
 *
 * This is the only path in the application that can increase a balance
 * from outside, so it does three things before it settles anything: it
 * checks the request is from the configured provider, it verifies the
 * signature, and it lets `settleOrder` decide — that function is
 * idempotent, which matters because every provider retries.
 *
 * The response is deliberately 200 for an already-settled order: a
 * provider that gets an error back will keep retrying forever.
 */
export const POST = handler(
  async (req: Request, ctx: { params: Promise<{ provider: string }> }) => {
    bootstrap();

    const { provider: name } = await ctx.params;
    const provider = activeProvider();
    if (name !== provider.id) {
      return fail("not_found", "Провайдер не настроен");
    }

    // Bounded by source address rather than by user: there is no session
    // on a webhook.
    rateLimit(`webhook:${name}`, 120, 10_000);

    const raw = await req.text();
    if (raw.length > 64_000) {
      throw new ApiError("invalid_input", "Слишком большое тело запроса");
    }

    const event = provider.parseWebhook(raw, req.headers);
    const result = settleOrder({
      publicId: event.public_id,
      status: event.status,
      providerRef: event.provider_ref,
      failureReason: event.failure_reason,
      amountMinor: event.amount_minor,
    });

    return ok({
      order_id: result.order.public_id,
      status: result.order.status,
      credited: result.credited,
    });
  },
);
