"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownWideNarrow,
  Backpack,
  Coins,
  LogIn,
  PackageOpen,
  Send,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { ApiRequestError, api, type InventoryItem } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { useSession } from "@/lib/client/session";
import { ItemCard } from "@/components/items/ItemCard";
import { ItemCardSkeleton } from "@/components/ui/Skeleton";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { Dropdown } from "@/components/ui/Dropdown";
import { ITEM_KIND_LABEL, itemKind, type ItemKind } from "@/lib/client/display";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Modal";
import { formatMinor, timeAgo } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { RARITY_ORDER } from "@/lib/client/display";

type Sort = "recent" | "price-desc" | "price-asc" | "rarity";

const RARITY_LABEL: Record<string, string> = {
  consumer: "Consumer",
  industrial: "Industrial",
  milspec: "Mil-Spec",
  restricted: "Restricted",
  classified: "Classified",
  covert: "Covert",
  special: "Special",
};

export function InventoryGrid() {
  const { user, ready, setBalance } = useSession();
  const [rarity, setRarity] = useState<string>("all");
  const [kind, setKind] = useState<ItemKind | "all">("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [selected, setSelected] = useState<number[]>([]);
  const [confirmSell, setConfirmSell] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data, loading, reload } = useResource(
    () => (user ? api.inventory({ sort, rarity }) : Promise.resolve(null)),
    [user?.id, sort, rarity],
  );

  const items = data?.items ?? [];
  const counts = data?.counts ?? {};

  const tabs: TabItem<string>[] = useMemo(
    () => [
      { id: "all", label: "Все", count: data?.total },
      ...RARITY_ORDER.map((slug) => ({
        id: slug,
        label: RARITY_LABEL[slug] ?? slug,
        count: counts[slug] ?? 0,
        color: items.find((i) => i.rarity.slug === slug)?.rarity.color,
      })),
    ],
    [data?.total, counts, items],
  );

  /**
   * Kind is filtered client-side on top of the server's rarity query.
   * The weapon name is already in the payload, so this needs no extra
   * round trip and the two filters compose.
   */
  const visible = useMemo(
    () => (kind === "all" ? items : items.filter((i) => itemKind(i.weapon) === kind)),
    [items, kind],
  );

  const kindTabs: TabItem<ItemKind | "all">[] = useMemo(() => {
    const tally = items.reduce<Record<string, number>>((acc, i) => {
      const k = itemKind(i.weapon);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    return [
      { id: "all" as const, label: "Все", count: items.length },
      ...(Object.keys(ITEM_KIND_LABEL) as ItemKind[])
        .filter((k) => (tally[k] ?? 0) > 0)
        .map((k) => ({ id: k, label: ITEM_KIND_LABEL[k], count: tally[k] })),
    ];
  }, [items]);

  const selectedValue = items
    .filter((i) => selected.includes(i.id))
    .reduce((s, i) => s + i.price_minor, 0);

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const sell = async (ids: number[]) => {
    setBusy(true);
    try {
      const res = await api.sell(ids);
      setBalance(res.balance_minor);
      setSelected((prev) => prev.filter((id) => !ids.includes(id)));
      toast.success(
        res.sold === 1 ? "Предмет продан" : `Продано ${res.sold} предм.`,
        `На баланс зачислено ${formatMinor(res.amount_minor)}`,
      );
      reload();
    } catch (err) {
      toast.error(
        "Не удалось продать",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <ItemCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        icon={<LogIn size={22} />}
        title="Войдите в аккаунт"
        description="Инвентарь привязан к аккаунту — предметы хранятся на сервере."
        action={
          <Link href="/login">
            <Button>Войти</Button>
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Предметов"
          value={String(data?.total ?? 0)}
          icon={<Backpack size={16} />}
        />
        <SummaryTile
          label="Общая стоимость"
          value={formatMinor(data?.value_minor ?? 0)}
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

      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs items={kindTabs} value={kind} onChange={setKind} className="lg:flex-1" />
        <Dropdown<Sort>
          value={sort}
          onChange={setSort}
          label="Сортировка"
          align="end"
          className="lg:w-52"
          iconLeft={<ArrowDownWideNarrow size={15} />}
          options={[
            { value: "recent", label: "Сначала новые" },
            { value: "price-desc", label: "Сначала дорогие" },
            { value: "price-asc", label: "Сначала дешёвые" },
            { value: "rarity", label: "По редкости" },
          ]}
        />
      </div>

      <div className="mb-5">
        <Tabs items={tabs} value={rarity} onChange={setRarity} />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<PackageOpen size={22} />}
          title={
            rarity === "all" && kind === "all"
              ? "Инвентарь пуст"
              : "Под фильтры ничего не подошло"
          }
          description={
            rarity === "all" && kind === "all"
              ? "Откройте первый кейс, чтобы получить предмет."
              : "Снимите один из фильтров — редкость или тип предмета."
          }
          action={
            rarity === "all" && kind === "all" ? (
              <Link href="/cases">
                <Button>Открыть кейсы</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {visible.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              selected={selected.includes(item.id)}
              onToggle={() => toggle(item.id)}
              onSell={() => void sell([item.id])}
              busy={busy}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-x-3 bottom-[86px] z-[70] lg:inset-x-auto lg:bottom-6 lg:left-1/2 lg:w-[520px] lg:-translate-x-1/2"
          >
            <div className="glass-strong flex items-center gap-3 rounded-lg px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-white">
                  Выбрано {selected.length}
                </p>
                <p className="text-[12px] text-slate-400">
                  на сумму {formatMinor(selectedValue)}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                Снять
              </Button>
              <Button size="sm" onClick={() => setConfirmSell(true)} loading={busy}>
                Продать
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmSell}
        onClose={() => setConfirmSell(false)}
        onConfirm={() => void sell(selected)}
        title={`Продать ${selected.length} предм.?`}
        description={`На баланс будет зачислено ${formatMinor(selectedValue)}. Отменить продажу нельзя.`}
        confirmLabel="Продать"
      />
    </>
  );
}

function InventoryCard({
  item,
  selected,
  onToggle,
  onSell,
  busy,
}: {
  item: InventoryItem;
  selected: boolean;
  onToggle: () => void;
  onSell: () => void;
  busy: boolean;
}) {
  const locked = item.status !== "owned";

  return (
    <ItemCard
      skin={item}
      selected={selected}
      onClick={locked ? undefined : onToggle}
      badge={
        item.stattrak ? (
          <span className="rounded-md border border-gold-400/40 bg-gold-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-300">
            StatTrak™
          </span>
        ) : locked ? (
          <span className="rounded-md border border-aqua-400/40 bg-aqua-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-aqua-300">
            Вывод
          </span>
        ) : undefined
      }
      meta={
        <span className="block truncate text-[11.5px] text-slate-500">
          {item.wear} · {item.float_value.toFixed(3)}
          <br />
          {item.source_case ? item.source_case.name : "Магазин"} ·{" "}
          {timeAgo(item.acquired_at)}
        </span>
      }
      footer={
        <div className="flex gap-1.5">
          <button
            disabled={locked || busy}
            onClick={(e) => {
              e.stopPropagation();
              onSell();
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
          <Link
            href="/wallet?tab=withdraw"
            onClick={(e) => e.stopPropagation()}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-slate-400 transition hover:bg-white/[0.11] hover:text-white"
            aria-label="Вывести"
          >
            <Send size={12} />
          </Link>
        </div>
      }
    />
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
