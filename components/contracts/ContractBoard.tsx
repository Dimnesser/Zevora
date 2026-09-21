"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogIn, Search, Sparkles } from "lucide-react";
import {
  ApiRequestError,
  api,
  type ContractGroup,
  type ContractResult,
  type InventoryItem,
} from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { useSession } from "@/lib/client/session";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ItemCard } from "@/components/items/ItemCard";
import { ContractSlots, FloatGauge, SummaryRow } from "@/components/contracts/ContractSlots";
import { ContractReveal } from "@/components/contracts/ContractResult";
import { rarityColor } from "@/lib/client/display";
import { formatMinor } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { wearForFloat } from "@/lib/client/wear";
import { cn } from "@/lib/utils";

/**
 * The trade-up contract board.
 *
 * Left: the machine — ten sockets, the float gauge and the summary.
 * Right: the inventory, filtered to the rarity the contract is locked to,
 * because mixing rarities is not a mistake worth letting a player make.
 *
 * The first item picked decides the rarity; clearing the slots unlocks it
 * again. Everything shown before submitting — the projected wear, the
 * value going in — is computed from the same rules the server applies, so
 * the preview never promises something the contract will not deliver.
 */
export function ContractBoard() {
  const { user, ready, setBalance } = useSession();
  const [picked, setPicked] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [selling, setSelling] = useState(false);
  const [result, setResult] = useState<ContractResult | null>(null);
  const [consumed, setConsumed] = useState<InventoryItem[]>([]);
  const [nonce, setNonce] = useState(0);

  const { data: meta } = useResource(
    () => (user ? api.contracts() : Promise.resolve(null)),
    [user?.id, nonce],
  );
  const { data: inv, loading } = useResource(
    () => (user ? api.inventory({ sort: "rarity" }) : Promise.resolve(null)),
    [user?.id, nonce],
  );

  const size = meta?.size ?? 10;
  const items = useMemo(
    () => (inv?.items ?? []).filter((i) => i.status === "owned"),
    [inv],
  );
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const chosen = picked.map((id) => byId.get(id)).filter(Boolean) as InventoryItem[];

  /** The first pick locks the contract to one rarity, as in the game. */
  const lockedRarity = chosen[0]?.rarity.slug ?? null;
  const group: ContractGroup | undefined = lockedRarity
    ? meta?.groups.find((g) => g.rarity.slug === lockedRarity)
    : undefined;
  const inColor = rarityColor(lockedRarity ?? "", chosen[0]?.rarity.color ?? "#8B95AE");
  const outColor = group ? rarityColor(group.next.slug, group.next.color) : "#8B95AE";

  const eligible = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Rarities with nothing above them cannot start a contract at all.
    const tradable = new Set(meta?.groups.map((g) => g.rarity.slug) ?? []);
    // Once a contract is started its rarity wins; before that, the chip
    // the player tapped decides what the grid shows.
    const only = lockedRarity ?? filter;
    return items
      .filter((i) => tradable.has(i.rarity.slug))
      .filter((i) => !only || i.rarity.slug === only)
      .filter((i) => !q || i.market_name.toLowerCase().includes(q));
  }, [items, meta, lockedRarity, filter, query]);

  const avgFloat =
    chosen.length > 0
      ? chosen.reduce((s, i) => s + i.float_value, 0) / chosen.length
      : null;
  const stake = chosen.reduce((s, i) => s + i.price_minor, 0);
  const full = chosen.length === size;

  const toggle = (id: number) => {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= size) return prev;
      return [...prev, id];
    });
  };

  const submit = async () => {
    if (!full) return;
    setRunning(true);
    setConsumed(chosen);
    try {
      const res = await api.runContract(picked);
      setResult(res);
      setPicked([]);
      setNonce((n) => n + 1);
    } catch (err) {
      toast.error(
        "Контракт не исполнен",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    } finally {
      setRunning(false);
    }
  };

  const sellWon = async () => {
    if (!result) return;
    setSelling(true);
    try {
      const res = await api.sell([result.won.inventory_id]);
      setBalance(res.balance_minor);
      toast.success("Предмет продан", formatMinor(res.amount_minor));
      setResult(null);
      setNonce((n) => n + 1);
    } catch (err) {
      toast.error(
        "Не удалось продать",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    } finally {
      setSelling(false);
    }
  };

  if (!ready) return <Skeleton className="h-[520px] w-full rounded-lg" />;

  if (!user) {
    return (
      <EmptyState
        icon={<LogIn size={22} />}
        title="Войдите в аккаунт"
        description="Контракты собираются из предметов вашего инвентаря."
        action={
          <Link href="/login">
            <Button>Войти</Button>
          </Link>
        }
      />
    );
  }

  if (result) {
    const wonItem = items.find((i) => i.id === result.won.inventory_id) ?? null;
    return (
      <Card strong className="p-5 sm:p-7">
        <ContractReveal
          result={result}
          inputs={consumed}
          won={wonItem}
          color={outColor === "#8B95AE" ? "#6E71FF" : outColor}
          selling={selling}
          onAgain={() => setResult(null)}
          onSell={() => void sellWon()}
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      {/* ═══ the machine ═══ */}
      <Card strong className="relative p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg,transparent,${lockedRarity ? inColor : "#6E71FF"},transparent)`,
          }}
        />

        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[15px] font-semibold text-white">Контракт</h2>
          <span className="meta tnum">
            {chosen.length} / {size}
          </span>
        </div>

        <ContractSlots
          size={size}
          items={chosen}
          color={lockedRarity ? inColor : "#6E71FF"}
          onRemove={toggle}
        />

        {/* ── the trade ── */}
        <div className="mt-5 flex items-center justify-center gap-3">
          <Tier
            label={group?.rarity.name ?? "Редкость"}
            color={lockedRarity ? inColor : "#3A4152"}
          />
          <motion.span
            aria-hidden
            className="text-slate-600"
            animate={full ? { x: [0, 5, 0] } : {}}
            transition={{ duration: 1.3, repeat: Infinity }}
          >
            →
          </motion.span>
          <Tier label={group?.next.name ?? "Следующая"} color={group ? outColor : "#3A4152"} />
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="meta">Средний float</span>
            <span className="meta tnum text-slate-300">
              {avgFloat === null ? "—" : avgFloat.toFixed(4)}
            </span>
          </div>
          <FloatGauge value={avgFloat} />
          <p className="meta mt-2 text-slate-600">
            {avgFloat === null
              ? "Износ результата — среднее по вложенным предметам"
              : `Ожидаемый износ: ${wearForFloat(avgFloat)}`}
          </p>
        </div>

        <div className="ticks mt-5 rounded-sm border border-line-soft bg-white/[0.02] px-3.5 py-2.5 text-white/15">
          <SummaryRow label="Вложено" value={formatMinor(stake)} />
          <SummaryRow
            label="Возможных исходов"
            value={group ? String(group.outcomes) : "—"}
            tone={group ? outColor : undefined}
          />
        </div>

        <Button
          size="xl"
          variant="accent"
          fullWidth
          className="mt-4"
          disabled={!full}
          loading={running}
          iconLeft={<Sparkles size={16} />}
          onClick={() => void submit()}
        >
          {full ? "Исполнить контракт" : `Ещё ${size - chosen.length} предм.`}
        </Button>

        {picked.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setPicked([]);
              setFilter(null);
            }}
            className="meta mx-auto mt-3 block text-slate-500 transition-colors hover:text-white"
          >
            Очистить
          </button>
        )}
      </Card>

      {/* ═══ the inventory ═══ */}
      <Card className="flex min-h-0 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[15px] font-semibold text-white">
            {lockedRarity ? `Предметы: ${group?.rarity.name ?? lockedRarity}` : "Инвентарь"}
          </h2>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск"
            iconLeft={<Search size={15} />}
            className="w-full sm:w-56"
            aria-label="Поиск по инвентарю"
          />
        </div>

        {/* A ladder of what the player owns, so the page is useful even
            with nothing selected. */}
        {meta && meta.groups.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {meta.groups.map((g) => {
              const c = rarityColor(g.rarity.slug, g.rarity.color);
              const enough = g.owned >= size;
              const on = (lockedRarity ?? filter) === g.rarity.slug;
              return (
                <button
                  key={g.rarity.slug}
                  type="button"
                  disabled={Boolean(lockedRarity)}
                  aria-pressed={on}
                  onClick={() => setFilter(on ? null : g.rarity.slug)}
                  className={cn(
                    "meta rounded-xs border px-2 py-1 tnum transition-colors duration-200",
                    on || enough ? "text-white" : "text-slate-500",
                    !lockedRarity && "hover:text-white",
                    lockedRarity && !on && "opacity-40",
                  )}
                  style={{
                    borderColor: on ? c : enough ? `${c}59` : undefined,
                    background: on ? `${c}26` : enough ? `${c}14` : undefined,
                  }}
                >
                  {g.rarity.name} {enough ? `${g.owned} шт.` : `${g.owned}/${size}`}
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-sm" />
            ))}
          </div>
        ) : eligible.length === 0 ? (
          <EmptyState
            title={lockedRarity ? "Больше нечего добавить" : "Нет подходящих предметов"}
            description={
              lockedRarity
                ? "Предметы других редкостей в этот контракт не идут."
                : "Для контракта нужны предметы одной редкости — откройте кейсы."
            }
            action={
              <Link href="/cases">
                <Button>Открыть кейсы</Button>
              </Link>
            }
            className="py-12"
          />
        ) : (
          <div className="no-scrollbar grid max-h-[560px] grid-cols-2 gap-2.5 overflow-y-auto pr-0.5 sm:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence initial={false}>
              {eligible.map((item) => (
                <ItemCard
                  key={item.id}
                  skin={item}
                  size="sm"
                  selected={picked.includes(item.id)}
                  disabled={!picked.includes(item.id) && full}
                  onClick={() => toggle(item.id)}
                  meta={
                    <span className="meta truncate">
                      {item.wear} · {item.float_value.toFixed(3)}
                    </span>
                  }
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>
    </div>
  );
}

function Tier({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="meta rounded-xs border px-2.5 py-1.5"
      style={{ borderColor: `${color}59`, background: `${color}14`, color }}
    >
      {label}
    </span>
  );
}
