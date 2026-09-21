"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, LogIn, Sparkles, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import {
  ApiRequestError,
  api,
  type CaseItem,
  type InventoryItem,
} from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { useSession } from "@/lib/client/session";
import { SkinImage } from "@/components/art/SkinImage";
import { UpgradeDial, type DialState } from "@/components/upgrade/UpgradeDial";
import { StakePicker, TargetPicker } from "@/components/upgrade/ItemPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMinor, formatPercent } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { playFail, playWin } from "@/lib/client/sound";
import { cn } from "@/lib/utils";

const SPIN_MS = 3800;
const MAX_STAKE = 5;
const MAX_CHANCE = 0.85;
const HOUSE_EDGE = 0.92;

interface Settled {
  success: boolean;
  chance: number;
  rotation: number;
  stakeMinor: number;
  targetName: string;
  wonMinor: number;
  /**
   * The staked items, copied at submit time. The server consumes them and
   * the inventory reload drops them, so without a copy the stake slot
   * would empty out mid-spin — which is precisely when a player is
   * looking at it.
   */
  stakeItems: InventoryItem[];
}

/**
 * Upgrade board.
 *
 * The server resolves the attempt and returns both the outcome and the
 * roll; the dial then spins to a needle position derived from that roll,
 * so the animation illustrates the result rather than producing it.
 */
