"use client";

import { motion } from "framer-motion";
import { Check, Lock } from "lucide-react";
import { PERKS } from "@/data/partners";
import { PerkIcon } from "@/components/partners/PerkIcon";
import { cn } from "@/lib/utils";

/**
 * Interactive perk cards. When `granted` is supplied the grid switches from
 * a showcase to a checklist of what this partner actually holds.
 */
export function PerksGrid({
  granted,
  accent = "#F5B841",
}: {
  granted?: string[];
  accent?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PERKS.map((perk, i) => {
        const has = granted ? granted.includes(perk.id) : null;
        const color = has === false ? "#5A6480" : accent;

        return (
          <motion.article
            key={perk.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: Math.min(i, 9) * 0.04 }}
            whileHover={{ y: -4 }}
            className={cn(
              "group relative overflow-hidden rounded-lg border p-4 transition-colors duration-300",
              has === false
                ? "border-white/[0.05] bg-white/[0.015] opacity-60"
                : "border-white/[0.08] bg-white/[0.03] hover:border-white/20",
            )}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-30"
              style={{ background: color }}
            />

            <div className="relative flex items-start gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110"
                style={{
                  color,
                  borderColor: `${color}38`,
                  background: `${color}14`,
                }}
              >
                <PerkIcon name={perk.icon} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-[14px] font-semibold text-white">
                    {perk.name}
                  </h3>
                  {has === true && (
                    <Check size={14} className="shrink-0" style={{ color }} />
                  )}
                  {has === false && (
                    <Lock size={12} className="shrink-0 text-slate-600" />
                  )}
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-400">
                  {perk.description}
                </p>
              </div>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
