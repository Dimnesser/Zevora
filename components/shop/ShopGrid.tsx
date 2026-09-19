"use client";

import { useMemo, useState } from "react";
import { Search, ShoppingBag } from "lucide-react";
import type { Rarity } from "@/types";
import { SKINS } from "@/data/skins";
import { RARITY, RARITY_ORDER } from "@/lib/rarity";
import { useStore } from "@/lib/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { createItem } from "@/lib/roll";
import { ItemCard } from "@/components/items/ItemCard";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Modal";
import { formatMoney } from "@/lib/format";
import { toast } from "@/lib/store/useToast";

type Filter = Rarity | "all";

/** Direct purchase: buy a skin outright instead of gambling for it. */
export function ShopGrid() {
  const hydrated = useHydrated();
  const balance = useStore((s) => s.user.balance);
  const addBalance = useStore((s) => s.addBalance);
  const addItem = useStore((s) => s.addItem);

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  // Buying is a convenience, so it carries a small premium over drop value.
  const PREMIUM = 1.12;

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SKINS.filter((s) => filter === "all" || s.rarity === filter)
      .filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.weapon.toLowerCase().includes(q),
      )
      .sort((a, b) => a.price - b.price);
  }, [filter, query]);

  const tabs: TabItem<Filter>[] = [
    { id: "all", label: "Все" },
    ...RARITY_ORDER.map((r) => ({
      id: r as Filter,
      label: RARITY[r].label,
      color: RARITY[r].color,
    })),
  ];

  const target = pending ? SKINS.find((s) => s.id === pending) : null;
  const targetPrice = target ? Math.round(target.price * PREMIUM) : 0;

  const buy = () => {
    if (!target) return;
    if (balance < targetPrice) {
      toast.error("Недостаточно средств", "Пополните баланс, чтобы купить предмет");
      return;
    }
    addBalance(
      -targetPrice,
      "sell",
      `Покупка — ${target.weapon} | ${target.name}`,
    );
    const item = createItem(target.id, "trade");
    item.price = Math.round(target.price);
    addItem(item);
    toast.success("Предмет куплен", `${target.weapon} | ${target.name}`);
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs items={tabs} value={filter} onChange={setFilter} className="lg:flex-1" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск предмета"
          iconLeft={<Search size={15} />}
          className="lg:w-64"
          aria-label="Поиск предмета"
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={22} />}
          title="Ничего не найдено"
          description="Измените фильтр редкости или поисковый запрос."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((skin) => {
            const price = Math.round(skin.price * PREMIUM);
            const affordable = !hydrated || balance >= price;
            return (
              <ItemCard
                key={skin.id}
                skin={skin}
                price={price}
                meta={
                  <span className="text-[11.5px] text-slate-500">
                    Продажа за {formatMoney(skin.price)}
                  </span>
                }
                footer={
                  <button
                    onClick={() => setPending(skin.id)}
                    disabled={!affordable}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.06] py-2 text-[12px] font-semibold text-white transition hover:bg-white/[0.13] disabled:opacity-40"
                  >
                    {affordable ? "Купить" : "Не хватает средств"}
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
        onConfirm={buy}
        title="Подтвердите покупку"
        description={
          target ? (
            <>
              {target.weapon} | <strong className="text-white">{target.name}</strong>{" "}
              за {formatMoney(targetPrice)}. С баланса спишется указанная сумма,
              предмет появится в инвентаре.
            </>
          ) : null
        }
        confirmLabel="Купить"
      />
    </>
  );
}
