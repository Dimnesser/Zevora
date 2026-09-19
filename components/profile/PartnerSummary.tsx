"use client";

import Link from "next/link";
import { ArrowRight, Check, Copy, Link2, Ticket } from "lucide-react";
import type { PartnerProfile } from "@/types";
import { TIERS } from "@/data/partners";
import { conversion, refLinkFor } from "@/lib/partner";
import { useCopy } from "@/hooks/useCopy";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PartnerBadge } from "@/components/partners/PartnerBadge";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { toast } from "@/lib/store/useToast";

/** Compact partner block shown on the profile page. */
export function PartnerSummary({ partner }: { partner: PartnerProfile }) {
  const meta = TIERS[partner.tier];
  const [c1, c2] = meta.colors;
  const link = refLinkFor(partner.refCode);
  const { copied, copy } = useCopy();

  const stats = [
    { label: "Переходы", value: formatNumber(partner.stats.clicks) },
    { label: "Регистрации", value: formatNumber(partner.stats.signups) },
    { label: "Активные", value: formatNumber(partner.stats.active) },
    { label: "Доход", value: formatMoney(partner.stats.revenue) },
    { label: "Бонусы", value: formatMoney(partner.stats.bonusPool) },
    { label: "Конверсия", value: formatPercent(conversion(partner.stats)) },
  ];

  return (
    <Card
      strong
      className="relative overflow-hidden p-5 sm:p-6"
      style={{
        borderColor: `${c1}40`,
        background: `linear-gradient(130deg, ${c1}14, ${c2}0A), rgba(13,16,32,.75)`,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-full opacity-25 blur-[70px]"
        style={{ background: c1 }}
      />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Partner
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <PartnerBadge tier={partner.tier} size="md" />
            <span className="text-[12.5px] text-slate-400">
              доля {formatPercent(meta.share, 0)}
            </span>
          </div>
        </div>
        <Link href="/partners">
          <Button variant="secondary" iconRight={<ArrowRight size={15} />}>
            Partner Lounge
          </Button>
        </Link>
      </div>

      <div className="relative mt-5 grid gap-2.5 sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 py-2.5">
          <Link2 size={14} className="shrink-0 text-slate-500" />
          <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-slate-300">
            {link}
          </span>
          <button
            onClick={async () => {
              if (await copy(link)) toast.success("Партнёрская ссылка скопирована");
            }}
            aria-label="Скопировать ссылку"
            className="shrink-0 rounded-lg border border-white/10 bg-white/[0.06] p-1.5 text-white transition hover:bg-white/[0.12]"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 py-2.5">
          <Ticket size={14} className="shrink-0 text-slate-500" />
          <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] font-semibold tracking-wider text-white">
            {partner.promo}
          </span>
          <button
            onClick={async () => {
              if (await copy(partner.promo)) toast.success("Промокод скопирован");
            }}
            aria-label="Скопировать промокод"
            className="shrink-0 rounded-lg border border-white/10 bg-white/[0.06] p-1.5 text-white transition hover:bg-white/[0.12]"
          >
            <Copy size={13} />
          </button>
        </div>
      </div>

      <dl className="relative mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-2.5 py-2.5 text-center"
          >
            <dt className="text-[10px] uppercase tracking-wider text-slate-500">
              {s.label}
            </dt>
            <dd className="mt-0.5 truncate text-[13px] font-bold tabular-nums text-white">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
