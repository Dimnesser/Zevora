"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bitcoin, CreditCard, Smartphone, Wallet, Check } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { formatMoney } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { cn } from "@/lib/utils";

const QUICK = [500, 1000, 2500, 5000, 10000, 25000];

const METHODS = [
  {
    id: "card",
    name: "Банковская карта",
    hint: "Visa · Mastercard · МИР",
    icon: CreditCard,
    bonus: 0,
  },
  {
    id: "sbp",
    name: "СБП",
    hint: "Перевод по номеру телефона",
    icon: Smartphone,
    bonus: 0.03,
  },
  {
    id: "crypto",
    name: "Криптовалюта",
    hint: "BTC · ETH · USDT",
    icon: Bitcoin,
    bonus: 0.07,
  },
];

const MIN = 100;
const MAX = 300_000;

export function DepositPanel() {
  const deposit = useStore((s) => s.deposit);
  const [amount, setAmount] = useState(1000);
  const [method, setMethod] = useState(METHODS[0]);
  const [processing, setProcessing] = useState(false);

  const valid = amount >= MIN && amount <= MAX;
  const bonus = Math.round(amount * method.bonus);
  const credited = amount + bonus;

  const submit = async () => {
    if (!valid) {
      toast.error("Неверная сумма", `Минимум ${MIN} ₽, максимум ${formatMoney(MAX)}`);
      return;
    }
    setProcessing(true);
    // Stands in for the payment-provider redirect.
    await new Promise((r) => setTimeout(r, 900));
    deposit(credited, method.name);
    setProcessing(false);
    toast.success(
      "Баланс пополнен",
      bonus > 0
        ? `${formatMoney(amount)} + бонус ${formatMoney(bonus)}`
        : formatMoney(amount),
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-[12.5px] font-medium text-slate-400">
          Быстрый выбор
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {QUICK.map((v) => (
            <button
              key={v}
              onClick={() => setAmount(v)}
              className={cn(
                "h-11 rounded-xl border text-[13px] font-semibold tabular-nums transition",
                amount === v
                  ? "border-zev-400/70 bg-zev-500/[0.18] text-white"
                  : "border-white/[0.08] bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white",
              )}
            >
              {v.toLocaleString("ru-RU")}
            </button>
          ))}
        </div>
      </div>

      <Field label="Сумма пополнения" hint={`От ${MIN} ₽ до ${formatMoney(MAX)}`}>
        <Input
          type="number"
          inputMode="numeric"
          min={MIN}
          max={MAX}
          value={amount || ""}
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
          suffix="₽"
          invalid={amount > 0 && !valid}
        />
      </Field>

      <div>
        <p className="mb-3 text-[12.5px] font-medium text-slate-400">
          Способ оплаты
        </p>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {METHODS.map((m) => {
            const active = m.id === method.id;
            return (
              <button
                key={m.id}
                onClick={() => setMethod(m)}
                className={cn(
                  "relative flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition",
                  active
                    ? "border-zev-400/60 bg-zev-500/[0.12]"
                    : "border-white/[0.08] bg-white/[0.025] hover:border-white/20",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="deposit-method"
                    className="absolute inset-0 rounded-2xl border border-zev-400/60"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative flex w-full items-center justify-between">
                  <m.icon size={18} className={active ? "text-zev-300" : "text-slate-500"} />
                  {m.bonus > 0 && (
                    <span className="rounded-md bg-success/15 px-1.5 py-0.5 text-[10px] font-bold text-success">
                      +{Math.round(m.bonus * 100)}%
                    </span>
                  )}
                  {active && m.bonus === 0 && (
                    <Check size={14} className="text-zev-300" />
                  )}
                </span>
                <span className="relative">
                  <span className="block text-[13.5px] font-semibold text-white">
                    {m.name}
                  </span>
                  <span className="block text-[11.5px] text-slate-500">
                    {m.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5">
        <Row label="Сумма" value={formatMoney(amount)} />
        {bonus > 0 && (
          <Row
            label={`Бонус ${method.name}`}
            value={`+${formatMoney(bonus)}`}
            accent="#2FD98A"
          />
        )}
        <div className="my-2.5 h-px bg-white/[0.07]" />
        <Row label="К зачислению" value={formatMoney(credited)} bold />
      </div>

      <Button
        size="xl"
        fullWidth
        disabled={!valid}
        loading={processing}
        onClick={submit}
        iconLeft={<Wallet size={17} />}
      >
        Пополнить на {formatMoney(credited)}
      </Button>

      <p className="text-center text-[11.5px] leading-relaxed text-slate-600">
        Демонстрационный режим: реальные платежи не проводятся, баланс
        виртуальный.
      </p>
    </div>
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
      <span className="text-[13px] text-slate-400">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          bold ? "text-[16px] font-bold" : "text-[13.5px] font-medium",
        )}
        style={{ color: accent ?? "#fff" }}
      >
        {value}
      </span>
    </div>
  );
}
