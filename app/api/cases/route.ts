import { bootstrap } from "@/lib/server/bootstrap";
import { getSessionUser } from "@/lib/server/auth";
import { listCases } from "@/lib/server/cases";
import { handler, ok } from "@/lib/server/http";
import { publicCase } from "@/lib/server/presenters";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  bootstrap();
  const user = await getSessionUser();
  // Partner-only cases appear only for accounts that hold the status.
  const cases = listCases({ partner: Boolean(user?.partner_tier) });
  return ok({ cases: cases.map(publicCase) });
});
