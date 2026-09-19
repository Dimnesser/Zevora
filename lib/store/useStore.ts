"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  CaseDefinition,
  InventoryItem,
  LiveDrop,
  PartnerProfile,
  PartnerTier,
  Transaction,
  TxKind,
  User,
} from "@/types";
import { getSkin } from "@/data/skins";
import { createItem, rollCase } from "@/lib/roll";
import { uid } from "@/lib/utils";
import { createPartnerProfile, promoFor } from "@/lib/partner";
import { buildLiveDrops, SEEDED_PARTNERS } from "@/data/community";
import { TIERS } from "@/data/partners";

const DAY = 86_400_000;
const TX_LIMIT = 200;

/** Typed transaction factory — keeps `kind` narrowed to TxKind. */
function tx(
  kind: TxKind,
  label: string,
  amount: number,
  meta?: Transaction["meta"],
): Transaction {
  return { id: uid("tx"), kind, label, amount, at: Date.now(), meta };
}

function pushTx(list: Transaction[], entry: Transaction): Transaction[] {
  return [entry, ...list].slice(0, TX_LIMIT);
}

function skinLabel(skinId: string): string {
  const s = getSkin(skinId);
  return `${s.weapon} | ${s.name}`;
}

/** A user record the owner can manage from the admin panel. */
export interface ManagedUser {
  id: string;
  username: string;
  avatarSeed: string;
  joinedAt: number;
  spent: number;
  partner: PartnerProfile | null;
  /** Manual overrides the owner sets on top of the tier defaults. */
  overrides?: {
    dailyReward?: number;
    refMultiplier?: number;
    closedPromos?: string[];
  };
}

export interface PromoCode {
  code: string;
  /** Flat bonus in ₽. */
  amount: number;
  /** Partner codes credit their author. */
  partner?: string;
  active: boolean;
}

interface ZevoraState {
  user: User;
  inventory: InventoryItem[];
  transactions: Transaction[];
  liveDrops: LiveDrop[];
  managedUsers: ManagedUser[];
  promoCodes: PromoCode[];

  // ── balance ──
  deposit: (amount: number, method: string) => void;
  addBalance: (amount: number, kind: TxKind, label: string) => void;

  // ── cases ──
  /** Debits the case price. Returns false when the balance is short. */
  chargeCase: (def: CaseDefinition) => boolean;
  /** Rolls a skin id without mutating state (used by the roulette). */
  previewRoll: (def: CaseDefinition) => string;
  /** Commits an opened item into the inventory. */
  commitDrop: (skinId: string, def: CaseDefinition) => InventoryItem;

  // ── inventory ──
  sellItem: (itemUid: string) => number;
  sellMany: (uids: string[]) => number;
  withdrawItem: (itemUid: string) => void;
  addItem: (item: InventoryItem) => void;

  // ── upgrade ──
  applyUpgrade: (
    stakeUids: string[],
    targetSkinId: string,
    success: boolean,
  ) => InventoryItem | null;

  // ── bonuses ──
  claimDaily: () => { ok: boolean; amount: number; streak: number };
  claimRegistration: () => { ok: boolean; amount: number };
  redeemPromo: (code: string) => { ok: boolean; message: string; amount: number };

  // ── live feed ──
  pushLiveDrop: (drop: LiveDrop) => void;

  // ── admin (owner only) ──
  grantPartner: (userId: string, tier: PartnerTier) => void;
  revokePartner: (userId: string) => void;
  setPartnerTier: (userId: string, tier: PartnerTier) => void;
  setPartnerPerks: (userId: string, perks: string[]) => void;
  setPartnerPromo: (userId: string, promo: string) => void;
  setPartnerBonus: (
    userId: string,
    patch: { dailyReward?: number; refMultiplier?: number },
  ) => void;
  toggleClosedPromo: (userId: string, campaign: string) => void;

  // ── session ──
  resetAccount: () => void;
  setUsername: (name: string) => void;
}

