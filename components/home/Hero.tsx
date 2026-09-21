"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { CaseImage } from "@/components/art/CaseImage";
import { SkinImage } from "@/components/art/SkinImage";
import { api, type CaseItem, type CaseSummary } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { formatMinor } from "@/lib/format";
import { rarityColor } from "@/lib/client/display";
import { Button } from "@/components/ui/Button";

/** The case whose contents headline the hero scene. */
const HERO_CASE = "legenda-2013";

const TRUST = [
  { icon: ShieldCheck, label: "Шансы открыты" },
  { icon: Zap, label: "Продажа в один клик" },
  { icon: Sparkles, label: "Вывод за 5 минут" },
];

/**
 * Landing hero.
 *
 * Deliberately not the template split of copy-left / picture-right. The
 * case sits on the centre line as the subject of the shot, the headline
 * sits over it, and the three top drops orbit it on their own planes —
 * so the whole block reads as one staged scene rather than two columns
 * placed side by side.
 *
 * The scene is built from the live catalogue, so editing the case in the
 * admin panel changes what the landing page shows.
 */
export function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [par, setPar] = useState({ x: 0, y: 0 });

  const { data } = useResource(() => api.caseDetail(HERO_CASE).catch(() => null), []);
  const kase: CaseSummary | null = data?.case ?? null;
  const showcase: CaseItem[] = (data?.items ?? [])
    .slice()
    .sort((a, b) => b.price_minor - a.price_minor)
    .slice(0, 3);

  // Pointer parallax, bound to the section rather than the window so it
  // stays put once the hero scrolls away.
  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      setPar({
        x: (e.clientX - r.left) / r.width - 0.5,
        y: (e.clientY - r.top) / r.height - 0.5,
      });
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [reduce]);

  /** Depth: further planes move less. */
  const plane = (depth: number) => ({
    transform: `translate3d(${par.x * depth}px, ${par.y * depth}px, 0)`,
  });

  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* ── backdrop: grid, then a slow light bloom behind the subject ── */}
      <div
        aria-hidden
        className="bg-tech-grid pointer-events-none absolute inset-0 opacity-50"
        style={{
          maskImage: "radial-gradient(820px circle at 50% 34%, #000 8%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(820px circle at 50% 34%, #000 8%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="glow-pool left-1/2 top-[-120px] h-[380px] w-[720px] -translate-x-1/2 animate-breathe opacity-40"
        style={{ background: "radial-gradient(closest-side, #5B4BFF, transparent)" }}
      />
      <div
        aria-hidden
        className="glow-pool left-1/2 top-[120px] h-[300px] w-[900px] -translate-x-1/2 opacity-25"
        style={{ background: "radial-gradient(closest-side, #22D3EE, transparent)" }}
      />

      <div className="relative mx-auto max-w-[1180px] px-4 pb-14 pt-12 text-center sm:px-6 lg:pb-20 lg:pt-16">
        {/* ── eyebrow ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-7 inline-flex items-center gap-2.5 rounded-xs border border-line bg-black/40 py-1.5 pl-1.5 pr-3.5 backdrop-blur-sm"
        >
          <span className="rounded-xs bg-zev-500/20 px-2 py-1 font-mono text-label text-zev-200">
            CS2
          </span>
          <span className="meta text-slate-400">
            {/* The static demo draws in the browser; saying otherwise here
                would contradict the banner two lines above it. */}
            {process.env.NEXT_PUBLIC_ZEVORA_STATIC === "1"
              ? "Витрина интерфейса · реальные скины"
              : "Серверный розыгрыш · реальные скины"}
          </span>
        </motion.div>

        {/* ── headline over the scene ── */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-[14ch] font-display text-[clamp(40px,8.5vw,84px)] font-bold leading-[0.94] tracking-[-0.035em] text-white"
        >
          Открой.<br />
          Испытай.{" "}
          <span className="text-gradient-brand">Забери.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.16 }}
          className="mx-auto mt-5 max-w-[46ch] text-[15px] leading-relaxed text-slate-400"
        >
          Открывай кейсы, улучшай предметы и собирай свой инвентарь в Zevora.
        </motion.p>

        {/* ═══ the scene ═══ */}
        <div className="perspective relative mx-auto mt-4 h-[264px] w-full max-w-[900px] sm:h-[310px] lg:h-[356px]">
          {/* the case, centre stage */}
          {/* Centring and parallax live on separate elements: an inline
              transform would otherwise overwrite the -translate-x-1/2
              utility and knock the case off the centre line. */}
          <div className="absolute left-1/2 top-1/2 h-[170px] w-[250px] -translate-x-1/2 -translate-y-1/2 sm:h-[200px] sm:w-[296px] lg:h-[238px] lg:w-[352px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 26 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-full w-full"
            >
              <div style={plane(18)} className="h-full w-full">
                <div className={reduce ? "h-full w-full" : "h-full w-full animate-float"}>
                  {kase ? (
                    <CaseImage imageUrl={kase.image_url} art={kase.art} label={kase.name} />
                  ) : (
                    <div className="skeleton h-full w-full" />
                  )}
                </div>
                {/* the pool it stands in */}
                <div
                  aria-hidden
                  className="glow-pool left-1/2 top-[72%] h-24 w-[70%] -translate-x-1/2 opacity-60"
                  style={{ background: kase?.art.color_a ?? "#5B4BFF" }}
                />
              </div>
            </motion.div>
          </div>

          {/* the three best drops, orbiting on their own planes */}
          {showcase.map((item, i) => {
            // Corners only: the centre column belongs to the case, so no
            // card can ever land on top of it at any breakpoint.
            const spots = [
              "left-0 top-[4%]",
              "right-0 top-[16%]",
              "left-[14%] bottom-0 sm:left-[10%]",
            ];
            const depths = [46, 34, 56];
            const color = rarityColor(item.rarity.slug, item.rarity.color);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 22, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.7,
                  delay: 0.45 + i * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`absolute w-[104px] sm:w-[132px] lg:w-[158px] ${spots[i]}`}
                style={plane(depths[i])}
              >
                <div
                  className="relative rounded-md border border-line bg-slab/75 p-2 shadow-e3 backdrop-blur-sm"
                  style={{ boxShadow: `inset 0 1px 0 0 rgba(255,255,255,.06), 0 18px 40px -22px ${color}` }}
                >
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-px"
                    style={{ background: `linear-gradient(90deg,transparent,${color},transparent)` }}
                  />
                  <div className="h-[44px] sm:h-[54px] lg:h-[64px]">
                    <SkinImage imageUrl={item.image_url} art={item.art} label={item.market_name} />
                  </div>
                  <div className="mt-1.5 text-left">
                    <p className="meta truncate" style={{ color }}>
                      {item.finish}
                    </p>
                    <p className="truncate font-mono text-[11px] tnum text-slate-300">
                      {formatMinor(item.price_minor)}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── actions ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative z-20 mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <Link href="/cases" className="w-full sm:w-auto">
            <Button variant="accent" size="xl" fullWidth iconRight={<ArrowRight size={17} />}>
              Открыть кейсы
            </Button>
          </Link>
          <Link href="/upgrade" className="w-full sm:w-auto">
            <Button variant="secondary" size="xl" fullWidth>
              Апгрейд предметов
            </Button>
          </Link>
        </motion.div>

        {/* ── trust rail ── */}
        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.42 }}
          className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
        >
          {TRUST.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-1.5">
              <Icon size={13} className="text-ice-500" />
              <span className="meta">{label}</span>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
