import { bootstrap } from "@/lib/server/bootstrap";
import { openCase } from "@/lib/server/cases";
import {
  ApiError,
  asString,
  handler,
  ok,
  rateLimit,
  requireUser,
} from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Opens a case.
 *
 * The body carries nothing that can influence the outcome: no price, no
 * skin id, no odds. The only input is the case slug in the path and an
 * idempotency key, and everything else is read from the database inside
 * the transaction.
 */
export const POST = handler(
  async (req: Request, ctx: { params: Promise<{ slug: string }> }) => {
    bootstrap();
    const user = await requireUser();
    const { slug } = await ctx.params;

    // Bounds the damage a scripted client can do.
    rateLimit(`open:${user.id}`, 60, 10_000);

    const header = req.headers.get("idempotency-key");
    if (!header) {
      throw new ApiError("invalid_input", "Отсутствует заголовок Idempotency-Key");
    }
    const key = asString(header, "Idempotency-Key", { min: 8, max: 120 });

    const result = openCase(user, slug, key);
    return ok(result);
  },
);
