"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Backpack, Coins, PackageOpen, Send, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { Rarity } from "@/types";
import { useStore } from "@/lib/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { getSkin } from "@/data/skins";
import { RARITY, RARITY_ORDER } from "@/lib/rarity";
import { ItemCard } from "@/components/items/ItemCard";
import { ItemCardSkeleton } from "@/components/ui/Skeleton";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Modal";
import { formatMoney, timeAgo } from "@/lib/format";
import { toast } from "@/lib/store/useToast";

type Filter = Rarity | "all";
type Sort = "recent" | "price-desc" | "price-asc";

export function InventoryGrid() {
  const hydrated = useHydrated();
  const inventory = useStore((s) => s.inventory);
  const sellItem = useStore((s) => s.sellItem);
  const sellMany = useStore((s) => s.sellMany);
  const withdrawItem = useStore((s) => s.withdrawItem);

  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmSellAll, setConfirmSellAll] = useState(false);

  const items = hydrated ? inventory : [];

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: items.length };
    for (const r of RARITY_ORDER) map[r] = 0;
    for (const i of items) map[getSkin(i.skinId).rarity]++;
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    let list = items.filter(
      (i) => filter === "all" || getSkin(i.skinId).rarity === filter,
    );
    if (sort === "recent") list = [...list].sort((a, b) => b.acquiredAt - a.acquiredAt);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    return list;
  }, [items, filter, sort]);

  const totalValue = items
    .filter((i) => i.status === "owned")
    .reduce((s, i) => s + i.price, 0);
  const selectedValue = items
    .filter((i) => selected.includes(i.uid))
    .reduce((s, i) => s + i.price, 0);

  const tabs: TabItem<Filter>[] = [
    { id: "all", label: "Все", count: counts.all },
    ...RARITY_ORDER.map((r) => ({
      id: r as Filter,
      label: RARITY[r].label,
      count: counts[r],
      color: RARITY[r].color,
    })),
  ];

  const toggle = (uid: string) =>
    setSelected((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid],
    );

  const handleSell = (uid: string) => {
    const gained = sellItem(uid);
    setSelected((p) => p.filter((u) => u !== uid));
    if (gained > 0) {
      toast.success("Предмет продан", `На баланс зачислено ${formatMoney(gained)}`);
    }
  };

  const handleWithdraw = (uid: string) => {
    withdrawItem(uid);
    toast.success(
      "Заявка на вывод создана",
      "Предмет уйдёт в Steam в течение 5 минут",
    );
  };

  const sellSelected = () => {
    const total = sellMany(selected);
    setSelected([]);
    toast.success("Продано", `На баланс зачислено ${formatMoney(total)}`);
  };

  if (!hydrated) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <ItemCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* summary */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Предметов"
          value={String(items.length)}
          icon={<Backpack size={16} />}
        />
        <SummaryTile
          label="Общая стоимость"
          value={formatMoney(totalValue)}
          icon={<Coins size={16} />}
          accent="#2FD98A"
        />
        <SummaryTile
          label="На выводе"
          value={String(items.filter((i) => i.status === "withdrawing").length)}
          icon={<Send size={16} />}
          accent="#22D3EE"
        />
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs items={tabs} value={filter} onChange={setFilter} className="lg:flex-1" />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Сортировка"
          className="h-11 cursor-pointer appearance-none rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 text-[13px] text-white outline-none transition focus:border-zev-400/70"
        >
          <option value="recent" className="bg-surface">Сначала новые</option>
          <option value="price-desc" className="bg-surface">Сначала дорогие</option>
          <option value="price-asc" className="bg-surface">Сначала дешёвые</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<PackageOpen size={22} />}
          title={items.length === 0 ? "Инвентарь пуст" : "Нет предметов в категории"}
          description={
            items.length === 0
              ? "Откройте первый кейс, чтобы получить предмет."
              : "Попробуйте выбрать другую редкость."
          }
          action={
            items.length === 0 ? (
              <Link href="/cases">
                <Button>Открыть кейсы</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((item) => {
            const disabled = item.status !== "owned";
            return (
              <ItemCard
                key={item.uid}
                item={item}
                selected={selected.includes(item.uid)}
                onClick={disabled ? undefined : () => toggle(item.uid)}
                meta={
                  <span className="truncate text-[11.5px] text-slate-500">
                    {item.wear} · {timeAgo(item.acquiredAt)}
                  </span>
                }
                footer={
                  <div className="flex gap-1.5">
                    <button
                      disabled={disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSell(item.uid);
                      }}
                      className="flex-1 rounded-lg border border-white/10 bg-white/[0.05] py-1.5 text-[11px] font-medium text-slate-300 transition hover:bg-white/[0.11] hover:text-white disabled:opacity-40"
                    >
                      Продать
                    </button>
                    <Link
                      href="/upgrade"
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-slate-400 transition hover:bg-white/[0.11] hover:text-white"
                      aria-label="Апгрейд"
                    >
                      <TrendingUp size={12} />
                    </Link>
                    <button
                      disabled={disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWithdraw(item.uid);
                      }}
                      aria-label="Вывести"
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-slate-400 transition hover:bg-white/[0.11] hover:text-white disabled:opacity-40"
                    >
                      <Send size={12} />
                    </button>
                  </div>
                }
              />
            );
          })}
        </div>
      )}

      {/* bulk action bar */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-x-3 bottom-[86px] z-[70] lg:inset-x-auto lg:bottom-6 lg:left-1/2 lg:w-[520px] lg:-translate-x-1/2"
          >
            <div className="glass-strong flex items-center gap-3 rounded-2xl px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-white">
                  Выбрано {selected.length}
                </p>
                <p className="text-[12px] text-slate-400">
                  на сумму {formatMoney(selectedValue)}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelected([])}
              >
                Снять
              </Button>
              <Button size="sm" onClick={() => setConfirmSellAll(true)}>
                Продать
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmSellAll}
        onClose={() => setConfirmSellAll(false)}
        onConfirm={sellSelected}
        title={`Продать ${selected.length} предм.?`}
        description={`На баланс будет зачислено ${formatMoney(selectedValue)}. Отменить продажу нельзя.`}
        confirmLabel="Продать"
      />
    </>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  accent = "#6E71FF",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="glass flex items-center gap-3 px-4 py-3.5">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ background: `${accent}18`, color: accent }}
      >
        {icon}
      </span>
      <div>
        <p className="text-[11.5px] uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="text-[17px] font-bold tabular-nums text-white">{value}</p>
      </div>
    </div>
  );
}
