"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Lock, Package, Settings, Users } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { PartnersAdmin } from "@/components/admin/PartnersAdmin";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { CASES } from "@/data/cases";
import { SKINS } from "@/data/skins";
import { caseExpectedValue } from "@/lib/roll";
import { formatMoney } from "@/lib/format";

type Tab = "partners" | "cases" | "settings";

export function AdminShell() {
  const hydrated = useHydrated();
  const role = useStore((s) => s.user.role);
  const [tab, setTab] = useState<Tab>("partners");

  if (!hydrated) {
    return <div className="skeleton h-[480px] rounded-2xl" />;
  }

  // Only the platform owner may open the admin area.
  if (role !== "owner") {
    return (
      <Card className="p-10">
        <EmptyState
          icon={<Lock size={22} />}
          title="Доступ закрыт"
          description="Админ-панель доступна только владельцу Zevora."
          action={
            <Link href="/">
              <Button>На главную</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-gold-300">
            <Crown size={12} />
            Владелец
          </span>
          <h1 className="mt-3 font-display text-[30px] font-bold">Админ-панель</h1>
          <p className="mt-1.5 text-[13.5px] text-slate-400">
            Управление партнёрской программой, каталогом и настройками
            платформы.
          </p>
        </div>
      </div>

      <Tabs
        items={[
          { id: "partners", label: "Partners" },
          { id: "cases", label: "Кейсы" },
          { id: "settings", label: "Настройки" },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-6 w-fit"
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "partners" && <PartnersAdmin />}
          {tab === "cases" && <CasesAdmin />}
          {tab === "settings" && <SettingsAdmin />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

function CasesAdmin() {
  return (
    <Card className="overflow-hidden">
      <div className="hidden grid-cols-[minmax(0,1fr)_110px_110px_120px_100px] gap-4 border-b border-white/[0.07] px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:grid">
        <span>Кейс</span>
        <span className="text-right">Цена</span>
        <span className="text-right">Предметов</span>
        <span className="text-right">Средняя ценность</span>
        <span className="text-right">Маржа</span>
      </div>
      <ul className="divide-y divide-white/[0.04]">
        {CASES.map((c) => {
          const ev = caseExpectedValue(c);
          const margin = c.price > 0 ? 1 - ev / c.price : 0;
          return (
            <li
              key={c.id}
              className="grid grid-cols-2 gap-3 px-4 py-3 text-[13px] sm:grid-cols-[minmax(0,1fr)_110px_110px_120px_100px] sm:gap-4 sm:px-5"
            >
              <div className="col-span-2 flex items-center gap-2.5 sm:col-span-1">
                <span
                  className="h-7 w-1.5 shrink-0 rounded-full"
                  style={{
                    background: `linear-gradient(180deg, ${c.palette[0]}, ${c.palette[1]})`,
                  }}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{c.name}</p>
                  <p className="truncate text-[11.5px] text-slate-500">
                    {c.partnerOnly ? "партнёрский" : c.tags.join(" · ")}
                  </p>
                </div>
              </div>
              <span className="text-right tabular-nums text-slate-300">
                {c.price === 0 ? "—" : formatMoney(c.price)}
              </span>
              <span className="text-right tabular-nums text-slate-400">
                {c.drops.length}
              </span>
              <span className="text-right tabular-nums text-slate-300">
                {formatMoney(ev)}
              </span>
              <span
                className="text-right font-semibold tabular-nums"
                style={{ color: margin > 0 ? "#2FD98A" : "#FF4D5E" }}
              >
                {c.price === 0 ? "—" : `${(margin * 100).toFixed(1)}%`}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function SettingsAdmin() {
  const reset = useStore((s) => s.resetAccount);
  const rows = [
    { label: "Кейсов в каталоге", value: String(CASES.length) },
    { label: "Предметов в каталоге", value: String(SKINS.length) },
    {
      label: "Партнёрских кейсов",
      value: String(CASES.filter((c) => c.partnerOnly).length),
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Package size={16} className="text-zev-300" />
          <h3 className="text-[15px] font-semibold text-white">Каталог</h3>
        </div>
        <dl className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <dt className="text-[13px] text-slate-400">{r.label}</dt>
              <dd className="text-[13.5px] font-semibold tabular-nums text-white">
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[12px] leading-relaxed text-slate-500">
          Дроп-таблицы задаются в data/cases.ts. После подключения PostgreSQL
          они переедут в БД, а этот раздел станет редактором.
        </p>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Settings size={16} className="text-zev-300" />
          <h3 className="text-[15px] font-semibold text-white">
            Демонстрационные данные
          </h3>
        </div>
        <p className="mb-4 text-[13px] leading-relaxed text-slate-400">
          Сбросьте состояние платформы: баланс, инвентарь, история операций и
          все выданные партнёрские статусы вернутся к исходным значениям.
        </p>
        <Button variant="danger" iconLeft={<Users size={15} />} onClick={reset}>
          Сбросить данные
        </Button>
      </Card>
    </div>
  );
}
