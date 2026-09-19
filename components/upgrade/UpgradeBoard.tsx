"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import type { Skin } from "@/types";
import { useStore } from "@/lib/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { getSkin } from "@/data/skins";
import { RARITY } from "@/lib/rarity";
import {
  MAX_CHANCE,
  rollUpgrade,
  upgradeChance,
  upgradeMultiplier,
  upgradeProfit,
} from "@/lib/upgrade";
import { SkinArt } from "@/components/art/SkinArt";
import { UpgradeDial, type DialState } from "@/components/upgrade/UpgradeDial";
import { StakePicker, TargetPicker } from "@/components/upgrade/ItemPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatMoney, formatPercent } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { cn } from "@/lib/utils";

const SPIN_MS = 3800;
const MAX_STAKE = 5;

export function UpgradeBoard() {
  const hydrated = useHydrated();
  const inventory = useStore((s) => s.inventory);
  const applyUpgrade = useStore((s) => s.applyUpgrade);

  const [stakeUids, setStakeUids] = useState<string[]>([]);
  const [target, setTarget] = useState<Skin | null>(null);
  const [state, setState] = useState<DialState>("idle");
  const [rotation, setRotation] = useState(0);
  /**
   * Snapshot taken when the spin starts. The staked items are consumed on
   * settle, so the result screen must not recompute from live state.
   */
  const [outcome, setOutcome] = useState<{
    success: boolean;
    skinId: string;
    stakeValue: number;
    chance: number;
    multiplier: number;
    profit: number;
  } | null>(null);

  const owned = useMemo(
    () => (hydrated ? inventory.filter((i) => i.status === "owned") : []),
    [inventory, hydrated],
  );

  const stakeItems = useMemo(
    () => owned.filter((i) => stakeUids.includes(i.uid)),
    [owned, stakeUids],
  );
  const stakeValue = stakeItems.reduce((s, i) => s + i.price, 0);

  const liveChance = target ? upgradeChance(stakeValue, target.price) : 0;
  const liveMultiplier = target ? upgradeMultiplier(stakeValue, target.price) : 0;
  const liveProfit = target ? upgradeProfit(stakeValue, target.price) : 0;

  // After the spin the stake no longer exists, so show the snapshot instead.
  const settled = state === "win" || state === "lose";
  const chance = settled && outcome ? outcome.chance : liveChance;
  const multiplier = settled && outcome ? outcome.multiplier : liveMultiplier;
  const profit = settled && outcome ? outcome.profit : liveProfit;

  const ready = stakeItems.length > 0 && Boolean(target) && state === "idle";

  const toggleStake = (uid: string) => {
    if (state === "spinning") return;
    setOutcome(null);
    setState("idle");
    setStakeUids((prev) =>
      prev.includes(uid)
        ? prev.filter((u) => u !== uid)
        : prev.length >= MAX_STAKE
          ? (toast.error(`Максимум ${MAX_STAKE} предметов в ставке`), prev)
          : [...prev, uid],
    );
  };

  const pickTarget = (skin: Skin) => {
    if (state === "spinning") return;
    setOutcome(null);
    setState("idle");
    setTarget(skin);
  };

  const start = () => {
    if (!ready || !target) return;
    const roll = rollUpgrade(liveChance);
    setRotation(roll.rotation);
    setOutcome({
      success: roll.success,
      skinId: target.id,
      stakeValue,
      chance: liveChance,
      multiplier: liveMultiplier,
      profit: liveProfit,
    });
    setState("spinning");
  };

  const settle = () => {
    if (!outcome || !target) return;
    const won = applyUpgrade(stakeUids, target.id, outcome.success);
    setState(outcome.success ? "win" : "lose");

    if (outcome.success && won) {
      toast.rare(
        "Апгрейд удался",
        `${target.weapon} | ${target.name} · ${formatMoney(won.price)}`,
      );
    } else {
      toast.error(
        "Апгрейд не удался",
        `Потеряно предметов на ${formatMoney(outcome.stakeValue)}`,
      );
    }
    setStakeUids([]);
  };

  const reset = () => {
    setState("idle");
    setOutcome(null);
    setTarget(null);
    setStakeUids([]);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-5">
      {/* ───────── stake ───────── */}
      <Card className="order-2 p-4 lg:order-1">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-white">Ваш предмет</h2>
          <span className="text-[12px] text-slate-500">
            {stakeItems.length}/{MAX_STAKE}
          </span>
        </div>
        <StakePicker
          items={owned}
          selected={stakeUids}
          onToggle={toggleStake}
        />
      </Card>

      {/* ───────── dial ───────── */}
      <Card strong className="order-1 p-5 lg:order-2 lg:p-6">
        <div className="mb-5 flex items-center justify-center gap-3">
          <StageSlot
            label="Ставка"
            skins={stakeItems.map((i) => getSkin(i.skinId))}
            value={settled && outcome ? outcome.stakeValue : stakeValue}
            empty={settled ? "Ставка сгорела" : "Выберите предмет"}
            onClear={
              stakeItems.length && state === "idle"
                ? () => setStakeUids([])
                : undefined
            }
          />
          <ArrowRight size={18} className="shrink-0 text-slate-600" />
          <StageSlot
            label="Цель"
            skins={target ? [target] : []}
            value={target?.price ?? 0}
            empty="Выберите цель"
            onClear={target && state === "idle" ? () => setTarget(null) : undefined}
          />
        </div>

        <UpgradeDial
          chance={chance}
          state={state}
          rotation={rotation}
          durationMs={SPIN_MS}
          onSettled={settle}
        />

        {/* stats */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Stat label="Множитель" value={multiplier ? `×${multiplier.toFixed(2)}` : "—"} />
          <Stat
            label="Прибыль"
            value={profit > 0 ? `+${formatMoney(profit)}` : "—"}
            accent={profit > 0 ? "#2FD98A" : undefined}
          />
          <Stat
            label="Максимум"
            value={formatPercent(MAX_CHANCE, 0)}
          />
        </div>

        <div className="mt-5">
          <AnimatePresence mode="wait">
            {state === "win" || state === "lose" ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <ResultBanner
                  success={state === "win"}
                  skinId={outcome?.skinId ?? null}
                  lost={outcome?.stakeValue ?? 0}
                />
                <Button size="lg" fullWidth variant="secondary" onClick={reset}>
                  Новый апгрейд
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="cta"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Button
                  size="xl"
                  fullWidth
                  disabled={!ready}
                  loading={state === "spinning"}
                  onClick={start}
                  iconLeft={
                    state === "spinning" ? undefined : <TrendingUp size={17} />
                  }
                  className="uppercase tracking-wider"
                >
                  {state === "spinning" ? "Крутим…" : "Улучшить"}
                </Button>
                {!ready && state === "idle" && (
                  <p className="mt-2.5 text-center text-[12.5px] text-slate-500">
                    {stakeItems.length === 0
                      ? "Выберите предмет из инвентаря"
                      : "Выберите предмет, который хотите получить"}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* ───────── target ───────── */}
      <Card className="order-3 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-white">Хочу получить</h2>
          <Link
            href="/cases"
            className="text-[12px] text-zev-300 transition hover:text-white"
          >
            Все предметы
          </Link>
        </div>
        <TargetPicker
          stakeValue={stakeValue}
          selectedId={target?.id ?? null}
          onSelect={pickTarget}
        />
      </Card>
    </div>
  );
}

function StageSlot({
  label,
  skins,
  value,
  empty,
  onClear,
}: {
  label: string;
  skins: Skin[];
  value: number;
  empty: string;
  onClear?: () => void;
}) {
  const primary = skins[0];
  const color = primary ? RARITY[primary.rarity].color : "#2A3049";

  return (
    <div
      className="relative flex h-[104px] flex-1 flex-col items-center justify-center rounded-2xl border px-2 py-2 transition-colors"
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
            <SkinArt skin={primary} glow={false} />
          </div>
          <p className="mt-1 max-w-full truncate px-1 text-[11px] font-semibold text-white">
            {skins.length > 1 ? `${skins.length} предмета` : primary.name}
          </p>
          <p className="text-[11.5px] font-bold tabular-nums" style={{ color }}>
            {formatMoney(value)}
          </p>
        </>
      ) : (
        <p className="px-2 text-center text-[11.5px] text-slate-600">{empty}</p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-2.5 py-2.5 text-center">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className="mt-0.5 text-[14px] font-bold tabular-nums"
        style={{ color: accent ?? "#fff" }}
      >
        {value}
      </p>
    </div>
  );
}

function ResultBanner({
  success,
  skinId,
  lost,
}: {
  success: boolean;
  skinId: string | null;
  lost: number;
}) {
  const skin = skinId ? getSkin(skinId) : null;
  const color = success ? "#2FD98A" : "#FF4D5E";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3",
      )}
      style={{ borderColor: `${color}44`, background: `${color}12` }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${color}22`, color }}
      >
        {success ? <Sparkles size={16} /> : <X size={16} />}
      </span>
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold" style={{ color }}>
          {success ? "Апгрейд удался" : "Апгрейд не удался"}
        </p>
        <p className="truncate text-[12px] text-slate-400">
          {success && skin
            ? `${skin.weapon} | ${skin.name} уже в инвентаре`
            : `Потеряно предметов на ${formatMoney(lost)}`}
        </p>
      </div>
    </motion.div>
  );
}
