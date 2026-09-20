"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Backpack,
  ChevronDown,
  Gift,
  History,
  LogIn,
  LogOut,
  Shield,
  Trophy,
  User as UserIcon,
  Wallet,
} from "lucide-react";
import { useSession } from "@/lib/client/session";
import { Avatar } from "@/components/art/Avatar";
import { PartnerBadge } from "@/components/partners/PartnerBadge";
import { TIERS } from "@/data/partners";
import { formatMinor } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { Button } from "@/components/ui/Button";

const LINKS = [
  { href: "/profile", label: "Профиль", icon: UserIcon },
  { href: "/inventory", label: "Инвентарь", icon: Backpack },
  { href: "/history", label: "История открытий", icon: History },
  { href: "/wallet", label: "Баланс и вывод", icon: Wallet },
  { href: "/bonuses", label: "Бонусы", icon: Gift },
  { href: "/leaderboard", label: "Рейтинг", icon: Trophy },
];

export function UserMenu() {
  const router = useRouter();
  const { user, ready, logout } = useSession();
  const [open, setOpen] = useState(false);
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

  if (ready && !user) {
    return (
      <Link href="/login">
        <Button size="sm" iconLeft={<LogIn size={14} />}>
          Войти
        </Button>
      </Link>
    );
  }

  if (!user) {
    return <div className="h-10 w-[104px] rounded-xl bg-white/[0.04]" />;
  }

  const tier = user.partner?.tier as keyof typeof TIERS | undefined;
  const ring = tier ? TIERS[tier].colors[0] : undefined;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.045] p-1 pr-1.5 transition hover:border-white/20 hover:bg-white/[0.08] sm:pr-2"
      >
        <Avatar seed={user.avatar_seed} size={30} ring={ring} />
        <span className="hidden max-w-[96px] truncate text-[13px] font-medium text-white sm:block">
          {user.username}
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
            className="glass-strong absolute right-0 z-50 mt-2 w-[268px] overflow-hidden rounded-lg p-1.5"
          >
            <div className="flex items-center gap-3 px-3 py-3">
              <Avatar seed={user.avatar_seed} size={42} ring={ring} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user.username}</p>
                <p className="text-[12px] text-slate-400">
                  {formatMinor(user.balance_minor)}
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
              onClick={async () => {
                setOpen(false);
                await logout();
                toast.show("Вы вышли из аккаунта");
                router.push("/");
                router.refresh();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] text-slate-400 transition hover:bg-danger/10 hover:text-danger"
            >
              <LogOut size={15} />
              Выйти
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
