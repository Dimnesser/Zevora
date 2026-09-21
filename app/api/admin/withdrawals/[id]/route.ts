import { bootstrap } from "@/lib/server/bootstrap";
import {
  itemsOf,
  publicWithdrawal,
  transition,
  type WithdrawalStatus,
} from "@/lib/server/withdrawals";
import {
  ApiError,
  asString,
  handler,
  ok,
  readJson,
  requireOwner,
} from "@/lib/server/http";

export const dynamic = "force-dynamic";

const ALLOWED: WithdrawalStatus[] = ["sent", "completed", "rejected"];

/** Moves a request along: offer sent, trade accepted, or refused. */
export const PATCH = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    bootstrap();
    const owner = await requireOwner();

    const { id } = await ctx.params;
    const body = await readJson<{ status?: unknown; note?: unknown }>(req);
    const status = asString(body.status, "status", { min: 4, max: 12 }) as WithdrawalStatus;
    if (!ALLOWED.includes(status)) {
      throw new ApiError("invalid_input", "Недопустимый статус заявки");
    }
    const note =
      typeof body.note === "string" && body.note.trim()
        ? body.note.trim().slice(0, 300)
        : undefined;

    const row = transition({
      publicId: id,
      to: status,
      actorId: owner.id,
      byOwner: true,
      note,
    });
    return ok({ withdrawal: publicWithdrawal(row, itemsOf(row.id)) });
  },
);
