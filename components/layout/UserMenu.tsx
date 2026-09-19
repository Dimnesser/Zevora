"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Backpack,
  ChevronDown,
  Gift,
  LogOut,
  Shield,
  Trophy,
  User as UserIcon,
  Wallet,
} from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { Avatar } from "@/components/art/Avatar";
import { PartnerBadge } from "@/components/partners/PartnerBadge";
import { TIERS } from "@/data/partners";
import { formatMoney } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { ConfirmDialog } from "@/components/ui/Modal";

const LINKS = [
  { href: "/profile", label: "Профиль", icon: UserIcon },
  { href: "/inventory", label: "Инвентарь", icon: Backpack },
  { href: "/wallet", label: "Баланс и вывод", icon: Wallet },
  { href: "/bonuses", label: "Бонусы", icon: Gift },
  { href: "/leaderboard", label: "Рейтинг", icon: Trophy },
];

export function UserMenu() {
  const user = useStore((s) => s.user);
  const reset = useStore((s) => s.resetAccount);
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const tier = hydrated ? user.partner?.tier : undefined;
  const ring = tier ? TIERS[tier].colors[0] : undefined;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.045] p-1 pr-1.5 transition hover:border-white/20 hover:bg-white/[0.08] sm:pr-2"
      >
        <Avatar seed={user.avatarSeed} size={30} ring={ring} />
        <span className="hidden max-w-[96px] truncate text-[13px] font-medium text-white sm:block">
          {hydrated ? user.username : "…"}
        </span>
        <ChevronDown
          size={14}
          className={`hidden text-slate-400 transition-transform duration-200 min-[360px]:block ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong absolute right-0 z-50 mt-2 w-[268px] overflow-hidden rounded-2xl p-1.5"
          >
            <div className="flex items-center gap-3 px-3 py-3">
              <Avatar seed={user.avatarSeed} size={42} ring={ring} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {user.username}
                </p>
                <p className="text-[12px] text-slate-400">
                  {formatMoney(user.balance)} · ур. {user.level}
                </p>
              </div>
            </div>

            {tier && (
              <div className="px-3 pb-2">
                <PartnerBadge tier={tier} size="xs" />
              </div>
            )}

            <div className="my-1 h-px bg-white/[0.07]" />

            {LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
              >
                <Icon size={15} className="text-slate-500" />
                {label}
              </Link>
            ))}

            {user.role === "owner" && (
              <>
                <div className="my-1 h-px bg-white/[0.07]" />
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] text-gold-300 transition hover:bg-gold-400/10"
                >
                  <Shield size={15} />
                  Админ-панель
                </Link>
              </>
            )}

            <div className="my-1 h-px bg-white/[0.07]" />
            <button
              onClick={() => {
                setOpen(false);
                setConfirmReset(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] text-slate-400 transition hover:bg-danger/10 hover:text-danger"
            >
              <LogOut size={15} />
              Сбросить демо-аккаунт
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          reset();
          toast.success("Аккаунт сброшен", "Баланс, инвентарь и история очищены");
        }}
        title="Сбросить демо-аккаунт?"
        description="Баланс, инвентарь, история операций и партнёрские статусы вернутся к исходному состоянию. Действие необратимо."
        confirmLabel="Сбросить"
        danger
      />
    </div>
  );
}
