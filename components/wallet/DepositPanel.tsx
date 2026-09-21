"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bitcoin,
  Check,
  Clock,
  CreditCard,
  Loader2,
  RotateCcw,
  Smartphone,
  Wallet,
} from "lucide-react";
import { ApiRequestError, api, type PaymentOrder } from "@/lib/client/api";
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

/** Where the panel is in the top-up. */
type Phase =
  | { kind: "form" }
  /** The order is being opened with the provider. */
  | { kind: "opening" }
  /** The order exists and is waiting for the provider's confirmation. */
  | { kind: "awaiting"; order: PaymentOrder }
  | { kind: "done"; credited: number; bonus: number; balance: number | null }
  | { kind: "failed"; message: string };

/** How often an open order is re-checked while the payment page is open. */
const POLL_MS = 2500;

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
  const { refresh } = useSession();
  const [amount, setAmount] = useState(1000);
  const [method, setMethod] = useState(METHODS[0]);
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [simulating, setSimulating] = useState(false);

  const valid = Number.isInteger(amount) && amount >= MIN && amount <= MAX;
  const bonus = Math.round(amount * 100 * method.bonus);
  const credited = amount * 100 + bonus;
  const busy = phase.kind === "opening";

  const submit = async () => {
    if (!valid) {
      toast.error("Неверная сумма", `Минимум ${MIN} ₽, максимум ${MAX.toLocaleString("ru-RU")} ₽`);
      return;
    }
    setPhase({ kind: "opening" });
    try {
      const res = await api.deposit(amount, method.id);
      setPhase({ kind: "awaiting", order: res.order });
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз";
      setPhase({ kind: "failed", message });
      toast.error("Не удалось начать оплату", message);
    }
  };

  /**
   * An order is settled by the provider, not by this panel, so the only
   * thing to do while one is open is ask what happened to it.
   */
  useEffect(() => {
    if (phase.kind !== "awaiting") return;
    let live = true;

    const tick = async () => {
      try {
        const { order } = await api.order(phase.order.id);
        if (!live) return;
        if (order.status === "paid") {
          setPhase({
            kind: "done",
            credited: order.credited_minor,
            bonus: order.bonus_minor,
            balance: null,
          });
          await refresh();
          toast.success(
            "Баланс пополнен",
            order.bonus_minor > 0
              ? `${formatMinor(order.credited_minor - order.bonus_minor)} + бонус ${formatMinor(order.bonus_minor)}`
              : formatMinor(order.credited_minor),
          );
          onDone?.();
        } else if (order.status !== "pending") {
          setPhase({
            kind: "failed",
            message: order.failure_reason ?? "Платёж не был завершён",
          });
        } else {
          setPhase({ kind: "awaiting", order });
        }
      } catch {
        /* a dropped poll is not a failure; the next tick tries again */
      }
    };

    const id = setInterval(() => void tick(), POLL_MS);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [phase, refresh, onDone]);

  /** Test provider only: stands in for the customer on the payment page. */
  const simulate = async (outcome: "paid" | "failed") => {
    if (phase.kind !== "awaiting") return;
    setSimulating(true);
    try {
      const res = await api.simulatePayment(phase.order.id, outcome);
      if (res.order.status === "paid") {
        setPhase({
          kind: "done",
          credited: res.order.credited_minor,
          bonus: res.order.bonus_minor,
          balance: res.balance_minor,
        });
        await refresh();
        toast.success("Баланс пополнен", formatMinor(res.order.credited_minor));
        onDone?.();
      } else {
        setPhase({
          kind: "failed",
          message: res.order.failure_reason ?? "Платёж отменён",
        });
      }
    } catch (err) {
      toast.error(
        "Не удалось подтвердить оплату",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    } finally {
      setSimulating(false);
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
          ...(phase.balance !== null
            ? ([["Баланс", formatMinor(phase.balance)]] as [string, string][])
            : []),
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

  if (phase.kind === "awaiting") {
    return (
      <AwaitingPayment
        order={phase.order}
        method={method.name}
        busy={simulating}
        onSimulate={(outcome) => void simulate(outcome)}
        onCancel={() => setPhase({ kind: "form" })}
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
        Перейти к оплате · {formatMinor(credited)}
      </Button>

      <p className="text-center text-[11.5px] leading-relaxed text-slate-600">
        Баланс пополняется только после подтверждения от платёжного провайдера.
        Сейчас подключён тестовый провайдер — реальные деньги не списываются.
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
            <p className="meta text-slate-300">Создаём счёт</p>
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

/**
 * The order is open and nothing else can happen here until the provider
 * reports back. The screen says exactly that, shows what is being paid
 * for, and — with the bundled test provider — offers the two buttons its
 * hosted page would have.
 */
function AwaitingPayment({
  order,
  method,
  busy,
  onSimulate,
  onCancel,
}: {
  order: PaymentOrder;
  method: string;
  busy: boolean;
  onSimulate: (outcome: "paid" | "failed") => void;
  onCancel: () => void;
}) {
  const total = order.amount_minor + order.bonus_minor;
  const [left, setLeft] = useState(() => order.expires_at - Date.now());

  useEffect(() => {
    const id = setInterval(() => setLeft(order.expires_at - Date.now()), 1000);
    return () => clearInterval(id);
  }, [order.expires_at]);

  const mins = Math.max(0, Math.floor(left / 60000));
  const secs = Math.max(0, Math.floor((left % 60000) / 1000));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center py-6 text-center"
    >
      <span className="relative flex h-16 w-16 items-center justify-center">
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-zev-500 opacity-25 blur-xl"
          animate={{ opacity: [0.18, 0.4, 0.18] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-zev-400/45 bg-zev-500/[0.12] text-zev-300">
          <Clock size={24} />
        </span>
      </span>

      <h3 className="mt-4 font-display text-[21px] font-bold text-white">
        Ожидаем оплату
      </h3>
      <p className="mt-1.5 max-w-[38ch] text-[12.5px] leading-relaxed text-slate-500">
        Баланс пополнится, когда провайдер подтвердит платёж. Счёт действует
        ещё {mins}:{String(secs).padStart(2, "0")}.
      </p>

      <dl className="mt-5 w-full max-w-[320px] space-y-1.5 rounded-sm border border-line-soft bg-white/[0.02] px-4 py-3">
        <Line k="Счёт" v={order.id.slice(0, 10)} mono />
        <Line k="Способ" v={method} />
        <Line k="Сумма" v={formatMinor(order.amount_minor)} />
        {order.bonus_minor > 0 && (
          <Line k="Бонус" v={`+${formatMinor(order.bonus_minor)}`} tone="#2FD98A" />
        )}
        <Line k="К зачислению" v={formatMinor(total)} bold />
      </dl>

      {order.simulated ? (
        <div className="mt-5 w-full max-w-[320px]">
          <p className="meta mb-2.5 text-gold-300">Тестовый провайдер</p>
          <div className="flex gap-2">
            <Button variant="accent" fullWidth loading={busy} onClick={() => onSimulate("paid")}>
              Оплатить
            </Button>
            <Button variant="secondary" fullWidth disabled={busy} onClick={() => onSimulate("failed")}>
              Отклонить
            </Button>
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-slate-600">
            Настоящий провайдер прислал бы подписанный вебхук; эти кнопки
            отправляют такой же, через ту же проверку подписи.
          </p>
        </div>
      ) : (
        <p className="mt-5 max-w-[34ch] text-[12px] text-slate-500">
          Завершите оплату на странице провайдера — страница обновится сама.
        </p>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="meta mt-5 text-slate-500 transition-colors hover:text-white"
      >
        Вернуться к сумме
      </button>
    </motion.div>
  );
}

function Line({
  k,
  v,
  tone,
  bold,
  mono,
}: {
  k: string;
  v: string;
  tone?: string;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="meta text-slate-500">{k}</dt>
      <dd
        className={cn(
          "tnum",
          mono ? "font-mono text-[12px]" : "text-[13.5px] font-semibold",
          bold && "font-display text-[15px] font-bold",
        )}
        style={{ color: tone ?? "#fff" }}
      >
        {v}
      </dd>
    </div>
  );
}
