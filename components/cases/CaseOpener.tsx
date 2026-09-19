"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gauge, Play, Wallet } from "lucide-react";
import Link from "next/link";
import type { CaseDefinition, InventoryItem } from "@/types";
import { useStore } from "@/lib/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { rollCase } from "@/lib/roll";
import { getSkin } from "@/data/skins";
import { RARITY, rarityRank } from "@/lib/rarity";
import { Roulette } from "@/components/cases/Roulette";
import { DropReveal } from "@/components/cases/DropReveal";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { uid, cn } from "@/lib/utils";

const COUNTS = [1, 2, 3, 4] as const;
type Count = (typeof COUNTS)[number];

const SPIN_MS = 6200;
const FAST_MS = 2200;

type Phase = "idle" | "spinning" | "result";

/** Full open flow: bet size, spin, reveal, keep or sell. */
export function CaseOpener({ def }: { def: CaseDefinition }) {
  const hydrated = useHydrated();
  const balance = useStore((s) => s.user.balance);
  const isPartner = useStore((s) => Boolean(s.user.partner));
  const chargeCase = useStore((s) => s.chargeCase);
  const commitDrop = useStore((s) => s.commitDrop);
  const sellMany = useStore((s) => s.sellMany);
  const pushLiveDrop = useStore((s) => s.pushLiveDrop);
  const username = useStore((s) => s.user.username);

  const [count, setCount] = useState<Count>(1);
  const [fast, setFast] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [winners, setWinners] = useState<(string | null)[]>([null]);
  const [drops, setDrops] = useState<InventoryItem[]>([]);
  const [finished, setFinished] = useState(0);

  const unitPrice = def.partnerOnly ? 0 : def.price;
  const totalPrice = unitPrice * count;
  const canAfford = !hydrated || balance >= totalPrice;
  const locked = Boolean(def.partnerOnly) && hydrated && !isPartner;
  const duration = fast ? FAST_MS : SPIN_MS;

  const handleFinished = useCallback(() => {
    setFinished((n) => n + 1);
  }, []);

  // When every lane has settled, commit the drops and show the result.
  const onAllSettled = useCallback(
    (ids: string[]) => {
      const committed = ids.map((id) => commitDrop(id, def));
      setDrops(committed);
      setPhase("result");

      const best = committed.reduce((a, b) => (b.price > a.price ? b : a));
      const bestSkin = getSkin(best.skinId);
      if (rarityRank(bestSkin.rarity) >= 3) {
        toast.rare(
          `${bestSkin.weapon} | ${bestSkin.name}`,
          `${RARITY[bestSkin.rarity].label} · ${formatMoney(best.price)}`,
        );
      }
      // Surface the user's own drop in the live feed too.
      pushLiveDrop({
        id: uid("live"),
        username,
        avatarSeed: username,
        skinId: best.skinId,
        caseSlug: def.slug,
        at: Date.now(),
      });
    },
    [commitDrop, def, pushLiveDrop, username],
  );

  // Advance to the result once every lane has reported in.
  useEffect(() => {
    if (phase !== "spinning" || finished < count) return;
    const ids = winners.filter((w): w is string => Boolean(w));
    if (ids.length !== count) return;
    onAllSettled(ids);
  }, [phase, finished, count, winners, onAllSettled]);

  const start = () => {
    if (locked) {
      toast.error("Кейс закрыт", "Доступен только партнёрам Zevora");
      return;
    }
    if (!canAfford) {
      toast.error("Недостаточно средств", "Пополните баланс, чтобы открыть кейс");
      return;
    }
    // Charge each lane separately so a partial failure is impossible.
    for (let i = 0; i < count; i++) {
      if (!chargeCase(def)) {
        toast.error("Недостаточно средств");
        return;
      }
    }
    const rolled = Array.from({ length: count }, () => rollCase(def));
    setDrops([]);
    setFinished(0);
    setWinners(rolled);
    setPhase("spinning");
  };

  const reset = () => {
    setPhase("idle");
    setWinners(Array.from({ length: count }, () => null));
    setFinished(0);
    setDrops([]);
  };

  const keep = () => {
    toast.success(
      drops.length > 1 ? `${drops.length} предмета в инвентаре` : "Предмет в инвентаре",
      "Найдёте его на странице «Инвентарь»",
    );
    reset();
  };

  const sell = () => {
    const total = sellMany(drops.map((d) => d.uid));
    toast.success("Продано", `На баланс зачислено ${formatMoney(total)}`);
    reset();
  };

  const changeCount = (n: Count) => {
    if (phase === "spinning") return;
    setCount(n);
    setWinners(Array.from({ length: n }, () => null));
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {phase === "result" ? (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-2"
          >
            <DropReveal
              items={drops}
              onKeep={keep}
              onSell={sell}
              onAgain={() => {
                reset();
                // Let the strip reset before charging again.
                setTimeout(start, 60);
              }}
              againLabel={`Открыть ещё · ${formatMoney(totalPrice)}`}
              canAfford={balance >= totalPrice}
            />
          </motion.div>
        ) : (
          <motion.div
            key="reels"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2.5"
          >
            {Array.from({ length: count }).map((_, lane) => (
              <Roulette
                key={`${def.id}-${lane}-${count}`}
                def={def}
                lane={lane}
                winnerSkinId={phase === "spinning" ? winners[lane] ?? null : null}
                spinning={phase === "spinning"}
                durationMs={duration + lane * 220}
                onFinished={handleFinished}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {phase !== "result" && (
        <div className="mt-5 flex flex-col gap-4">
          {/* lane count + fast toggle */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
              {COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => changeCount(n)}
                  disabled={phase === "spinning"}
                  className={cn(
                    "h-9 w-11 rounded-lg text-[13px] font-semibold transition",
                    count === n
                      ? "bg-white/[0.12] text-white"
                      : "text-slate-400 hover:text-white",
                    phase === "spinning" && "opacity-40",
                  )}
                >
                  ×{n}
                </button>
              ))}
            </div>

            <button
              onClick={() => setFast((v) => !v)}
              disabled={phase === "spinning"}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-medium transition",
                fast
                  ? "border-aqua-400/50 bg-aqua-400/[0.12] text-aqua-300"
                  : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white",
                phase === "spinning" && "opacity-40",
              )}
            >
              <Gauge size={15} />
              Быстрое открытие
            </button>
          </div>

          {/* main action */}
          <div className="mx-auto w-full max-w-md">
            {locked ? (
              <Link href="/partners">
                <Button variant="gold" size="xl" fullWidth>
                  Доступно только партнёрам
                </Button>
              </Link>
            ) : !canAfford ? (
              <Link href="/wallet">
                <Button
                  variant="secondary"
                  size="xl"
                  fullWidth
                  iconLeft={<Wallet size={17} />}
                >
                  Пополнить баланс
                </Button>
              </Link>
            ) : (
              <Button
                size="xl"
                fullWidth
                onClick={start}
                loading={phase === "spinning"}
                iconLeft={phase === "spinning" ? undefined : <Play size={16} />}
              >
                {phase === "spinning"
                  ? "Открываем…"
                  : totalPrice === 0
                    ? `Открыть ×${count} · Бесплатно`
                    : `Открыть ×${count} · ${formatMoney(totalPrice)}`}
              </Button>
            )}
            {hydrated && (
              <p className="mt-2.5 text-center text-[12.5px] text-slate-500">
                Баланс: {formatMoney(balance)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
