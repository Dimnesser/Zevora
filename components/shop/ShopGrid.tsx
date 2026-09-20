"use client";

import { useMemo, useState } from "react";
import { Search, ShoppingBag } from "lucide-react";
import { ApiRequestError, api, type CaseItem } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { useSession } from "@/lib/client/session";
import { ItemCard } from "@/components/items/ItemCard";
import { Input } from "@/components/ui/Input";
import { ItemCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Modal";
import { formatMinor } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { rarityRank } from "@/lib/client/display";

/** Mirrors the server constant; the server recomputes the real cost. */
const SHOP_PREMIUM = 1.12;

/**
 * Direct purchase.
 *
 * The catalogue is assembled from every case's drop table, so the shop
 * always sells exactly what the cases can produce.
 */
export function ShopGrid() {
  const { user, setBalance } = useSession();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<CaseItem | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, loading } = useResource(async () => {
    const { cases } = await api.cases();
    const details = await Promise.all(
      cases.map((c) => api.caseDetail(c.slug).catch(() => null)),
    );
    // De-duplicate: one skin can appear in several cases.
    const bySkin = new Map<number, CaseItem>();
    for (const detail of details) {
      for (const item of detail?.items ?? []) {
        if (!bySkin.has(item.skin_id)) bySkin.set(item.skin_id, item);
      }
    }
    return [...bySkin.values()];
  }, []);

  const items = useMemo(() => {
    if (!data) return null;
    const q = query.trim().toLowerCase();
    return data
      .filter((s) => !q || s.market_name.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          rarityRank(b.rarity.slug) - rarityRank(a.rarity.slug) ||
          b.price_minor - a.price_minor,
      );
  }, [data, query]);

  const cost = pending ? Math.round(pending.price_minor * SHOP_PREMIUM) : 0;

  const buy = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const res = await api.buy(pending.skin_id);
      setBalance(res.balance_minor);
      toast.success("Предмет куплен", res.market_name);
      setPending(null);
    } catch (err) {
      toast.error(
        "Не удалось купить",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск предмета"
          iconLeft={<Search size={15} />}
          className="lg:w-80"
          aria-label="Поиск предмета"
        />
      </div>

      {loading || !items ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={22} />}
          title="Ничего не найдено"
          description="Измените поисковый запрос."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((skin) => {
            const price = Math.round(skin.price_minor * SHOP_PREMIUM);
            const affordable = !user || user.balance_minor >= price;
            return (
              <ItemCard
                key={skin.skin_id}
                skin={skin}
                priceMinor={price}
                meta={
                  <span className="text-[11.5px] text-slate-500">
                    Продажа за {formatMinor(skin.price_minor)}
                  </span>
                }
                footer={
                  <button
                    onClick={() => setPending(skin)}
                    disabled={!user || !affordable}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.06] py-2 text-[12px] font-semibold text-white transition hover:bg-white/[0.13] disabled:opacity-40"
                  >
                    {!user ? "Войдите" : affordable ? "Купить" : "Не хватает средств"}
                  </button>
                }
              />
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={() => void buy()}
        title="Подтвердите покупку"
        description={
          pending ? (
            <>
              {pending.weapon} | <strong className="text-white">{pending.finish}</strong> за{" "}
              {formatMinor(cost)}. Предмет появится в инвентаре сразу после списания.
            </>
          ) : null
        }
        confirmLabel={busy ? "Покупаем…" : "Купить"}
      />
    </>
  );
}
