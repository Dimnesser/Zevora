"use client";

import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { useCountUp } from "@/hooks/useCountUp";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Balance pill + deposit shortcut. Animates whenever the balance changes. */
export function BalanceWidget({ className }: { className?: string }) {
  const balance = useStore((s) => s.user.balance);
  const hydrated = useHydrated();
  const display = useCountUp(hydrated ? balance : 0);

  return (
    <div
      className={cn(
        "flex shrink items-center gap-1 rounded-xl border border-white/[0.09] bg-white/[0.045] p-1 pl-2 sm:pl-3",
        className,
      )}
    >
      <Wallet size={14} className="hidden shrink-0 text-zev-300 min-[360px]:block" />
      <span className="truncate px-1 text-[12.5px] font-bold tabular-nums text-white sm:min-w-[72px] sm:text-[13.5px]">
        {hydrated ? formatMoney(display) : "—"}
      </span>
      <Link
        href="/wallet"
        aria-label="Пополнить баланс"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8 bg-[linear-gradient(120deg,#5B4BFF,#7C5CFF)] text-white transition hover:brightness-115 active:scale-95"
      >
        <Plus size={15} />
      </Link>
    </div>
  );
}
