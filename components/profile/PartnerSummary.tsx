"use client";

import Link from "next/link";
import { ArrowRight, Check, Copy, Link2, Ticket } from "lucide-react";
import type { SessionUser } from "@/lib/client/api";
import { TIERS } from "@/data/partners";
import { useCopy } from "@/hooks/useCopy";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PartnerBadge } from "@/components/partners/PartnerBadge";
import { formatDate, formatMinor, formatPercent } from "@/lib/format";
import { toast } from "@/lib/store/useToast";

type Partner = NonNullable<SessionUser["partner"]>;

/** Compact partner block on the profile page. */
export function PartnerSummary({
  partner,
  username,
}: {
  partner: Partner;
  username: string;
}) {
  const meta = TIERS[partner.tier as keyof typeof TIERS];
  const [c1, c2] = meta.colors;
  const link = `https://zevora.example/?ref=${partner.ref_code ?? username}`;
  const { copied, copy } = useCopy();

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
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <PartnerBadge tier={partner.tier as keyof typeof TIERS} size="md" />
            <span className="text-[12.5px] text-slate-400">
              доля {formatPercent(meta.share, 0)}
              {partner.since && ` · с ${formatDate(partner.since)}`}
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

        {partner.promo_code && (
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 py-2.5">
            <Ticket size={14} className="shrink-0 text-slate-500" />
            <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] font-semibold tracking-wider text-white">
              {partner.promo_code}
            </span>
            <button
              onClick={async () => {
                if (await copy(partner.promo_code!)) toast.success("Промокод скопирован");
              }}
              aria-label="Скопировать промокод"
              className="shrink-0 rounded-lg border border-white/10 bg-white/[0.06] p-1.5 text-white transition hover:bg-white/[0.12]"
            >
              <Copy size={13} />
            </button>
          </div>
        )}
      </div>

      <dl className="relative mt-4 grid grid-cols-3 gap-2">
        <Tile label="Привилегий" value={String(partner.perks.length)} />
        <Tile
          label="Daily"
          value={
            partner.daily_minor !== null
              ? `+${formatMinor(partner.daily_minor)}`
              : `+${formatMinor(meta.dailyReward * 100)}`
          }
        />
        <Tile
          label="Рефералы"
          value={`×${partner.ref_multiplier ?? meta.refMultiplier}`}
        />
      </dl>
    </Card>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-2.5 py-2.5 text-center">
      <dt className="text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] font-bold tabular-nums text-white">
        {value}
      </dd>
    </div>
  );
}
