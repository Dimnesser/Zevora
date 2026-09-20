"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Lock } from "lucide-react";
import { useSession } from "@/lib/client/session";
import { CasesAdmin } from "@/components/admin/CasesAdmin";
import { PartnersAdmin } from "@/components/admin/PartnersAdmin";
import { PlatformStats } from "@/components/admin/PlatformStats";
import { RaritiesAdmin } from "@/components/admin/RaritiesAdmin";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type Tab = "cases" | "partners" | "rarities" | "stats";

export function AdminShell() {
  const { user, ready } = useSession();
  const [tab, setTab] = useState<Tab>("cases");

  if (!ready) return <Skeleton className="h-[480px] rounded-2xl" />;

  // The UI hides itself for non-owners, and every admin endpoint
  // independently enforces the same rule server-side.
  if (!user || user.role !== "owner") {
    return (
      <Card className="p-10">
        <EmptyState
          icon={<Lock size={22} />}
          title="Доступ закрыт"
          description="Админ-панель доступна только владельцу Zevora."
          action={
            <Link href={user ? "/" : "/login"}>
              <Button>{user ? "На главную" : "Войти"}</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <>
      <div className="mb-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-gold-300">
          <Crown size={12} />
          Владелец
        </span>
        <h1 className="mt-3 font-display text-[30px] font-bold">Админ-панель</h1>
        <p className="mt-1.5 text-[13.5px] text-slate-400">
          Кейсы, дроп-таблицы, редкости и партнёрская программа.
        </p>
      </div>

      <Tabs
        items={[
          { id: "cases", label: "Кейсы" },
          { id: "partners", label: "Partners" },
          { id: "rarities", label: "Редкости" },
          { id: "stats", label: "Статистика" },
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
          {tab === "cases" && <CasesAdmin />}
          {tab === "partners" && <PartnersAdmin />}
          {tab === "rarities" && <RaritiesAdmin />}
          {tab === "stats" && <PlatformStats />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
