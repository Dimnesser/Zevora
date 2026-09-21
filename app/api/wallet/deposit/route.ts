import { bootstrap } from "@/lib/server/bootstrap";
import {
  MAX_MAJOR,
  MIN_MAJOR,
  createOrder,
  isSimulated,
  publicOrder,
} from "@/lib/server/payments";
import {
  asInt,
  asString,
  handler,
  ok,
  rateLimit,
  readJson,
  requireUser,
} from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Starts a top-up.
 *
 * This route no longer touches the balance. It opens an order and hands
 * back where to pay; the money appears only when the provider confirms
 * it, through the webhook. Calling this in a loop now produces unpaid
 * orders, which is exactly as valuable as it sounds.
 */
export const POST = handler(async (req: Request) => {
  bootstrap();
  const user = await requireUser();
  rateLimit(`deposit:${user.id}`, 20, 60_000);

  const body = await readJson<{ amount?: unknown; method?: unknown }>(req);
  const amountMajor = asInt(body.amount, "amount", { min: MIN_MAJOR, max: MAX_MAJOR });
  const method = asString(body.method, "method", { min: 1, max: 20 });

  const { order, pay_url } = await createOrder({
    userId: user.id,
    amountMajor,
    method,
  });

  return ok({ order: publicOrder(order), pay_url, simulated: isSimulated() });
});