const STARTER_ITEMS = ["m4-gridlock", "usp-coldsteel", "ak-ashline"];

function buildInitialUser(): User {
  const now = Date.now();
  return {
    id: "u_self",
    username: "dimnesser",
    avatarSeed: "dimnesser",
    balance: 15000,
    level: 7,
    xp: 3240,
    createdAt: now - 12 * DAY,
    // The demo account owns the platform, so /admin is reachable.
    role: "owner",
    // Partner status is granted by the owner — never bought or auto-earned.
    partner: null,
    stats: {
      casesOpened: 0,
      upgrades: 0,
      upgradesWon: 0,
      bestDropValue: 0,
      totalSpent: 0,
      totalWon: 0,
    },
    bonuses: {
      lastDailyClaim: null,
      streak: 0,
      usedPromos: [],
      registrationClaimed: false,
    },
  };
}

function buildStarterInventory(): InventoryItem[] {
  return STARTER_ITEMS.map((id, i) => {
    const item = createItem(id, "starter");
    item.uid = `itm_starter_${i}`;
    item.acquiredAt = Date.now() - (i + 1) * 3_600_000;
    return item;
  });
}

const MANAGED_SEED: { username: string; spent: number; days: number }[] = [
  { username: "vortexkiller", spent: 1_840_000, days: 210 },
  { username: "nebula_ok", spent: 940_000, days: 160 },
  { username: "hexbyte", spent: 612_000, days: 120 },
  { username: "kr1stal", spent: 388_000, days: 96 },
  { username: "m1rage", spent: 275_000, days: 88 },
  { username: "shadowfox", spent: 191_000, days: 74 },
  { username: "aimlock", spent: 140_500, days: 61 },
  { username: "cyberdrift", spent: 98_400, days: 50 },
  { username: "zerolag", spent: 74_200, days: 43 },
  { username: "prizrak", spent: 51_900, days: 37 },
  { username: "tundra", spent: 33_600, days: 25 },
  { username: "glitchy", spent: 18_300, days: 14 },
];

function buildManagedUsers(): ManagedUser[] {
  const now = Date.now();
  return MANAGED_SEED.map((s, i) => ({
    id: `mu_${i}`,
    username: s.username,
    avatarSeed: s.username,
    joinedAt: now - s.days * DAY,
    spent: s.spent,
    // Tiers come from the shared seed so the admin roster, the profile
    // badges and the leaderboard never disagree.
    partner: SEEDED_PARTNERS[s.username]
      ? createPartnerProfile(
          s.username,
          SEEDED_PARTNERS[s.username],
          now - (s.days - 20) * DAY,
        )
      : null,
  }));
}

const BASE_PROMOS: PromoCode[] = [
  { code: "ZEVORA", amount: 500, active: true },
  { code: "START300", amount: 300, active: true },
  { code: "NEON1000", amount: 1000, active: true },
];

function buildPromoCodes(): PromoCode[] {
  const partnerCodes: PromoCode[] = MANAGED_SEED.filter(
    (s) => SEEDED_PARTNERS[s.username],
  ).map((s) => ({
    code: promoFor(s.username),
    amount: 400,
    partner: s.username,
    active: true,
  }));
  return [...BASE_PROMOS, ...partnerCodes];
}

function upsertPromo(
  codes: PromoCode[],
  code: string,
  partner: string,
): PromoCode[] {
  if (codes.some((c) => c.code === code)) {
    return codes.map((c) =>
      c.code === code ? { ...c, partner, active: true } : c,
    );
  }
  return [...codes, { code, amount: 400, partner, active: true }];
}

const DAILY_BASE = 150;

