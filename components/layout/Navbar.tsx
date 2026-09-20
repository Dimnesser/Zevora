"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Backpack, Crown, Gift, History, Package, ShoppingBag, TrendingUp } from "lucide-react";
import { ZevoraLogo } from "@/components/art/ZevoraLogo";
import { BalanceWidget } from "@/components/layout/BalanceWidget";
import { UserMenu } from "@/components/layout/UserMenu";
import { cn } from "@/lib/utils";

export const NAV_LINKS = [
  { href: "/cases", label: "Кейсы", icon: Package },
  { href: "/upgrade", label: "Апгрейд", icon: TrendingUp },
  { href: "/inventory", label: "Инвентарь", icon: Backpack },
  { href: "/history", label: "История", icon: History },
  { href: "/shop", label: "Магазин", icon: ShoppingBag },
  { href: "/bonuses", label: "Бонусы", icon: Gift },
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[80] transition-all duration-300 ease-premium",
        scrolled
          ? "border-b border-line bg-void/85 shadow-e2 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-[var(--nav-h)] max-w-[1440px] items-center gap-2 px-3 sm:gap-5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 rounded focus-visible:outline-none focus-visible:shadow-focus"
          aria-label="Zevora — на главную"
        >
          <ZevoraLogo className="hidden sm:inline-flex" />
          <ZevoraLogo markOnly className="sm:hidden" />
        </Link>

        {/* desktop nav */}
        <nav className="ml-2 hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative px-3 py-2 text-[13.5px] font-medium transition-colors duration-200",
                  active ? "text-white" : "text-slate-400 hover:text-white",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-zev-400"
                    style={{ boxShadow: "0 0 12px 1px rgba(112,117,255,.9)" }}
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}

          <Link
            href="/partners"
            className={cn(
              "group relative ml-2 flex items-center gap-1.5 rounded border px-3 py-1.5 text-[13px] font-medium transition-all duration-300",
              isActive("/partners")
                ? "border-gold-400/55 bg-gold-400/[0.14] text-gold-300"
                : "border-gold-400/20 bg-gold-400/[0.06] text-gold-300/85 hover:border-gold-400/45 hover:bg-gold-400/[0.12]",
            )}
          >
            <Crown size={14} />
            Partners
          </Link>
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2.5">
          <BalanceWidget />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
