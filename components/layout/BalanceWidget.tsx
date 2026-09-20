"use client";

import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { useSession } from "@/lib/client/session";
import { useCountUp } from "@/hooks/useCountUp";
import { formatMinor } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Balance pill plus a deposit shortcut. Animates on every change. */
export function BalanceWidget({ className }: { className?: string }) {
  const { user, ready } = useSession();
  const display = useCountUp(user?.balance_minor ?? 0);

  if (ready && !user) return null;

  return (
    <div
      className={cn(
        "flex shrink items-center gap-1 rounded-xl border border-white/[0.09] bg-white/[0.045] p-1 pl-2 sm:pl-3",
        className,
      )}
    >
      <Wallet size={14} className="hidden shrink-0 text-zev-300 min-[360px]:block" />
      <span className="truncate px-1 text-[12.5px] font-bold tabular-nums text-white sm:min-w-[72px] sm:text-[13.5px]">
        {ready ? formatMinor(display) : "—"}
      </span>
      <Link
        href="/wallet"
        aria-label="Пополнить баланс"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(120deg,#5B4BFF,#7C5CFF)] text-white transition hover:brightness-115 active:scale-95 sm:h-8 sm:w-8"
      >
        <Plus size={15} />
      </Link>
    </div>
  );
}
