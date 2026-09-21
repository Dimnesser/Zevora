"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bitcoin,
  Check,
  CreditCard,
  Loader2,
  RotateCcw,
  Smartphone,
  Wallet,
} from "lucide-react";
import { ApiRequestError, api } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { formatMinor } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { cn } from "@/lib/utils";

const QUICK = [500, 1000, 2500, 5000, 10000, 25000];

/**
 * Bonus rates are mirrored from the server purely for display; the
 * server recomputes them and ignores anything the client sends.
 */
const METHODS = [
  { id: "card", name: "Банковская карта", hint: "Visa · Mastercard · МИР", icon: CreditCard, bonus: 0 },
  { id: "sbp", name: "СБП", hint: "Перевод по номеру телефона", icon: Smartphone, bonus: 0.03 },
  { id: "crypto", name: "Криптовалюта", hint: "BTC · ETH · USDT", icon: Bitcoin, bonus: 0.07 },
];

const MIN = 100;
const MAX = 300_000;

/** Where the panel is in the top-up: the form, the wait, or the outcome. */
type Phase =
  | { kind: "form" }
  | { kind: "pending" }
  | { kind: "done"; credited: number; bonus: number; balance: number }
  | { kind: "failed"; message: string };

/**
 * Top-up.
 *
 * The panel is a small state machine rather than a form with a spinner on
 * the button: paying is the one moment on the site where a person needs
 * to be told, unambiguously, what happened. So the wait covers the form,
 * and both outcomes get their own screen with the obvious next move —
 * back to the cases on success, retry on failure.
 */
