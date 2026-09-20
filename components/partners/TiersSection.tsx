"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { PartnerTier } from "@/types";
import { PERK_MAP, TIER_LIST } from "@/data/partners";
import { formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Tier ladder. Levels are assigned by the owner — never earned automatically. */
export function TiersSection({ current }: { current?: PartnerTier | null }) {
  return (
    <div className="grid gap-3 lg:grid-cols-4">
      {TIER_LIST.map((tier, i) => {
        const [c1, c2] = tier.colors;
        const active = current === tier.id;

        return (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: i * 0.07 }}
            className={cn(
              "relative flex flex-col overflow-hidden rounded-lg border p-5",
              active ? "bg-white/[0.05]" : "bg-white/[0.02]",
            )}
            style={{
              borderColor: active ? c1 : "rgba(255,255,255,.08)",
              boxShadow: active ? `0 0 44px -20px ${c1}` : undefined,
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${c1}, transparent)`,
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full opacity-20 blur-[50px]"
              style={{ background: c1 }}
            />

            {active && (
              <span
                className="absolute right-3 top-3 rounded-md px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider"
                style={{ background: `${c1}22`, color: c1 }}
              >
                Ваш уровень
              </span>
            )}

            <span
              className="mb-3 h-1.5 w-12 rounded-full"
              style={{ background: `linear-gradient(90deg, ${c1}, ${c2})` }}
            />

            <h3
              className="font-display text-[19px] font-bold"
              style={{ color: c1 }}
            >
              {tier.name}
            </h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-400">
              {tier.tagline}
            </p>

            <dl className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
              <Row label="Доля от оборота" value={formatPercent(tier.share, 0)} />
              <Row label="Daily" value={`+${formatMoney(tier.dailyReward)}`} />
              <Row label="Реферальный бонус" value={`×${tier.refMultiplier}`} />
            </dl>

            <ul className="mt-4 space-y-1.5">
              {tier.perks.slice(0, 6).map((id) => (
                <li
                  key={id}
                  className="flex items-start gap-2 text-[12px] text-slate-400"
                >
                  <Check size={12} className="mt-0.5 shrink-0" style={{ color: c1 }} />
                  <span className="min-w-0 truncate">
                    {PERK_MAP[id]?.name ?? id}
                  </span>
                </li>
              ))}
              {tier.perks.length > 6 && (
                <li className="pl-5 text-[12px] text-slate-500">
                  и ещё {tier.perks.length - 6}
                </li>
              )}
            </ul>
          </motion.div>
        );
      })}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[12px] text-slate-500">{label}</dt>
      <dd className="text-[12.5px] font-semibold tabular-nums text-white">
        {value}
      </dd>
    </div>
  );
}