export function UpgradeBoard() {
  const { user, ready, refresh } = useSession();
  const [stakeIds, setStakeIds] = useState<number[]>([]);
  const [target, setTarget] = useState<CaseItem | null>(null);
  const [state, setState] = useState<DialState>("idle");
  const [rotation, setRotation] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * `busy` is state, so a second click in the same tick still sees false
   * and fires a second attempt with items the first one is consuming.
   * The ref closes that window; the state stays for rendering.
   */
  const inFlight = useRef(false);

  const { data: inventory, reload } = useResource(
    () => (user ? api.inventory({ sort: "price-desc" }) : Promise.resolve(null)),
    [user?.id],
  );

  // Every skin any case can drop is a valid upgrade target.
  const { data: catalogue } = useResource(async () => {
    const { cases } = await api.cases();
    const details = await Promise.all(
      cases.map((c) => api.caseDetail(c.slug).catch(() => null)),
    );
    const bySkin = new Map<number, CaseItem>();
    for (const d of details) {
      for (const item of d?.items ?? []) {
        if (!bySkin.has(item.skin_id)) bySkin.set(item.skin_id, item);
      }
    }
    return [...bySkin.values()];
  }, []);

  const owned: InventoryItem[] = useMemo(
    () => (inventory?.items ?? []).filter((i) => i.status === "owned"),
    [inventory],
  );

  const liveStakeItems = owned.filter((i) => stakeIds.includes(i.id));
  const liveStake = liveStakeItems.reduce((s, i) => s + i.price_minor, 0);

  const isSettled = state === "win" || state === "lose";
  // Once an attempt is submitted the panel shows what was staked, not
  // what is currently selected — the spin, the result and everything in
  // between describe the same attempt.
  const frozen = state !== "idle" ? settled : null;
  const stakeItems = frozen?.stakeItems ?? liveStakeItems;
  const stakeValue = frozen?.stakeMinor ?? liveStake;
  const liveChance = target
    ? Math.min(MAX_CHANCE, Math.max(0.01, (liveStake / target.price_minor) * HOUSE_EDGE))
    : 0;
  const chance = frozen?.chance ?? liveChance;
  const multiplier = target && stakeValue > 0 ? target.price_minor / stakeValue : 0;
  const profit = target ? target.price_minor - stakeValue : 0;
  const canStart = liveStakeItems.length > 0 && Boolean(target) && state === "idle";

  const toggleStake = (id: number) => {
    if (state === "spinning") return;
    setSettled(null);
    setState("idle");
    setStakeIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX_STAKE
          ? (toast.error(`Максимум ${MAX_STAKE} предметов в ставке`), prev)
          : [...prev, id],
    );
  };

  const pickTarget = (skin: CaseItem) => {
    if (state === "spinning") return;
    setSettled(null);
    setState("idle");
    setTarget(skin);
  };

  const start = async () => {
    if (!canStart || !target || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      // Only ids the current inventory still contains. A selection made
      // before the list refreshed can otherwise carry an id the server
      // has already consumed, and the whole attempt is refused for it.
      const ids = liveStakeItems.map((i) => i.id);
      const res = await api.upgrade(ids, target.skin_id);

      // Convert the server's roll into a needle angle inside (success) or
      // outside (failure) the winning arc.
      const arc = res.chance * 360;
      const landing = res.success
        ? Math.min(arc * 0.96, Math.max(arc * 0.04, res.roll * 360))
        : arc + Math.min(359, Math.max(4, (res.roll - res.chance) / (1 - res.chance) * (360 - arc) * 0.94 + 4));

      setRotation(5 * 360 + landing);
      setSettled({
        success: res.success,
        stakeItems: liveStakeItems,
        chance: res.chance,
        rotation: 5 * 360 + landing,
        stakeMinor: res.stake_minor,
        targetName: res.target.market_name,
        wonMinor: res.won?.price_minor ?? 0,
      });
      setState("spinning");
      setStakeIds([]);
    } catch (err) {
      toast.error(
        "Не удалось выполнить апгрейд",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
      // The usual reason an attempt is refused is that the list is out of
      // date — an item was consumed or sold elsewhere. Refetching here is
      // what stops one stale entry turning into an endless run of the
      // same error, which is exactly how this looked in practice.
      setStakeIds([]);
      setState("idle");
      setSettled(null);
      reload();
      void refresh();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const onSettled = () => {
    if (!settled) return;
    setState(settled.success ? "win" : "lose");
    if (settled.success) {
      playWin(5);
      toast.rare("Апгрейд удался", `${settled.targetName} · ${formatMinor(settled.wonMinor)}`);
    } else {
      playFail();
      toast.error("Апгрейд не удался", `Потеряно предметов на ${formatMinor(settled.stakeMinor)}`);
    }
    reload();
    void refresh();
  };

  const reset = () => {
    setState("idle");
    setSettled(null);
    setTarget(null);
    setStakeIds([]);
    // The board has been sitting on one snapshot since the attempt; the
    // inventory has moved on.
    reload();
  };

  if (ready && !user) {
    return (
      <EmptyState
        icon={<LogIn size={22} />}
        title="Войдите в аккаунт"
        description="Апгрейд работает с предметами вашего инвентаря."
        action={
          <Link href="/login">
            <Button>Войти</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-5">
      <Card className="order-2 p-4 lg:order-1">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-white">Ваш предмет</h2>
          <span className="text-[12px] text-slate-500">
            {liveStakeItems.length}/{MAX_STAKE}
          </span>
        </div>
        <StakePicker items={owned} selected={stakeIds} onToggle={toggleStake} />
      </Card>

      <Card strong className="order-1 p-5 lg:order-2 lg:p-6">
        <div className="mb-5 flex items-center justify-center gap-3">
          <StageSlot
            label="Ставка"
            items={stakeItems}
            valueMinor={stakeValue}
            empty={isSettled ? "Ставка сгорела" : "Выберите предмет"}
            onClear={liveStakeItems.length && state === "idle" ? () => setStakeIds([]) : undefined}
          />
          <ArrowRight size={18} className="shrink-0 text-slate-600" />
          <StageSlot
            label="Цель"
            items={target ? [target] : []}
            valueMinor={target?.price_minor ?? 0}
            empty="Выберите цель"
            onClear={target && state === "idle" ? () => setTarget(null) : undefined}
          />
        </div>

        <UpgradeDial
          chance={chance}
          state={state}
          rotation={rotation}
          durationMs={SPIN_MS}
          onSettled={onSettled}
        />

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Stat label="Множитель" value={multiplier ? `×${multiplier.toFixed(2)}` : "—"} />
          <Stat
            label="Прибыль"
            value={profit > 0 ? `+${formatMinor(profit)}` : "—"}
            accent={profit > 0 ? "#2FD98A" : undefined}
          />
          <Stat label="Максимум" value={formatPercent(MAX_CHANCE, 0)} />
        </div>

        <div className="mt-5">
          <AnimatePresence mode="wait">
            {isSettled && settled ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <ResultBanner settled={settled} />
                <Button size="lg" fullWidth variant="secondary" onClick={reset}>
                  Новый апгрейд
                </Button>
              </motion.div>
            ) : (
              <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button
                  size="xl"
                  fullWidth
                  disabled={!canStart}
                  loading={state === "spinning" || busy}
                  onClick={() => void start()}
                  iconLeft={state === "spinning" ? undefined : <TrendingUp size={17} />}
                  className="uppercase tracking-wider"
                >
                  {state === "spinning" ? "Крутим…" : "Улучшить"}
                </Button>
                {!canStart && state === "idle" && (
                  <p className="mt-2.5 text-center text-[12.5px] text-slate-500">
                    {liveStakeItems.length === 0
                      ? "Выберите предмет из инвентаря"
                      : "Выберите предмет, который хотите получить"}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      <Card className="order-3 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-white">Хочу получить</h2>
          <Link href="/cases" className="text-[12px] text-zev-300 transition hover:text-white">
            Все предметы
          </Link>
        </div>
        <TargetPicker
          catalogue={catalogue ?? []}
          stakeValue={liveStake}
          selectedSkinId={target?.skin_id ?? null}
          onSelect={pickTarget}
        />
      </Card>
    </div>
  );
}

function StageSlot({
  label,
  items,
  valueMinor,
  empty,
  onClear,
}: {
  label: string;
  items: { market_name: string; finish: string; image_url: string | null; art: CaseItem["art"]; rarity: CaseItem["rarity"] }[];
  valueMinor: number;
  empty: string;
  onClear?: () => void;
}) {
  const primary = items[0];
  const color = primary ? primary.rarity.color : "#2A3049";

  return (
    <div
      className="relative flex h-[104px] flex-1 flex-col items-center justify-center rounded-lg border px-2 py-2 transition-colors"
      style={{
        borderColor: primary ? `${color}55` : "rgba(255,255,255,.07)",
        background: primary ? `${color}12` : "rgba(255,255,255,.02)",
      }}
    >
      <span className="absolute left-2.5 top-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>

      {onClear && (
        <button
          onClick={onClear}
          aria-label="Очистить"
          className="absolute right-1.5 top-1.5 rounded-md p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
        >
          <X size={12} />
        </button>
      )}

      {primary ? (
        <>
          <div className="h-9 w-full">
            <SkinImage
              imageUrl={primary.image_url}
              art={primary.art}
              label={primary.market_name}
              glow={false}
            />
          </div>
          <p className="mt-1 max-w-full truncate px-1 text-[11px] font-semibold text-white">
            {items.length > 1 ? `${items.length} предмета` : primary.finish}
          </p>
          <p className="text-[11.5px] font-bold tabular-nums" style={{ color }}>
            {formatMinor(valueMinor)}
          </p>
        </>
      ) : (
        <p className="px-2 text-center text-[11.5px] text-slate-600">{empty}</p>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-2.5 py-2.5 text-center">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-[14px] font-bold tabular-nums" style={{ color: accent ?? "#fff" }}>
        {value}
      </p>
    </div>
  );
}

function ResultBanner({ settled }: { settled: Settled }) {
  const color = settled.success ? "#2FD98A" : "#FF4D5E";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("flex items-center gap-3 rounded-lg border px-4 py-3")}
      style={{ borderColor: `${color}44`, background: `${color}12` }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${color}22`, color }}
      >
        {settled.success ? <Sparkles size={16} /> : <X size={16} />}
      </span>
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold" style={{ color }}>
          {settled.success ? "Апгрейд удался" : "Апгрейд не удался"}
        </p>
        <p className="truncate text-[12px] text-slate-400">
          {settled.success
            ? `${settled.targetName} уже в инвентаре`
            : `Потеряно предметов на ${formatMinor(settled.stakeMinor)}`}
        </p>
      </div>
    </motion.div>
  );
}
