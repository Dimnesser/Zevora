"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { CaseArt } from "@/components/art/CaseArt";
import { SkinArt } from "@/components/art/SkinArt";
import { getCase } from "@/data/cases";
import { getSkin } from "@/data/skins";
import { RARITY } from "@/lib/rarity";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/Button";

const HERO_CASE = "knife-vault";
/** The three showcase skins floating around the case. */
const SHOWCASE = ["kar-nebula", "awp-voidrunner", "ak-emberlord"];

const TRUST = [
  { icon: ShieldCheck, label: "Прозрачные шансы" },
  { icon: Zap, label: "Мгновенная продажа" },
  { icon: Sparkles, label: "Вывод за 5 минут" },
];

export function Hero() {
  const reduce = useReducedMotion();
  const kase = getCase(HERO_CASE)!;

  return (
    <section className="relative overflow-hidden">
      {/* backdrop */}
      <div
        aria-hidden
        className="bg-tech-grid pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          maskImage:
            "radial-gradient(760px circle at 50% 30%, #000 10%, transparent 72%)",
          WebkitMaskImage:
            "radial-gradient(760px circle at 50% 30%, #000 10%, transparent 72%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-160px] h-[420px] w-[820px] -translate-x-1/2 rounded-full opacity-30 blur-[120px]"
        style={{
          background:
            "conic-gradient(from 210deg, #5B4BFF, #A855F7, #22D3EE, #5B4BFF)",
        }}
      />

      <div className="relative mx-auto grid max-w-[1440px] items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-24 lg:pt-20 xl:px-8">
        {/* ─────────── copy ─────────── */}
        <div className="relative z-10 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] py-1.5 pl-1.5 pr-4 backdrop-blur"
          >
            <span className="rounded-full bg-[linear-gradient(120deg,#5B4BFF,#22D3EE)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              CS2
            </span>
            <span className="text-[12.5px] text-slate-300">
              14 кейсов · 48 предметов · честный рандом
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="font-display text-[40px] font-bold leading-[1.02] tracking-tight sm:text-[58px] lg:text-[66px] xl:text-[74px]"
          >
            <span className="block text-gradient">Открой.</span>
            <span className="block text-gradient">Испытай.</span>
            <span className="block text-gradient-brand">Забери.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.14 }}
            className="mx-auto mt-6 max-w-lg text-[15px] leading-relaxed text-slate-400 sm:text-base lg:mx-0"
          >
            Открывай кейсы, улучшай предметы и собирай свой инвентарь в Zevora.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
          >
            <Link href="/cases" className="w-full sm:w-auto">
              <Button size="xl" fullWidth iconRight={<ArrowRight size={17} />}>
                Открыть кейсы
              </Button>
            </Link>
            <Link href="/upgrade" className="w-full sm:w-auto">
              <Button size="xl" variant="secondary" fullWidth>
                Апгрейд предметов
              </Button>
            </Link>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.32 }}
            className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-3 lg:justify-start"
          >
            {TRUST.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 text-[12.5px] text-slate-500"
              >
                <Icon size={14} className="text-zev-300" />
                {label}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* ─────────── scene ─────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto aspect-square w-full max-w-[520px]"
        >
          {/* rotating aura rings */}
          <div
            aria-hidden
            className={`absolute inset-[8%] rounded-full border border-white/[0.07] ${
              reduce ? "" : "animate-spin-slow"
            }`}
            style={{ borderTopColor: "rgba(110,113,255,.5)" }}
          />
          <div
            aria-hidden
            className={`absolute inset-[20%] rounded-full border border-white/[0.06] ${
              reduce ? "" : "animate-spin-slow"
            }`}
            style={{
              animationDirection: "reverse",
              animationDuration: "22s",
              borderBottomColor: "rgba(34,211,238,.45)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-[26%] rounded-full opacity-45 blur-[70px]"
            style={{
              background:
                "radial-gradient(circle, #7C5CFF 0%, #22D3EE 55%, transparent 72%)",
            }}
          />

          {/* centre case */}
          <motion.div
            className="absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2"
            animate={reduce ? undefined : { y: [-10, 10, -10] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <CaseArt def={kase} />
          </motion.div>

          {/* floating skins */}
          {SHOWCASE.map((id, i) => {
            const skin = getSkin(id);
            const rarity = RARITY[skin.rarity];
            const positions = [
              "left-[-2%] top-[10%]",
              "right-[-4%] top-[38%]",
              "left-[6%] bottom-[6%]",
            ];
            return (
              <motion.div
                key={id}
                className={`absolute w-[46%] sm:w-[44%] ${positions[i]}`}
                initial={{ opacity: 0, y: 26, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.7,
                  delay: 0.4 + i * 0.14,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <motion.div
                  animate={reduce ? undefined : { y: [-7, 7, -7] }}
                  transition={{
                    duration: 5 + i,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.5,
                  }}
                  className="glass-strong rounded-2xl p-2.5"
                  style={{ borderColor: `${rarity.color}45` }}
                >
                  <div className="h-[52px]">
                    <SkinArt skin={skin} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2 px-0.5">
                    <span
                      className="truncate text-[10.5px] font-bold uppercase tracking-wide"
                      style={{ color: rarity.color }}
                    >
                      {skin.name}
                    </span>
                    <span className="shrink-0 text-[10.5px] font-semibold tabular-nums text-white">
                      {formatMoney(skin.price)}
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
