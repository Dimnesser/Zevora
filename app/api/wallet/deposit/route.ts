import { bootstrap } from "@/lib/server/bootstrap";
import { transact } from "@/lib/server/db";
import { credit } from "@/lib/server/ledger";
import { toMinor } from "@/lib/server/money";
import {
  ApiError,
  asInt,
  asString,
  handler,
  ok,
  rateLimit,
  readJson,
  requireUser,
} from "@/lib/server/http";

export const dynamic = "force-dynamic";

const MIN_MAJOR = 100;
const MAX_MAJOR = 300_000;

/** Bonus rates are server-side; a client cannot claim a better one. */
const METHODS: Record<string, { name: string; bonus: number }> = {
  card: { name: "Банковская карта", bonus: 0 },
  sbp: { name: "СБП", bonus: 0.03 },
  crypto: { name: "Криптовалюта", bonus: 0.07 },
};

export const POST = handler(async (req: Request) => {
  bootstrap();
  const user = await requireUser();
  rateLimit(`deposit:${user.id}`, 20, 60_000);

  const body = await readJson<{ amount?: unknown; method?: unknown }>(req);
  const amountMajor = asInt(body.amount, "amount", {
    min: MIN_MAJOR,
    max: MAX_MAJOR,
  });
  const methodKey = asString(body.method, "method", { min: 1, max: 20 });

  const method = METHODS[methodKey];
  if (!method) throw new ApiError("invalid_input", "Неизвестный способ оплаты");

  const base = toMinor(amountMajor);
  const bonus = Math.round(base * method.bonus);

  const balance = transact(() =>
    credit({
      userId: user.id,
      kind: "deposit",
      label: `Пополнение — ${method.name}${bonus > 0 ? " (с бонусом)" : ""}`,
      amountMinor: base + bonus,
    }),
  );

  return ok({
    credited_minor: base + bonus,
    bonus_minor: bonus,
    balance_minor: balance,
  });
});
