"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { api } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { useSession } from "@/lib/client/session";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { DepositPanel } from "@/components/wallet/DepositPanel";
import { WithdrawPanel } from "@/components/wallet/WithdrawPanel";
import { TransactionList } from "@/components/wallet/TransactionList";
import { formatMinor } from "@/lib/format";

type Tab = "deposit" | "withdraw" | "history";

export function WalletView({ initialTab = "deposit" }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const { user, ready } = useSession();

  const { data: inv } = useResource(
    () => (user ? api.inventory() : Promise.resolve(null)),
    [user?.id, user?.balance_minor],
  );

  if (ready && !user) {
    return (
      <EmptyState
        icon={<LogIn size={22} />}
        title="Войдите в аккаунт"
        description="Баланс и предметы хранятся на сервере и привязаны к аккаунту."
        action={
          <Link href="/login">
            <Button>Войти</Button>
          </Link>
        }
      />
    );
  }

  const balance = user?.balance_minor ?? 0;
  const inventoryValue = inv?.value_minor ?? 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card strong className="p-5 sm:p-6">
        <Tabs
          items={[
            { id: "deposit", label: "Пополнение" },
            { id: "withdraw", label: "Вывод предметов" },
            { id: "history", label: "История" },
          ]}
          value={tab}
          onChange={setTab}
          className="mb-6"
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "deposit" && <DepositPanel />}
            {tab === "withdraw" && <WithdrawPanel />}
            {tab === "history" && <TransactionList />}
          </motion.div>
        </AnimatePresence>
      </Card>

      <div className="space-y-4">
        <Card strong accent="#6E71FF" className="p-5">
          <p className="text-[11.5px] uppercase tracking-[0.16em] text-slate-500">Баланс</p>
          <p className="mt-1.5 font-display text-[34px] font-bold leading-none tabular-nums text-white">
            {formatMinor(balance)}
          </p>
          <div className="mt-5 space-y-2.5 border-t border-white/[0.07] pt-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-slate-400">Предметов в инвентаре</span>
              <span className="text-[13.5px] font-semibold tabular-nums text-white">
                {formatMinor(inventoryValue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-slate-400">Итого активов</span>
              <span className="text-[13.5px] font-semibold tabular-nums text-success">
                {formatMinor(balance + inventoryValue)}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-[14px] font-semibold text-white">Как работает вывод</h3>
          <ol className="mt-3 space-y-3">
            {[
              "Укажите ссылку на обмен Steam из настроек приватности.",
              "Выберите предметы со статусом «в наличии».",
              "Подтвердите заявку — бот отправит обмен.",
              "Примите обмен в Steam в течение 30 минут.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.07] text-[10.5px] font-bold text-slate-300">
                  {i + 1}
                </span>
                <span className="text-[12.5px] leading-relaxed text-slate-400">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
