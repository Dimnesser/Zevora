/** Core domain model for Zevora. Shared by mock services and, later, the API. */

export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";

/** CS2 weapon families — drives the generated artwork. */
export type WeaponKind =
  | "rifle-ak"
  | "rifle-m4"
  | "sniper"
  | "smg"
  | "shotgun"
  | "pistol"
  | "pistol-heavy"
  | "knife-karambit"
  | "knife-bayonet"
  | "knife-butterfly"
  | "gloves"
  | "sticker"
  | "agent";

export type Wear =
  | "Factory New"
  | "Minimal Wear"
  | "Field-Tested"
  | "Well-Worn"
  | "Battle-Scarred";

/** A skin definition (catalogue entry, not an owned instance). */
export interface Skin {
  id: string;
  weapon: string;
  /** Skin (finish) name, e.g. "Neon Rider". */
  name: string;
  kind: WeaponKind;
  rarity: Rarity;
  price: number;
  /** StatTrak™ analogue — Zevora calls it "Counter". */
  counter?: boolean;
  souvenir?: boolean;
  /** Two colours that drive the procedural finish. */
  palette: [string, string];
  /** Finish pattern used by the artwork renderer. */
  pattern: FinishPattern;
}

export type FinishPattern =
  | "hydro"
  | "fade"
  | "stripe"
  | "camo"
  | "circuit"
  | "marble"
  | "doppler"
  | "carbon"
  | "splatter"
  | "solid";

/** An owned instance of a skin. */
export interface InventoryItem {
  /** Instance id — unique per drop. */
  uid: string;
  skinId: string;
  wear: Wear;
  /** Float value 0..1, cosmetic. */
  float: number;
  price: number;
  counter: boolean;
  acquiredAt: number;
  source: "case" | "upgrade" | "bonus" | "trade" | "starter";
  /** Set once the item has been sent to withdrawal. */
  status: "owned" | "withdrawing" | "withdrawn" | "sold";
}

export interface CaseDrop {
  skinId: string;
  /** Relative weight; normalised at runtime. */
  weight: number;
}

export type CaseTag = "popular" | "new" | "cheap" | "premium" | "rare" | "partner";

export interface CaseDefinition {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  price: number;
  tags: CaseTag[];
  /** Two colours for the case artwork. */
  palette: [string, string];
  /** Emblem shape used by the case artwork renderer. */
  emblem: "skull" | "bolt" | "orbit" | "crown" | "prism" | "flame" | "eye" | "hex";
  drops: CaseDrop[];
  /** Partner-only cases are hidden from regular users. */
  partnerOnly?: boolean;
}

export interface UpgradeResult {
  success: boolean;
  chance: number;
  multiplier: number;
  targetSkinId: string;
  roll: number;
}

export type TxKind =
  | "deposit"
  | "withdraw"
  | "case"
  | "sell"
  | "upgrade-win"
  | "upgrade-loss"
  | "bonus"
  | "promo"
  | "referral";

export interface Transaction {
  id: string;
  kind: TxKind;
  label: string;
  amount: number;
  at: number;
  meta?: Record<string, string | number>;
}

export type PartnerTier = "partner" | "creator" | "elite" | "ambassador";

export interface PartnerProfile {
  tier: PartnerTier;
  since: number;
  promo: string;
  refCode: string;
  /** Perk ids explicitly granted by the owner. */
  perks: string[];
  stats: PartnerStats;
  /** 14-day series used by the partner chart. */
  series: { day: string; clicks: number; signups: number; revenue: number }[];
}

export interface PartnerStats {
  clicks: number;
  signups: number;
  active: number;
  revenue: number;
  bonusPool: number;
}

export interface User {
  id: string;
  username: string;
  avatarSeed: string;
  balance: number;
  level: number;
  xp: number;
  createdAt: number;
  role: "user" | "owner";
  partner?: PartnerProfile | null;
  stats: {
    casesOpened: number;
    upgrades: number;
    upgradesWon: number;
    bestDropValue: number;
    totalSpent: number;
    totalWon: number;
  };
  bonuses: {
    lastDailyClaim: number | null;
    streak: number;
    usedPromos: string[];
    registrationClaimed: boolean;
  };
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatarSeed: string;
  spent: number;
  won: number;
  upgrades: number;
  partnerTier?: PartnerTier | null;
}

export interface LiveDrop {
  id: string;
  username: string;
  avatarSeed: string;
  skinId: string;
  caseSlug: string;
  at: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  goal: number;
  /** Which user stat the progress is read from. */
  metric:
    | "casesOpened"
    | "upgrades"
    | "upgradesWon"
    | "bestDropValue"
    | "totalWon"
    | "streak";
}
