"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  Package,
  Receipt,
  Send,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import type { TxKind } from "@/types";
import { useStore } from "@/lib/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const META: Record<TxKind, { icon: typeof Receipt; color: string }> = {
  deposit: { icon: ArrowDownLeft, color: "#2FD98A" },
  withdraw: { icon: Send, color: "#22D3EE" },
  case: { icon: Package, color: "#6E71FF" },
  sell: { icon: ArrowUpRight, color: "#2FD98A" },
  "upgrade-win": { icon: TrendingUp, color: "#2FD98A" },
  "upgrade-loss": { icon: TrendingUp, color: "#FF4D5E" },
  bonus: { icon: Gift, color: "#F5B841" },
  promo: { icon: Ticket, color: "#A855F7" },
  referral: { icon: Users, color: "#F5B841" },
};

export function TransactionList({ limit }: { limit?: number }) {
  const hydrated = useHydrated();
  const transactions = useStore((s) => s.transactions);
  const list = hydrated ? (limit ? transactions.slice(0, limit) : transactions) : [];

  if (list.length === 0) {
    return (
      <EmptyState
        icon={<Receipt size={22} />}
        title="История пуста"
        description="Здесь появятся пополнения, открытия кейсов, продажи и бонусы."
      />
    );
  }

  return (
    <ul className="divide-y divide-white/[0.05]">
      {list.map((tx) => {
        const meta = META[tx.kind];
        const Icon = meta.icon;
        const positive = tx.amount > 0;
        return (
          <li key={tx.id} className="flex items-center gap-3 py-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${meta.color}18`, color: meta.color }}
            >
              <Icon size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-white">
                {tx.label}
              </p>
              <p className="text-[11.5px] text-slate-500">
                {formatDateTime(tx.at)}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 text-[13.5px] font-bold tabular-nums",
                tx.amount === 0
                  ? "text-slate-500"
                  : positive
                    ? "text-success"
                    : "text-slate-300",
              )}
            >
              {tx.amount === 0
                ? "—"
                : `${positive ? "+" : "−"}${formatMoney(Math.abs(tx.amount))}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
