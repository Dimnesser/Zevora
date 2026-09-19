"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Crown, Lock } from "lucide-react";
import { TIER_LIST } from "@/data/partners";
import { Button } from "@/components/ui/Button";

/** Home-page gateway into the closed partner programme. */
export function PartnersTeaser() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-14">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55 }}
        className="glass-strong relative overflow-hidden rounded-3xl px-6 py-10 sm:px-10 lg:px-14 lg:py-14"
        style={{ borderColor: "rgba(245,184,65,0.22)" }}
      >
        <div
          aria-hidden
          className="bg-tech-grid pointer-events-none absolute inset-0 opacity-40"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-25 blur-[90px]"
          style={{ background: "linear-gradient(120deg,#F5B841,#A855F7)" }}
        />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-300">
              <Crown size={12} />
              Закрытая программа
            </span>

            <h2 className="mt-5 font-display text-[30px] font-bold leading-tight sm:text-[38px]">
              Zevora <span className="text-gradient-brand">Partners</span>
            </h2>
            <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-slate-400">
              Закрытая программа для людей, которые развивают Zevora вместе с
              нами. Статус нельзя купить или получить автоматически — его
              выдаёт владелец платформы вручную.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/partners">
                <Button variant="gold" size="lg" iconRight={<ArrowRight size={16} />}>
                  Узнать о программе
                </Button>
              </Link>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-500">
                <Lock size={13} />
                Приглашение только от владельца
              </span>
            </div>
          </div>

          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {TIER_LIST.map((tier, i) => (
              <motion.li
                key={tier.id}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.08 * i }}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3"
              >
                <span
                  className="h-9 w-1.5 shrink-0 rounded-full"
                  style={{
                    background: `linear-gradient(180deg, ${tier.colors[0]}, ${tier.colors[1]})`,
                    boxShadow: `0 0 14px -2px ${tier.colors[0]}`,
                  }}
                />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-white">
                    {tier.name}
                  </p>
                  <p className="truncate text-[11.5px] text-slate-500">
                    {tier.tagline}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.div>
    </section>
  );
}
