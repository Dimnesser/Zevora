"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Trophy } from "lucide-react";
import { buildLeaderboard } from "@/data/community";
import { Avatar } from "@/components/art/Avatar";
import { PartnerBadge } from "@/components/partners/PartnerBadge";
import { SectionHeader } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";

const MEDALS = ["#F5B841", "#C9D2E3", "#CD7F42"];

export function TopPlayers() {
  const top = buildLeaderboard(5);

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <SectionHeader
        eyebrow="Сообщество"
        title="Топ игроков недели"
        description="Рейтинг обновляется каждый час по сумме выигранных предметов."
        action={
          <Link href="/leaderboard">
            <Button variant="secondary" iconRight={<ArrowRight size={15} />}>
              Весь рейтинг
            </Button>
          </Link>
        }
      />

      <div className="glass divide-y divide-white/[0.05] overflow-hidden">
        {top.map((row, i) => (
          <motion.div
            key={row.username}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
            className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.03] sm:gap-4 sm:px-5"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold tabular-nums"
              style={{
                color: MEDALS[i] ?? "#7C8AA6",
                background: `${MEDALS[i] ?? "#7C8AA6"}14`,
                border: `1px solid ${MEDALS[i] ?? "#7C8AA6"}33`,
              }}
            >
              {i < 3 ? <Trophy size={14} /> : row.rank}
            </span>

            <Avatar
              seed={row.avatarSeed}
              size={36}
              ring={row.partnerTier ? "#F5B841" : undefined}
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[14px] font-semibold text-white">
                  {row.username}
                </p>
                {row.partnerTier && (
                  <PartnerBadge tier={row.partnerTier} size="xs" iconOnly />
                )}
              </div>
              <p className="text-[11.5px] text-slate-500">
                {row.upgrades} апгрейдов
              </p>
            </div>

            <div className="text-right">
              <p className="text-[14px] font-bold tabular-nums text-white">
                {formatMoney(row.won)}
              </p>
              <p className="text-[11px] text-slate-500">выиграно</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
