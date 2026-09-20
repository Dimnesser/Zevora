"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gauge, LogIn, Play, Volume2, VolumeX, Wallet } from "lucide-react";
import Link from "next/link";
import {
  ApiRequestError,
  api,
  newIdempotencyKey,
  type CaseItem,
  type CaseSummary,
  type OpenResult,
} from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { Roulette } from "@/components/cases/Roulette";
import { DropReveal } from "@/components/cases/DropReveal";
import { CaseUnlock } from "@/components/cases/CaseUnlock";
import { Button } from "@/components/ui/Button";
import { formatMinor } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { isMuted, playClick, playFail, playWin, setMuted } from "@/lib/client/sound";
import { rarityRank } from "@/lib/client/display";
import { cn } from "@/lib/utils";

const COUNTS = [1, 2, 3, 4] as const;
type Count = (typeof COUNTS)[number];

const SPIN_MS = 6200;
const FAST_MS = 2200;

type Phase = "idle" | "unlocking" | "spinning" | "result";

/**
 * Case opening flow.
 *
 * The order matters: the server is asked first and returns the finished
 * outcome, then the reel animates toward it. The animation has no say in
 * what was won, and a client that skips it still cannot change the drop.
 */
export function CaseOpener({
  kase,
  items,
}: {
  kase: CaseSummary;
  items: CaseItem[];
}) {
  const { user, refresh, setBalance } = useSession();

  const [count, setCount] = useState<Count>(1);
  const [fast, setFast] = useState(false);
  const [muted, setMutedState] = useState(() => isMuted());
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<OpenResult[]>([]);
  const [pending, setPending] = useState<(OpenResult | null)[]>([null]);
  const [busy, setBusy] = useState(false);
  const [selling, setSelling] = useState(false);
  const finishedLanes = useRef(0);

  const unitPrice = kase.price_minor;
  const totalPrice = unitPrice * count;
  const balance = user?.balance_minor ?? 0;
  const canAfford = balance >= totalPrice;
  const duration = fast ? FAST_MS : SPIN_MS;

  const revealAll = useCallback(
    (opened: OpenResult[]) => {
      setResults(opened);
      setPhase("result");

      const best = opened.reduce(
        (a, b) => (b.item.price_minor > a.item.price_minor ? b : a),
        opened[0],
      );
      const rank = rarityRank(best.item.rarity.slug);
      playWin(rank);
      if (rank >= 5) {
        toast.rare(
          best.item.market_name,
          `${best.item.rarity.name} · ${formatMinor(best.item.price_minor)}`,
        );
      }
    },
    [],
  );

  const onLaneFinished = useCallback(() => {
    finishedLanes.current += 1;
  }, []);

  const start = async () => {
    if (busy) return;
    if (!user) {
      toast.error("Требуется вход", "Войдите в аккаунт, чтобы открывать кейсы");
      return;
    }
    if (!canAfford) {
      toast.error("Недостаточно средств", "Пополните баланс, чтобы открыть кейс");
      return;
    }

    setBusy(true);
    playClick();

    try {
      // Every lane is a separate server call with its own idempotency
      // key, so a retry replays that lane instead of charging again.
      const opened = await Promise.all(
        Array.from({ length: count }, () =>
          api.openCase(kase.slug, newIdempotencyKey()),
        ),
      );

      // Balance comes back from the server; the client never computes it.
      setBalance(opened[opened.length - 1].balance_minor);

      finishedLanes.current = 0;
      setResults([]);
      setPending(opened);

      // The lid animation runs first, then the reel. Fast mode skips
      // straight to the reel — the outcome is already fixed either way.
      if (fast) {
        beginSpin(opened);
      } else {
        setPhase("unlocking");
      }
    } catch (err) {
      playFail();
      const message =
        err instanceof ApiRequestError ? err.message : "Не удалось открыть кейс";
      toast.error("Ошибка", message);
      if (err instanceof ApiRequestError && err.status === 401) {
        await refresh();
      }
      setPhase("idle");
    } finally {
      setBusy(false);
    }
  };

  /** Starts the reel toward an outcome the server already decided. */
  const beginSpin = useCallback(
    (opened: OpenResult[]) => {
      setPhase("spinning");
      // The reel owns the timing; this is the outer bound for all lanes.
      const longest = duration + (opened.length - 1) * 220 + 120;
      window.setTimeout(() => revealAll(opened), longest);
    },
    [duration, revealAll],
  );

  const onUnlocked = useCallback(() => {
    setPending((open) => {
      const ready = open.filter((o): o is OpenResult => o !== null);
      if (ready.length) beginSpin(ready);
      return open;
    });
  }, [beginSpin]);

  const reset = () => {
    setPhase("idle");
    setResults([]);
    setPending(Array.from({ length: count }, () => null));
    finishedLanes.current = 0;
  };

  const keep = async () => {
    toast.success(
      results.length > 1
        ? `${results.length} предмета в инвентаре`
        : "Предмет в инвентаре",
      "Найдёте его на странице «Инвентарь»",
    );
    reset();
    await refresh();
  };

  const sell = async () => {
    setSelling(true);
    try {
      const ids = results.map((r) => r.item.inventory_id);
      const res = await api.sell(ids);
      setBalance(res.balance_minor);
      toast.success("Продано", `На баланс зачислено ${formatMinor(res.amount_minor)}`);
      reset();
    } catch (err) {
      toast.error(
        "Не удалось продать",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    } finally {
      setSelling(false);
    }
  };

  const changeCount = (n: Count) => {
    if (phase !== "idle" || busy) return;
    setCount(n);
    setPending(Array.from({ length: n }, () => null));
    playClick();
  };

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) playClick();
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
              results={results}
              onKeep={keep}
              onSell={sell}
              selling={selling}
              onAgain={() => {
                reset();
                window.setTimeout(() => void start(), 80);
              }}
              againLabel={`Открыть ещё · ${formatMinor(totalPrice)}`}
              canAfford={balance >= totalPrice}
            />
          </motion.div>
        ) : phase === "unlocking" ? (
          <motion.div
            key="unlock"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-4"
          >
            <CaseUnlock
              slug={kase.slug}
              name={kase.name}
              accent={kase.art.color_a}
              onDone={onUnlocked}
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
                key={`${kase.slug}-${lane}-${count}`}
                items={items}
                lane={lane}
                result={phase === "spinning" ? (pending[lane]?.item ?? null) : null}
                spinning={phase === "spinning"}
                durationMs={duration + lane * 220}
                onFinished={onLaneFinished}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {phase !== "result" && (
        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
              {COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => changeCount(n)}
                  disabled={phase !== "idle"}
                  className={cn(
                    "h-9 w-11 rounded-lg text-[13px] font-semibold transition",
                    count === n
                      ? "bg-white/[0.12] text-white"
                      : "text-slate-400 hover:text-white",
                    phase !== "idle" && "opacity-40",
                  )}
                >
                  ×{n}
                </button>
              ))}
            </div>

            <button
              onClick={() => setFast((v) => !v)}
              disabled={phase !== "idle"}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-medium transition",
                fast
                  ? "border-aqua-400/50 bg-aqua-400/[0.12] text-aqua-300"
                  : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white",
                phase !== "idle" && "opacity-40",
              )}
            >
              <Gauge size={15} />
              Быстрое открытие
            </button>

            <button
              onClick={toggleSound}
              aria-label={muted ? "Включить звук" : "Выключить звук"}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 transition hover:text-white"
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>

          <div className="mx-auto w-full max-w-md">
            {!user ? (
              <Link href="/login">
                <Button size="xl" fullWidth iconLeft={<LogIn size={17} />}>
                  Войдите, чтобы открыть
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
                onClick={() => void start()}
                loading={phase !== "idle" || busy}
                iconLeft={
                  phase !== "idle" || busy ? undefined : <Play size={16} />
                }
              >
                {phase === "spinning"
                  ? "Открываем…"
                  : totalPrice === 0
                    ? `Открыть ×${count} · Бесплатно`
                    : `Открыть ×${count} · ${formatMinor(totalPrice)}`}
              </Button>
            )}
            {user && (
              <p className="mt-2.5 text-center text-[12.5px] text-slate-500">
                Баланс: {formatMinor(balance)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