export function DepositPanel({ onDone }: { onDone?: () => void }) {
  const { setBalance } = useSession();
  const [amount, setAmount] = useState(1000);
  const [method, setMethod] = useState(METHODS[0]);
  const [phase, setPhase] = useState<Phase>({ kind: "form" });

  const valid = Number.isInteger(amount) && amount >= MIN && amount <= MAX;
  const bonus = Math.round(amount * 100 * method.bonus);
  const credited = amount * 100 + bonus;
  const busy = phase.kind === "pending";

  const submit = async () => {
    if (!valid) {
      toast.error("Неверная сумма", `Минимум ${MIN} ₽, максимум ${MAX.toLocaleString("ru-RU")} ₽`);
      return;
    }
    setPhase({ kind: "pending" });
    try {
      const res = await api.deposit(amount, method.id);
      setBalance(res.balance_minor);
      setPhase({
        kind: "done",
        credited: res.credited_minor,
        bonus: res.bonus_minor,
        balance: res.balance_minor,
      });
      toast.success(
        "Баланс пополнен",
        res.bonus_minor > 0
          ? `${formatMinor(res.credited_minor - res.bonus_minor)} + бонус ${formatMinor(res.bonus_minor)}`
          : formatMinor(res.credited_minor),
      );
      onDone?.();
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз";
      setPhase({ kind: "failed", message });
      toast.error("Не удалось пополнить", message);
    }
  };

  if (phase.kind === "done") {
    return (
      <Outcome
        tone="#2FD98A"
        icon={<Check size={26} />}
        title="Баланс пополнен"
        lines={[
          ["Зачислено", formatMinor(phase.credited)],
          ...(phase.bonus > 0
            ? ([["из них бонус", `+${formatMinor(phase.bonus)}`]] as [string, string][])
            : []),
          ["Баланс", formatMinor(phase.balance)],
        ]}
        action={
          <Button variant="accent" onClick={() => setPhase({ kind: "form" })}>
            Пополнить ещё
          </Button>
        }
      />
    );
  }

  if (phase.kind === "failed") {
    return (
      <Outcome
        tone="#FF3B6B"
        icon={<AlertTriangle size={24} />}
        title="Платёж не прошёл"
        note={phase.message}
        lines={[["Сумма", formatMinor(amount * 100)], ["Способ", method.name]]}
        action={
          <Button
            variant="accent"
            iconLeft={<RotateCcw size={15} />}
            onClick={() => setPhase({ kind: "form" })}
          >
            Попробовать снова
          </Button>
        }
      />
    );
  }

  return (
    <div className="relative space-y-6">
      {/* ── quick amounts ── */}
      <div>
        <p className="meta mb-2.5">Быстрый выбор</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {QUICK.map((v) => (
            <button
              key={v}
              type="button"
              disabled={busy}
              onClick={() => setAmount(v)}
              className={cn(
                "relative h-11 rounded-sm border text-[13px] font-semibold tnum transition-colors duration-200",
                amount === v
                  ? "border-zev-400/60 bg-zev-500/[0.16] text-white shadow-lip"
                  : "border-line-soft bg-white/[0.025] text-slate-300 hover:border-line hover:text-white",
              )}
            >
              {v.toLocaleString("ru-RU")}
              {amount === v && (
                <span
                  aria-hidden
                  className="absolute inset-x-2 bottom-0 h-px bg-zev-400"
                  style={{ boxShadow: "0 0 8px #6E71FF" }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <Field label="Сумма пополнения" hint={`От ${MIN} ₽ до ${MAX.toLocaleString("ru-RU")} ₽`}>
        <Input
          type="number"
          inputMode="numeric"
          min={MIN}
          max={MAX}
          disabled={busy}
          value={amount || ""}
          onChange={(e) => setAmount(Math.max(0, Math.floor(Number(e.target.value))))}
          suffix="₽"
          invalid={amount > 0 && !valid}
        />
      </Field>

      {/* ── method ── */}
      <div>
        <p className="meta mb-2.5">Способ оплаты</p>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {METHODS.map((m) => {
            const active = m.id === method.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={busy}
                onClick={() => setMethod(m)}
                className={cn(
                  "relative flex flex-col items-start gap-2 rounded-sm border p-4 text-left transition-colors duration-200",
                  active
                    ? "border-zev-400/55 bg-zev-500/[0.11] shadow-lip"
                    : "border-line-soft bg-white/[0.02] hover:border-line",
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-px"
                    style={{ background: "linear-gradient(90deg,transparent,#6E71FF,transparent)" }}
                  />
                )}
                <span className="relative flex w-full items-center justify-between">
                  <m.icon size={18} className={active ? "text-zev-300" : "text-slate-500"} />
                  {m.bonus > 0 ? (
                    <span className="meta rounded-xs border border-success/30 bg-success/[0.12] px-1.5 py-0.5 text-success">
                      +{Math.round(m.bonus * 100)}%
                    </span>
                  ) : (
                    active && <Check size={14} className="text-zev-300" />
                  )}
                </span>
                <span className="relative">
                  <span className="block text-[13.5px] font-semibold text-white">{m.name}</span>
                  <span className="mt-0.5 block text-[11.5px] text-slate-500">{m.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── the bill ── */}
      <div className="ticks rounded-sm border border-line-soft bg-white/[0.02] px-4 py-3.5 text-white/15">
        <Row label="Сумма" value={formatMinor(amount * 100)} />
        {bonus > 0 && (
          <Row label={`Бонус · ${method.name}`} value={`+${formatMinor(bonus)}`} accent="#2FD98A" />
        )}
        <div className="my-2.5 h-px bg-line-soft" />
        <Row label="К зачислению" value={formatMinor(credited)} bold />
      </div>

      <Button
        size="xl"
        variant="accent"
        fullWidth
        disabled={!valid || busy}
        loading={busy}
        onClick={() => void submit()}
        iconLeft={<Wallet size={17} />}
      >
        Пополнить на {formatMinor(credited)}
      </Button>

      <p className="text-center text-[11.5px] leading-relaxed text-slate-600">
        Демонстрационный режим: реальные платежи не проводятся, баланс виртуальный.
      </p>

      {/* ── the wait, over the form it belongs to ── */}
      <AnimatePresence>
        {busy && (
          <motion.div
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-sm bg-void/72 backdrop-blur-sm"
          >
            <Loader2 size={26} className="animate-spin text-zev-300" />
            <p className="meta text-slate-300">Проводим платёж</p>
            <p className="text-[12px] text-slate-500">
              {formatMinor(credited)} · {method.name}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Success and failure share a shape so the panel does not jump between them. */
function Outcome({
  tone,
  icon,
  title,
  note,
  lines,
  action,
}: {
  tone: string;
  icon: React.ReactNode;
  title: string;
  note?: string;
  lines: [string, string][];
  action: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center py-6 text-center"
    >
      <span className="relative flex h-16 w-16 items-center justify-center">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full opacity-25 blur-xl"
          style={{ background: tone }}
        />
        <span
          className="relative flex h-14 w-14 items-center justify-center rounded-full border"
          style={{ borderColor: `${tone}59`, background: `${tone}1A`, color: tone }}
        >
          {icon}
        </span>
      </span>

      <h3 className="mt-4 font-display text-[21px] font-bold text-white">{title}</h3>
      {note && <p className="mt-1.5 max-w-[34ch] text-[12.5px] text-slate-500">{note}</p>}

      <dl className="mt-5 w-full max-w-[320px] space-y-1.5 rounded-sm border border-line-soft bg-white/[0.02] px-4 py-3">
        {lines.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4">
            <dt className="meta text-slate-500">{k}</dt>
            <dd className="text-[13.5px] font-semibold tnum text-white">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5">{action}</div>
    </motion.div>
  );
}

function Row({
  label,
  value,
  accent,
  bold,
}: {
  label: string;
  value: string;
  accent?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={cn(bold ? "text-[13px] text-slate-300" : "meta text-slate-500")}>
        {label}
      </span>
      <span
        className={cn("tnum", bold ? "font-display text-[17px] font-bold" : "text-[13.5px] font-medium")}
        style={{ color: accent ?? "#fff" }}
      >
        {value}
      </span>
    </div>
  );
}
