"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Backpack, FileSignature, Home, Package, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobile tab bar — a purpose-built five-slot layout, not a shrunken desktop
 * nav. The centre slot is the primary action (cases).
 */
const TABS = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/upgrade", label: "Апгрейд", icon: TrendingUp },
  { href: "/cases", label: "Кейсы", icon: Package, primary: true },
  { href: "/inventory", label: "Инвентарь", icon: Backpack },
  { href: "/contracts", label: "Контракты", icon: FileSignature },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-[80] border-t border-line bg-void/90 px-2 pt-1.5 shadow-[0_-8px_30px_-12px_rgba(0,0,0,.9)] backdrop-blur-xl lg:hidden">
      <ul className="mx-auto flex max-w-lg items-end justify-between">
        {TABS.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;

          if (tab.primary) {
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  className="flex flex-col items-center gap-1 pb-1"
                  aria-label={tab.label}
                >
                  <span
                    className={cn(
                      "-mt-6 flex h-[52px] w-[52px] items-center justify-center rounded-lg transition-all duration-300",
                      "border border-zev-400/60 bg-zev-500",
                      active
                        ? "shadow-[inset_0_1px_0_0_rgba(255,255,255,.28),0_12px_34px_-10px_rgba(91,75,255,1)]"
                        : "shadow-[inset_0_1px_0_0_rgba(255,255,255,.22),0_8px_24px_-12px_rgba(91,75,255,.9)]",
                    )}
                  >
                    <Icon size={22} className="text-white" />
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      active ? "text-white" : "text-slate-500",
                    )}
                  >
                    {tab.label}
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className="relative flex flex-col items-center gap-1 py-2"
                aria-label={tab.label}
              >
                {active && (
                  <motion.span
                    layoutId="mobile-active"
                    className="absolute -top-[7px] h-[2px] w-8 rounded-full bg-zev-400"
                    style={{ boxShadow: "0 0 12px 1px rgba(112,117,255,.9)" }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon
                  size={19}
                  className={cn(
                    "transition-colors",
                    active ? "text-white" : "text-slate-500",
                  )}
                />
                <span
                  className={cn(
                    "font-mono text-[9.5px] uppercase tracking-[0.1em] transition-colors",
                    active ? "text-white" : "text-slate-500",
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
