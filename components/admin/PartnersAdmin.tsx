"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Copy,
  Link2,
  Search,
  ShieldMinus,
  ShieldPlus,
  Ticket,
  UserCog,
} from "lucide-react";
import type { PartnerTier } from "@/types";
import { useStore, type ManagedUser } from "@/lib/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { PERKS, TIERS, TIER_LIST } from "@/data/partners";
import { conversion, refLinkFor } from "@/lib/partner";
import { useCopy } from "@/hooks/useCopy";
import { Avatar } from "@/components/art/Avatar";
import { PartnerBadge } from "@/components/partners/PartnerBadge";
import { PerkIcon } from "@/components/partners/PerkIcon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney, formatNumber, formatDate, formatPercent } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { cn } from "@/lib/utils";

/** Closed campaigns an owner can add a partner to. */
const CAMPAIGNS = [
  { id: "winter-drop", name: "Winter Drop" },
  { id: "creator-cup", name: "Creator Cup" },
  { id: "vault-beta", name: "Vault Beta" },
  { id: "x2-weekend", name: "×2 Weekend" },
];

export function PartnersAdmin() {
  const hydrated = useHydrated();
  const self = useStore((s) => s.user);
  const managed = useStore((s) => s.managedUsers);

  const grantPartner = useStore((s) => s.grantPartner);
  const revokePartner = useStore((s) => s.revokePartner);
  const setPartnerTier = useStore((s) => s.setPartnerTier);
  const setPartnerPerks = useStore((s) => s.setPartnerPerks);
  const setPartnerPromo = useStore((s) => s.setPartnerPromo);
  const setPartnerBonus = useStore((s) => s.setPartnerBonus);
  const toggleClosedPromo = useStore((s) => s.toggleClosedPromo);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>("u_self");
  const [promoDraft, setPromoDraft] = useState("");
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const { copied, copy } = useCopy();

  // The owner's own account is managed from the same list.
  const rows: ManagedUser[] = useMemo(() => {
    const selfRow: ManagedUser = {
      id: self.id,
      username: self.username,
      avatarSeed: self.avatarSeed,
      joinedAt: self.createdAt,
      spent: self.stats.totalSpent,
      partner: self.partner ?? null,
    };
    return [selfRow, ...managed];
  }, [self, managed]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.username.toLowerCase().includes(q));
  }, [rows, query]);

  const selected = rows.find((r) => r.id === selectedId) ?? rows[0];
  const partner = selected?.partner ?? null;

  if (!hydrated) {
    return <div className="skeleton h-[560px] rounded-2xl" />;
  }

  const grant = (tier: PartnerTier) => {
    if (partner) {
      setPartnerTier(selected.id, tier);
      toast.success(
        "Уровень изменён",
        `${selected.username} → ${TIERS[tier].name}`,
      );
    } else {
      grantPartner(selected.id, tier);
      toast.success(
        "Партнёрский статус выдан",
        `${selected.username} → ${TIERS[tier].name}`,
      );
    }
  };

  const togglePerk = (perkId: string) => {
    if (!partner) return;
    const next = partner.perks.includes(perkId)
      ? partner.perks.filter((p) => p !== perkId)
      : [...partner.perks, perkId];
    setPartnerPerks(selected.id, next);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* ───────── user list ───────── */}
      <Card className="flex max-h-[720px] flex-col p-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти пользователя"
          iconLeft={<Search size={15} />}
          className="mb-3"
          aria-label="Найти пользователя"
        />

        {filtered.length === 0 ? (
          <EmptyState title="Не найдено" className="py-10" />
        ) : (
          <ul className="no-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto">
            {filtered.map((row) => {
              const active = row.id === selectedId;
              const tier = row.partner?.tier;
              return (
                <li key={row.id}>
                  <button
                    onClick={() => {
                      setSelectedId(row.id);
                      setPromoDraft("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2.5 text-left transition",
                      active
                        ? "border-zev-400/50 bg-zev-500/[0.12]"
                        : "border-transparent hover:bg-white/[0.05]",
                    )}
                  >
                    <Avatar
                      seed={row.avatarSeed}
                      size={34}
                      ring={tier ? TIERS[tier].colors[0] : undefined}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium text-white">
                          {row.username}
                        </span>
                        {row.id === self.id && (
                          <span className="rounded bg-white/10 px-1 text-[9px] font-bold uppercase text-slate-300">
                            вы
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {formatMoney(row.spent)} оборот
                      </span>
                    </span>
                    {tier && <PartnerBadge tier={tier} size="xs" iconOnly />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-3 border-t border-white/[0.06] pt-3 text-[11.5px] text-slate-500">
          Партнёров: {rows.filter((r) => r.partner).length} из {rows.length}
        </p>
      </Card>

      {/* ───────── detail ───────── */}
      <div className="space-y-4">
        <Card strong className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Avatar
                seed={selected.avatarSeed}
                size={52}
                ring={partner ? TIERS[partner.tier].colors[0] : undefined}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[19px] font-bold text-white">
                    {selected.username}
                  </h2>
                  {partner && <PartnerBadge tier={partner.tier} size="sm" />}
                </div>
                <p className="mt-0.5 text-[12.5px] text-slate-400">
                  Регистрация {formatDate(selected.joinedAt)} · оборот{" "}
                  {formatMoney(selected.spent)}
                </p>
              </div>
            </div>

            {partner && (
              <Button
                variant="danger"
                iconLeft={<ShieldMinus size={15} />}
                onClick={() => setConfirmRevoke(true)}
              >
                Снять статус
              </Button>
            )}
          </div>
        </Card>

        {/* tier assignment */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldPlus size={16} className="text-zev-300" />
            <h3 className="text-[15px] font-semibold text-white">
              {partner ? "Изменить уровень" : "Выдать партнёрский статус"}
            </h3>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {TIER_LIST.map((tier) => {
              const active = partner?.tier === tier.id;
              const [c1, c2] = tier.colors;
              return (
                <button
                  key={tier.id}
                  onClick={() => grant(tier.id)}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border p-4 text-left transition",
                    active ? "bg-white/[0.06]" : "bg-white/[0.02] hover:bg-white/[0.05]",
                  )}
                  style={{
                    borderColor: active ? c1 : "rgba(255,255,255,.08)",
                    boxShadow: active ? `0 0 34px -18px ${c1}` : undefined,
                  }}
                >
                  <span
                    className="mb-2.5 block h-1 w-10 rounded-full"
                    style={{ background: `linear-gradient(90deg, ${c1}, ${c2})` }}
                  />
                  <span
                    className="block text-[14px] font-bold"
                    style={{ color: c1 }}
                  >
                    {tier.name}
                  </span>
                  <span className="mt-1 block text-[11.5px] leading-snug text-slate-500">
                    доля {formatPercent(tier.share, 0)} · daily +
                    {formatMoney(tier.dailyReward)}
                  </span>
                  {active && (
                    <Check
                      size={15}
                      className="absolute right-3 top-3"
                      style={{ color: c1 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {!partner && (
            <p className="mt-3 text-[12px] text-slate-500">
              Выберите уровень, чтобы выдать статус. Пользователь сразу получит
              бейдж, ссылку, промокод и доступ к партнёрским кейсам.
            </p>
          )}
        </Card>

        <AnimatePresence>
          {partner && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* stats */}
              <Card className="p-5">
                <h3 className="mb-3.5 text-[15px] font-semibold text-white">
                  Статистика партнёра
                </h3>
                <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    { label: "Переходы", value: formatNumber(partner.stats.clicks) },
                    { label: "Регистрации", value: formatNumber(partner.stats.signups) },
                    { label: "Активные", value: formatNumber(partner.stats.active) },
                    { label: "Доход", value: formatMoney(partner.stats.revenue) },
                    { label: "Бонусы", value: formatMoney(partner.stats.bonusPool) },
                    {
                      label: "Конверсия",
                      value: formatPercent(conversion(partner.stats)),
                    },
                  ].map((s) => (
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

              {/* promo + link */}
              <Card className="p-5">
                <h3 className="mb-3.5 text-[15px] font-semibold text-white">
                  Промокод и ссылка
                </h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field
                    label="Персональный промокод"
                    hint="Код применяется пользователями на странице «Бонусы»."
                  >
                    <div className="flex gap-2">
                      <Input
                        value={promoDraft || partner.promo}
                        onChange={(e) =>
                          setPromoDraft(e.target.value.toUpperCase())
                        }
                        className="font-mono uppercase tracking-wider"
                        aria-label="Промокод партнёра"
                      />
                      <Button
                        onClick={() => {
                          const code = (promoDraft || partner.promo).trim();
                          setPartnerPromo(selected.id, code);
                          setPromoDraft("");
                          toast.success("Промокод сохранён", code.toUpperCase());
                        }}
                      >
                        <Ticket size={15} />
                      </Button>
                    </div>
                  </Field>

                  <Field
                    label="Партнёрская ссылка"
                    hint="Создаётся автоматически из ника партнёра."
                  >
                    <div className="flex gap-2">
                      <Input
                        value={refLinkFor(partner.refCode)}
                        readOnly
                        iconLeft={<Link2 size={14} />}
                        className="font-mono text-[12px]"
                        aria-label="Партнёрская ссылка"
                      />
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          if (await copy(refLinkFor(partner.refCode))) {
                            toast.success("Партнёрская ссылка скопирована");
                          }
                        }}
                      >
                        {copied ? <Check size={15} /> : <Copy size={15} />}
                      </Button>
                    </div>
                  </Field>
                </div>
              </Card>

              {/* bonuses */}
              <Card className="p-5">
                <h3 className="mb-1 text-[15px] font-semibold text-white">
                  Бонусы
                </h3>
                <p className="mb-4 text-[12.5px] text-slate-400">
                  Переопределяют значения уровня {TIERS[partner.tier].name}.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Ежедневная награда">
                    <Input
                      type="number"
                      defaultValue={
                        selected.overrides?.dailyReward ??
                        TIERS[partner.tier].dailyReward
                      }
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v >= 0) {
                          setPartnerBonus(selected.id, { dailyReward: v });
                          toast.success("Ежедневная награда обновлена");
                        }
                      }}
                      suffix="₽"
                      aria-label="Ежедневная награда"
                    />
                  </Field>
                  <Field label="Множитель за рефералов">
                    <Input
                      type="number"
                      step="0.5"
                      defaultValue={
                        selected.overrides?.refMultiplier ??
                        TIERS[partner.tier].refMultiplier
                      }
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v > 0) {
                          setPartnerBonus(selected.id, { refMultiplier: v });
                          toast.success("Множитель обновлён");
                        }
                      }}
                      suffix="×"
                      aria-label="Множитель за рефералов"
                    />
                  </Field>
                </div>
              </Card>

              {/* perks */}
              <Card className="p-5">
                <h3 className="mb-1 text-[15px] font-semibold text-white">
                  Преимущества
                </h3>
                <p className="mb-4 text-[12.5px] text-slate-400">
                  Включайте и отключайте привилегии индивидуально — это
                  переопределяет набор уровня.
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {PERKS.map((perk) => {
                    const on = partner.perks.includes(perk.id);
                    const color = TIERS[partner.tier].colors[0];
                    return (
                      <button
                        key={perk.id}
                        onClick={() => togglePerk(perk.id)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition",
                          on
                            ? "bg-white/[0.05]"
                            : "border-white/[0.06] bg-white/[0.015] opacity-60 hover:opacity-100",
                        )}
                        style={{ borderColor: on ? `${color}55` : undefined }}
                      >
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            color: on ? color : "#5A6480",
                            background: on ? `${color}18` : "rgba(255,255,255,.04)",
                          }}
                        >
                          <PerkIcon name={perk.icon} size={14} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[12.5px] text-white">
                          {perk.name}
                        </span>
                        <span
                          className={cn(
                            "h-4 w-7 shrink-0 rounded-full p-0.5 transition",
                            on ? "" : "bg-white/10",
                          )}
                          style={{ background: on ? color : undefined }}
                        >
                          <span
                            className={cn(
                              "block h-3 w-3 rounded-full bg-white transition-transform",
                              on ? "translate-x-3" : "translate-x-0",
                            )}
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* campaigns */}
              <Card className="p-5">
                <h3 className="mb-1 text-[15px] font-semibold text-white">
                  Закрытые акции
                </h3>
                <p className="mb-4 text-[12.5px] text-slate-400">
                  Добавьте партнёра в закрытую акцию — она появится у него в
                  Partner Lounge.
                </p>
                <div className="flex flex-wrap gap-2">
                  {CAMPAIGNS.map((c) => {
                    const on =
                      selected.overrides?.closedPromos?.includes(c.id) ?? false;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          toggleClosedPromo(selected.id, c.id);
                          toast.show(
                            on ? "Удалён из акции" : "Добавлен в акцию",
                            c.name,
                          );
                        }}
                        className={cn(
                          "rounded-xl border px-3.5 py-2 text-[12.5px] font-medium transition",
                          on
                            ? "border-gold-400/50 bg-gold-400/[0.12] text-gold-300"
                            : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-white",
                        )}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {!partner && (
          <Card className="p-8">
            <EmptyState
              icon={<UserCog size={22} />}
              title="Пользователь не является партнёром"
              description="Выдайте уровень выше, чтобы открыть настройки промокода, бонусов, привилегий и закрытых акций."
            />
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirmRevoke}
        onClose={() => setConfirmRevoke(false)}
        onConfirm={() => {
          revokePartner(selected.id);
          toast.success(
            "Партнёрский статус снят",
            `${selected.username} потерял доступ к программе`,
          );
        }}
        title="Снять партнёрский статус?"
        description={
          <>
            <strong className="text-white">{selected.username}</strong> потеряет
            бейдж, партнёрские кейсы, повышенные бонусы и доступ в Partner
            Lounge. Персональный промокод перестанет начислять бонус партнёру.
            Заработанные предметы и баланс останутся у пользователя.
          </>
        }
        confirmLabel="Снять статус"
        danger
      />
    </div>
  );
}
