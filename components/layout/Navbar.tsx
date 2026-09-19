"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Gift, Package, ShoppingBag, TrendingUp, Backpack } from "lucide-react";
import { ZevoraLogo } from "@/components/art/ZevoraLogo";
import { BalanceWidget } from "@/components/layout/BalanceWidget";
import { UserMenu } from "@/components/layout/UserMenu";
import { cn } from "@/lib/utils";

export const NAV_LINKS = [
  { href: "/cases", label: "Кейсы", icon: Package },
  { href: "/upgrade", label: "Апгрейд", icon: TrendingUp },
  { href: "/inventory", label: "Инвентарь", icon: Backpack },
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
          ? "border-b border-white/[0.07] bg-void/80 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-3 sm:h-[68px] sm:gap-5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zev-400"
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
                  "relative rounded-xl px-3.5 py-2 text-[13.5px] font-medium transition-colors duration-200",
                  active ? "text-white" : "text-slate-400 hover:text-white",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl border border-white/10 bg-white/[0.07]"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}

          <Link
            href="/partners"
            className={cn(
              "group relative ml-1 flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[13.5px] font-medium transition-all duration-300",
              isActive("/partners")
                ? "border-gold-400/60 bg-gold-400/15 text-gold-300"
                : "border-gold-400/25 bg-gold-400/[0.07] text-gold-300/90 hover:border-gold-400/50 hover:bg-gold-400/[0.14]",
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
