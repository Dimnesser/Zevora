"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Link2, Search, ShieldMinus, ShieldPlus, Ticket, UserCog } from "lucide-react";
import { ApiRequestError, api, type AdminUser } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { useSession } from "@/lib/client/session";
import { PERKS, TIERS, TIER_LIST } from "@/data/partners";
import { useCopy } from "@/hooks/useCopy";
import { Avatar } from "@/components/art/Avatar";
import { PartnerBadge } from "@/components/partners/PartnerBadge";
import { PerkIcon } from "@/components/partners/PerkIcon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate, formatMinor, formatPercent } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { cn } from "@/lib/utils";

/** Closed campaigns the owner can add a partner to. */
const CAMPAIGNS = [
  { id: "winter-drop", name: "Winter Drop" },
  { id: "creator-cup", name: "Creator Cup" },
  { id: "vault-beta", name: "Vault Beta" },
  { id: "x2-weekend", name: "×2 Weekend" },
];

type Tier = keyof typeof TIERS;

function parseList(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function PartnersAdmin() {
  const { refresh, user: me } = useSession();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [promoDraft, setPromoDraft] = useState("");
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const { copied, copy } = useCopy();

  const { data, loading, reload } = useResource(() => api.admin.users(query), [query]);
  const users = data?.users ?? [];
  const selected = users.find((u) => u.id === selectedId) ?? users[0] ?? null;

  const after = async () => {
    reload();
    // The owner may have changed their own status.
    await refresh();
  };

  const grant = async (tier: Tier) => {
    if (!selected) return;
    try {
      await api.admin.grantPartner(selected.id, tier);
      toast.success(
        selected.partner_tier ? "Уровень изменён" : "Партнёрский статус выдан",
        `${selected.username} → ${TIERS[tier].name}`,
      );
      await after();
    } catch (err) {
      toast.error(
        "Не удалось",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    }
  };

  const patch = async (body: Record<string, unknown>, message: string) => {
    if (!selected) return;
    try {
      await api.admin.updatePartner(selected.id, body);
      toast.success(message);
      await after();
    } catch (err) {
      toast.error(
        "Не удалось",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    }
  };

  if (loading && users.length === 0) {
    return <Skeleton className="h-[560px] rounded-lg" />;
  }

  const perks = parseList(selected?.partner_perks ?? null);
  const campaigns = parseList(selected?.partner_campaigns ?? null);
  const tier = selected?.partner_tier as Tier | null | undefined;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="flex max-h-[720px] flex-col p-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти пользователя"
          iconLeft={<Search size={15} />}
          className="mb-3"
          aria-label="Найти пользователя"
        />

        {users.length === 0 ? (
          <EmptyState title="Не найдено" className="py-10" />
        ) : (
          <ul className="no-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto">
            {users.map((row) => {
              const active = row.id === selected?.id;
              const rowTier = row.partner_tier as Tier | null;
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
                      seed={row.avatar_seed}
                      size={34}
                      ring={rowTier ? TIERS[rowTier].colors[0] : undefined}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium text-white">
                          {row.username}
                        </span>
                        {row.id === me?.id && (
                          <span className="rounded bg-white/10 px-1 text-[9px] font-bold uppercase text-slate-300">
                            вы
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {formatMinor(row.spent_minor)} оборот · {row.opens} откр.
                      </span>
                    </span>
                    {rowTier && <PartnerBadge tier={rowTier} size="xs" iconOnly />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-3 border-t border-white/[0.06] pt-3 text-[11.5px] text-slate-500">
          Партнёров: {users.filter((u) => u.partner_tier).length} из {users.length}
        </p>
      </Card>

      <div className="space-y-4">
        {!selected ? (
          <Card className="p-10">
            <EmptyState title="Выберите пользователя" />
          </Card>
        ) : (
          <>
            <Card strong className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <Avatar
                    seed={selected.avatar_seed}
                    size={52}
                    ring={tier ? TIERS[tier].colors[0] : undefined}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[19px] font-bold text-white">
                        {selected.username}
                      </h2>
                      {tier && <PartnerBadge tier={tier} size="sm" />}
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-slate-400">
                      Регистрация {formatDate(selected.created_at)} · оборот{" "}
                      {formatMinor(selected.spent_minor)} · баланс{" "}
                      {formatMinor(selected.balance_minor)}
                    </p>
                  </div>
                </div>

                {tier && (
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

            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <ShieldPlus size={16} className="text-zev-300" />
                <h3 className="text-[15px] font-semibold text-white">
                  {tier ? "Изменить уровень" : "Выдать партнёрский статус"}
                </h3>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {TIER_LIST.map((t) => {
                  const active = tier === t.id;
                  const [c1, c2] = t.colors;
                  return (
                    <button
                      key={t.id}
                      onClick={() => void grant(t.id as Tier)}
                      className={cn(
                        "relative overflow-hidden rounded-lg border p-4 text-left transition",
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
                      <span className="block text-[14px] font-bold" style={{ color: c1 }}>
                        {t.name}
                      </span>
                      <span className="mt-1 block text-[11.5px] leading-snug text-slate-500">
                        доля {formatPercent(t.share, 0)} · daily +{t.dailyReward} ₽
                      </span>
                      {active && (
                        <Check size={15} className="absolute right-3 top-3" style={{ color: c1 }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {!tier && (
                <p className="mt-3 text-[12px] text-slate-500">
                  Выберите уровень, чтобы выдать статус. Пользователь сразу получит
                  бейдж, ссылку, промокод и доступ к партнёрским кейсам.
                </p>
              )}
            </Card>

            <AnimatePresence>
              {tier && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <Card className="p-5">
                    <h3 className="mb-3.5 text-[15px] font-semibold text-white">
                      Промокод и ссылка
                    </h3>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Field
                        label="Персональный промокод"
                        hint="Код применяется на странице «Бонусы» и даёт 400 ₽."
                      >
                        <div className="flex gap-2">
                          <Input
                            value={promoDraft || selected.promo_code || ""}
                            onChange={(e) => setPromoDraft(e.target.value.toUpperCase())}
                            className="font-mono uppercase tracking-wider"
                            aria-label="Промокод партнёра"
                          />
                          <Button
                            onClick={() =>
                              void patch(
                                { promo_code: (promoDraft || selected.promo_code || "").trim() },
                                "Промокод сохранён",
                              ).then(() => setPromoDraft(""))
                            }
                          >
                            <Ticket size={15} />
                          </Button>
                        </div>
                      </Field>

                      <Field label="Партнёрская ссылка" hint="Создаётся из ника партнёра.">
                        <div className="flex gap-2">
                          <Input
                            value={`https://zevora.example/?ref=${selected.ref_code ?? selected.username}`}
                            readOnly
                            iconLeft={<Link2 size={14} />}
                            className="font-mono text-[12px]"
                            aria-label="Партнёрская ссылка"
                          />
                          <Button
                            variant="secondary"
                            onClick={async () => {
                              const link = `https://zevora.example/?ref=${selected.ref_code ?? selected.username}`;
                              if (await copy(link)) toast.success("Ссылка скопирована");
                            }}
                          >
                            {copied ? <Check size={15} /> : <Copy size={15} />}
                          </Button>
                        </div>
                      </Field>
                    </div>
                  </Card>

                  <Card className="p-5">
                    <h3 className="mb-1 text-[15px] font-semibold text-white">Бонусы</h3>
                    <p className="mb-4 text-[12.5px] text-slate-400">
                      Переопределяют значения уровня {TIERS[tier].name}.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Ежедневная награда">
                        <Input
                          type="number"
                          min={0}
                          defaultValue={
                            (selected.partner_daily_minor ?? TIERS[tier].dailyReward * 100) / 100
                          }
                          onBlur={(e) => {
                            const v = Math.round(Number(e.target.value) * 100);
                            if (Number.isFinite(v) && v >= 0) {
                              void patch({ daily_minor: v }, "Ежедневная награда обновлена");
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
                          min={0.5}
                          defaultValue={
                            selected.partner_ref_multiplier ?? TIERS[tier].refMultiplier
                          }
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (Number.isFinite(v) && v > 0) {
                              void patch({ ref_multiplier: v }, "Множитель обновлён");
                            }
                          }}
                          suffix="×"
                          aria-label="Множитель за рефералов"
                        />
                      </Field>
                    </div>
                  </Card>

                  <Card className="p-5">
                    <h3 className="mb-1 text-[15px] font-semibold text-white">Преимущества</h3>
                    <p className="mb-4 text-[12.5px] text-slate-400">
                      Включайте и отключайте привилегии индивидуально.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {PERKS.map((perk) => {
                        const on = perks.includes(perk.id);
                        const color = TIERS[tier].colors[0];
                        return (
                          <button
                            key={perk.id}
                            onClick={() =>
                              void patch(
                                {
                                  perks: on
                                    ? perks.filter((p) => p !== perk.id)
                                    : [...perks, perk.id],
                                },
                                on ? "Привилегия отключена" : "Привилегия включена",
                              )
                            }
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
                                !on && "bg-white/10",
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

                  <Card className="p-5">
                    <h3 className="mb-1 text-[15px] font-semibold text-white">Закрытые акции</h3>
                    <p className="mb-4 text-[12.5px] text-slate-400">
                      Добавьте партнёра в закрытую акцию.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {CAMPAIGNS.map((c) => {
                        const on = campaigns.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            onClick={() =>
                              void patch(
                                {
                                  campaigns: on
                                    ? campaigns.filter((x) => x !== c.id)
                                    : [...campaigns, c.id],
                                },
                                on ? "Удалён из акции" : "Добавлен в акцию",
                              )
                            }
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

            {!tier && (
              <Card className="p-8">
                <EmptyState
                  icon={<UserCog size={22} />}
                  title="Пользователь не является партнёром"
                  description="Выдайте уровень выше, чтобы открыть настройки промокода, бонусов, привилегий и закрытых акций."
                />
              </Card>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmRevoke}
        onClose={() => setConfirmRevoke(false)}
        onConfirm={() =>
          void (async () => {
            if (!selected) return;
            try {
              await api.admin.revokePartner(selected.id);
              toast.success("Партнёрский статус снят", selected.username);
              await after();
            } catch (err) {
              toast.error(
                "Не удалось снять статус",
                err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
              );
            }
          })()
        }
        title="Снять партнёрский статус?"
        description={
          <>
            <strong className="text-white">{selected?.username}</strong> потеряет бейдж,
            партнёрские кейсы, повышенные бонусы и доступ в Partner Lounge. Персональный
            промокод перестанет действовать. Заработанные предметы и баланс останутся.
          </>
        }
        confirmLabel="Снять статус"
        danger
      />
    </div>
  );
}