export const useStore = create<ZevoraState>()(
  persist(
    (set, get) => ({
      user: buildInitialUser(),
      inventory: buildStarterInventory(),
      transactions: [],
      liveDrops: buildLiveDrops(),
      managedUsers: buildManagedUsers(),
      promoCodes: buildPromoCodes(),

      addBalance: (amount, kind, label) =>
        set((s) => ({
          user: { ...s.user, balance: Math.max(0, s.user.balance + amount) },
          transactions: pushTx(s.transactions, tx(kind, label, amount)),
        })),

      deposit: (amount, method) =>
        set((s) => ({
          user: { ...s.user, balance: s.user.balance + amount },
          transactions: pushTx(
            s.transactions,
            tx("deposit", `Пополнение — ${method}`, amount),
          ),
        })),

      chargeCase: (def) => {
        const { user } = get();
        const price = def.partnerOnly ? 0 : def.price;
        if (user.balance < price) return false;
        set((s) => ({
          user: {
            ...s.user,
            balance: s.user.balance - price,
            stats: {
              ...s.user.stats,
              totalSpent: s.user.stats.totalSpent + price,
            },
          },
        }));
        return true;
      },

      previewRoll: (def) => rollCase(def),

      commitDrop: (skinId, def) => {
        const item = createItem(skinId, "case");
        set((s) => ({
          inventory: [item, ...s.inventory],
          user: {
            ...s.user,
            xp: s.user.xp + 40,
            stats: {
              ...s.user.stats,
              casesOpened: s.user.stats.casesOpened + 1,
              totalWon: s.user.stats.totalWon + item.price,
              bestDropValue: Math.max(s.user.stats.bestDropValue, item.price),
            },
          },
          transactions: pushTx(
            s.transactions,
            tx(
              "case",
              `${def.name} → ${skinLabel(skinId)}`,
              -(def.partnerOnly ? 0 : def.price),
              { skinId, value: item.price },
            ),
          ),
        }));
        return item;
      },

      addItem: (item) => set((s) => ({ inventory: [item, ...s.inventory] })),

      sellItem: (itemUid) => {
        const item = get().inventory.find((i) => i.uid === itemUid);
        if (!item || item.status !== "owned") return 0;
        set((s) => ({
          inventory: s.inventory.filter((i) => i.uid !== itemUid),
          user: { ...s.user, balance: s.user.balance + item.price },
          transactions: pushTx(
            s.transactions,
            tx("sell", `Продажа — ${skinLabel(item.skinId)}`, item.price),
          ),
        }));
        return item.price;
      },

      sellMany: (uids) => {
        const selected = new Set(uids);
        const items = get().inventory.filter(
          (i) => selected.has(i.uid) && i.status === "owned",
        );
        if (!items.length) return 0;
        const total = items.reduce((sum, i) => sum + i.price, 0);
        set((s) => ({
          inventory: s.inventory.filter((i) => !selected.has(i.uid)),
          user: { ...s.user, balance: s.user.balance + total },
          transactions: pushTx(
            s.transactions,
            tx("sell", `Продажа ${items.length} предм.`, total),
          ),
        }));
        return total;
      },

      withdrawItem: (itemUid) =>
        set((s) => {
          const item = s.inventory.find((i) => i.uid === itemUid);
          if (!item || item.status !== "owned") return s;
          return {
            inventory: s.inventory.map((i) =>
              i.uid === itemUid ? { ...i, status: "withdrawing" as const } : i,
            ),
            transactions: pushTx(
              s.transactions,
              tx("withdraw", `Вывод — ${skinLabel(item.skinId)}`, 0, {
                value: item.price,
              }),
            ),
          };
        }),

      applyUpgrade: (stakeUids, targetSkinId, success) => {
        const staked = new Set(stakeUids);
        const items = get().inventory.filter((i) => staked.has(i.uid));
        const stakeValue = items.reduce((sum, i) => sum + i.price, 0);
        const won = success ? createItem(targetSkinId, "upgrade") : null;

        set((s) => ({
          inventory: won
            ? [won, ...s.inventory.filter((i) => !staked.has(i.uid))]
            : s.inventory.filter((i) => !staked.has(i.uid)),
          user: {
            ...s.user,
            xp: s.user.xp + 60,
            stats: {
              ...s.user.stats,
              upgrades: s.user.stats.upgrades + 1,
              upgradesWon: s.user.stats.upgradesWon + (success ? 1 : 0),
              totalWon: s.user.stats.totalWon + (won?.price ?? 0),
              bestDropValue: Math.max(
                s.user.stats.bestDropValue,
                won?.price ?? 0,
              ),
            },
          },
          transactions: pushTx(
            s.transactions,
            success
              ? tx(
                  "upgrade-win",
                  `Апгрейд удался — ${skinLabel(targetSkinId)}`,
                  (won?.price ?? 0) - stakeValue,
                )
              : tx(
                  "upgrade-loss",
                  `Апгрейд не удался — ${items.length} предм.`,
                  -stakeValue,
                ),
          ),
        }));

        return won;
      },

      claimDaily: () => {
        const { user } = get();
        const now = Date.now();
        const last = user.bonuses.lastDailyClaim;
        if (last && now - last < DAY) {
          return { ok: false, amount: 0, streak: user.bonuses.streak };
        }
        const continues = last !== null && now - last < 2 * DAY;
        const streak = continues ? user.bonuses.streak + 1 : 1;
        const tier = user.partner?.tier;
        const partnerBonus = tier ? TIERS[tier].dailyReward : 0;
        const amount = DAILY_BASE * Math.min(streak, 7) + partnerBonus;

        set((s) => ({
          user: {
            ...s.user,
            balance: s.user.balance + amount,
            bonuses: { ...s.user.bonuses, lastDailyClaim: now, streak },
          },
          transactions: pushTx(
            s.transactions,
            tx("bonus", `Ежедневный бонус — день ${streak}`, amount),
          ),
        }));
        return { ok: true, amount, streak };
      },

      claimRegistration: () => {
        const { user } = get();
        if (user.bonuses.registrationClaimed) return { ok: false, amount: 0 };
        const amount = 500;
        set((s) => ({
          user: {
            ...s.user,
            balance: s.user.balance + amount,
            bonuses: { ...s.user.bonuses, registrationClaimed: true },
          },
          transactions: pushTx(
            s.transactions,
            tx("bonus", "Бонус за регистрацию", amount),
          ),
        }));
        return { ok: true, amount };
      },

      redeemPromo: (raw) => {
        const code = raw.trim().toUpperCase();
        if (!code) return { ok: false, message: "Введите промокод", amount: 0 };
        const { user, promoCodes } = get();
        if (user.bonuses.usedPromos.includes(code)) {
          return { ok: false, message: "Промокод уже использован", amount: 0 };
        }
        const promo = promoCodes.find((p) => p.code === code && p.active);
        if (!promo) {
          return { ok: false, message: "Промокод не найден", amount: 0 };
        }
        set((s) => ({
          user: {
            ...s.user,
            balance: s.user.balance + promo.amount,
            bonuses: {
              ...s.user.bonuses,
              usedPromos: [...s.user.bonuses.usedPromos, code],
            },
          },
          transactions: pushTx(
            s.transactions,
            tx(
              "promo",
              `Промокод ${code}${promo.partner ? ` (партнёр ${promo.partner})` : ""}`,
              promo.amount,
            ),
          ),
        }));
        return {
          ok: true,
          message: `Начислено ${promo.amount} ₽`,
          amount: promo.amount,
        };
      },

      pushLiveDrop: (drop) =>
        set((s) => ({ liveDrops: [drop, ...s.liveDrops].slice(0, 30) })),

      // ───────────────── admin ─────────────────
      grantPartner: (userId, tier) =>
        set((s) => {
          if (userId === s.user.id) {
            const profile = createPartnerProfile(
              s.user.username,
              tier,
              Date.now(),
            );
            return {
              user: { ...s.user, partner: profile },
              promoCodes: upsertPromo(
                s.promoCodes,
                profile.promo,
                s.user.username,
              ),
            };
          }
          const managedUsers = s.managedUsers.map((m) =>
            m.id === userId
              ? {
                  ...m,
                  partner: createPartnerProfile(m.username, tier, Date.now()),
                }
              : m,
          );
          const target = managedUsers.find((m) => m.id === userId);
          return {
            managedUsers,
            promoCodes: target?.partner
              ? upsertPromo(s.promoCodes, target.partner.promo, target.username)
              : s.promoCodes,
          };
        }),

      revokePartner: (userId) =>
        set((s) =>
          userId === s.user.id
            ? { user: { ...s.user, partner: null } }
            : {
                managedUsers: s.managedUsers.map((m) =>
                  m.id === userId ? { ...m, partner: null } : m,
                ),
              },
        ),

      setPartnerTier: (userId, tier) =>
        set((s) => {
          const retier = (
            p: PartnerProfile | null,
            username: string,
          ): PartnerProfile | null =>
            p
              ? {
                  ...createPartnerProfile(username, tier, p.since),
                  // Keep the owner's manual promo and perk edits.
                  promo: p.promo,
                }
              : p;

          if (userId === s.user.id) {
            return {
              user: {
                ...s.user,
                partner: retier(s.user.partner ?? null, s.user.username),
              },
            };
          }
          return {
            managedUsers: s.managedUsers.map((m) =>
              m.id === userId
                ? { ...m, partner: retier(m.partner, m.username) }
                : m,
            ),
          };
        }),

      setPartnerPerks: (userId, perks) =>
        set((s) => {
          if (userId === s.user.id && s.user.partner) {
            return {
              user: { ...s.user, partner: { ...s.user.partner, perks } },
            };
          }
          return {
            managedUsers: s.managedUsers.map((m) =>
              m.id === userId && m.partner
                ? { ...m, partner: { ...m.partner, perks } }
                : m,
            ),
          };
        }),

      setPartnerPromo: (userId, promo) =>
        set((s) => {
          const code = promo.trim().toUpperCase();
          if (!code) return s;
          if (userId === s.user.id && s.user.partner) {
            return {
              user: {
                ...s.user,
                partner: { ...s.user.partner, promo: code },
              },
              promoCodes: upsertPromo(s.promoCodes, code, s.user.username),
            };
          }
          const target = s.managedUsers.find((m) => m.id === userId);
          return {
            managedUsers: s.managedUsers.map((m) =>
              m.id === userId && m.partner
                ? { ...m, partner: { ...m.partner, promo: code } }
                : m,
            ),
            promoCodes: target
              ? upsertPromo(s.promoCodes, code, target.username)
              : s.promoCodes,
          };
        }),

      setPartnerBonus: (userId, patch) =>
        set((s) => ({
          managedUsers: s.managedUsers.map((m) =>
            m.id === userId ? { ...m, overrides: { ...m.overrides, ...patch } } : m,
          ),
        })),

      toggleClosedPromo: (userId, campaign) =>
        set((s) => ({
          managedUsers: s.managedUsers.map((m) => {
            if (m.id !== userId) return m;
            const current = m.overrides?.closedPromos ?? [];
            const next = current.includes(campaign)
              ? current.filter((c) => c !== campaign)
              : [...current, campaign];
            return { ...m, overrides: { ...m.overrides, closedPromos: next } };
          }),
        })),

      resetAccount: () =>
        set({
          user: buildInitialUser(),
          inventory: buildStarterInventory(),
          transactions: [],
          managedUsers: buildManagedUsers(),
          promoCodes: buildPromoCodes(),
        }),

      setUsername: (name) =>
        set((s) => ({ user: { ...s.user, username: name.slice(0, 20) } })),
    }),
    {
      name: "zevora.state.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        user: s.user,
        inventory: s.inventory,
        transactions: s.transactions,
        managedUsers: s.managedUsers,
        promoCodes: s.promoCodes,
      }),
    },
  ),
);
