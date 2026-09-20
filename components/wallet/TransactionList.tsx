"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  Package,
  Receipt,
  Send,
  ShoppingBag,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import { api } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { useSession } from "@/lib/client/session";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDateTime, formatMinor } from "@/lib/format";
import { cn } from "@/lib/utils";

const META: Record<string, { icon: typeof Receipt; color: string }> = {
  deposit: { icon: ArrowDownLeft, color: "#2FD98A" },
  withdraw: { icon: Send, color: "#22D3EE" },
  case: { icon: Package, color: "#6E71FF" },
  sell: { icon: ArrowUpRight, color: "#2FD98A" },
  shop: { icon: ShoppingBag, color: "#A855F7" },
  "upgrade-win": { icon: TrendingUp, color: "#2FD98A" },
  "upgrade-loss": { icon: TrendingUp, color: "#FF4D5E" },
  bonus: { icon: Gift, color: "#F5B841" },
  promo: { icon: Ticket, color: "#A855F7" },
  referral: { icon: Users, color: "#F5B841" },
  admin: { icon: Receipt, color: "#7C8AA6" },
};

export function TransactionList({ limit = 60 }: { limit?: number }) {
  const { user } = useSession();
  const { data, loading } = useResource(
    () => (user ? api.transactions(limit) : Promise.resolve(null)),
    [user?.id, user?.balance_minor, limit],
  );

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const list = data?.transactions ?? [];
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
        const meta = META[tx.kind] ?? META.admin;
        const Icon = meta.icon;
        const positive = tx.amount_minor > 0;
        return (
          <li key={tx.id} className="flex items-center gap-3 py-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${meta.color}18`, color: meta.color }}
            >
              <Icon size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-white">{tx.label}</p>
              <p className="text-[11.5px] text-slate-500">{formatDateTime(tx.created_at)}</p>
            </div>
            <div className="shrink-0 text-right">
              <span
                className={cn(
                  "block text-[13.5px] font-bold tabular-nums",
                  tx.amount_minor === 0
                    ? "text-slate-500"
                    : positive
                      ? "text-success"
                      : "text-slate-300",
                )}
              >
                {tx.amount_minor === 0
                  ? "—"
                  : `${positive ? "+" : "−"}${formatMinor(Math.abs(tx.amount_minor))}`}
              </span>
              <span className="block text-[10.5px] tabular-nums text-slate-600">
                {formatMinor(tx.balance_after_minor)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
