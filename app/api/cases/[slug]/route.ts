import { bootstrap } from "@/lib/server/bootstrap";
import { getSessionUser } from "@/lib/server/auth";
import { getCaseBySlug, getCaseItems } from "@/lib/server/cases";
import { ApiError, handler, ok } from "@/lib/server/http";
import { publicCase, publicCaseItem } from "@/lib/server/presenters";

export const dynamic = "force-dynamic";

export const GET = handler(
  async (_req: Request, ctx: { params: Promise<{ slug: string }> }) => {
    bootstrap();
    const { slug } = await ctx.params;

    const kase = getCaseBySlug(slug);
    if (!kase || !kase.is_active) {
      throw new ApiError("not_found", "Кейс не найден");
    }

    if (kase.partner_only) {
      const user = await getSessionUser();
      if (!user?.partner_tier) {
        throw new ApiError("forbidden", "Кейс доступен только партнёрам Zevora");
      }
    }

    const items = getCaseItems(kase.id);
    // Expected value is derived from the same weights the roll uses.
    const ev = items.reduce((sum, i) => sum + i.chance * i.base_price_minor, 0);

    return ok({
      case: publicCase(kase),
      items: items.map(publicCaseItem),
      expected_value_minor: Math.round(ev),
    });
  },
);
