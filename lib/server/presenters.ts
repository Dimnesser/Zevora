import "server-only";

import type { AuthUser } from "@/lib/server/auth";
import type { CaseRow, CaseItemDetail } from "@/lib/server/cases";
import type { InventoryRow } from "@/lib/server/inventory";
import type { OpeningRow } from "@/lib/server/openings";

/**
 * Row → API shape.
 *
 * Everything the client receives passes through here, which is what keeps
 * password hashes, salts and session rows from ever reaching a response.
 */

export interface PublicUser {
  id: number;
  username: string;
  role: "user" | "owner";
  balance_minor: number;
  avatar_seed: string;
  level: number;
  xp: number;
  created_at: number;
  partner: {
    tier: string;
    since: number | null;
    promo_code: string | null;
    ref_code: string | null;
    perks: string[];
    daily_minor: number | null;
    ref_multiplier: number | null;
    campaigns: string[];
  } | null;
  bonuses: {
    daily_claimed_at: number | null;
    daily_streak: number;
    registration_claimed: boolean;
  };
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function publicUser(row: AuthUser): PublicUser {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    balance_minor: row.balance_minor,
    avatar_seed: row.avatar_seed,
    level: row.level,
    xp: row.xp,
    created_at: row.created_at,
    partner: row.partner_tier
      ? {
          tier: row.partner_tier,
          since: row.partner_since,
          promo_code: row.promo_code,
          ref_code: row.ref_code,
          perks: parseJsonArray(row.partner_perks),
          daily_minor: row.partner_daily_minor,
          ref_multiplier: row.partner_ref_multiplier,
          campaigns: parseJsonArray(row.partner_campaigns),
        }
      : null,
    bonuses: {
      daily_claimed_at: row.daily_claimed_at,
      daily_streak: row.daily_streak,
      registration_claimed: row.registration_bonus_claimed === 1,
    },
  };
}

export interface PublicCase {
  id: number;
  slug: string;
  name: string;
  description: string;
  image_url: string | null;
  price_minor: number;
  is_active: boolean;
  is_demo: boolean;
  partner_only: boolean;
  tags: string[];
  art: { emblem: string; color_a: string; color_b: string };
  item_count?: number;
  best_price_minor?: number | null;
  top_skins?: { image_url: string; market_name: string }[];
}

export function publicCase(
  row: CaseRow & {
    item_count?: number;
    best_price_minor?: number | null;
    top_skins?: { image_url: string; market_name: string }[];
  },
): PublicCase {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    image_url: row.image_url,
    price_minor: row.price_minor,
    is_active: row.is_active === 1,
    is_demo: row.is_demo === 1,
    partner_only: row.partner_only === 1,
    tags: parseJsonArray(row.tags),
    art: {
      emblem: row.art_emblem,
      color_a: row.art_color_a,
      color_b: row.art_color_b,
    },
    item_count: row.item_count,
    best_price_minor: row.best_price_minor,
    top_skins: row.top_skins,
  };
}

export interface PublicCaseItem {
  id: number;
  skin_id: number;
  market_name: string;
  weapon: string;
  finish: string;
  price_minor: number;
  weight: number;
  chance: number;
  min_float: number;
  max_float: number;
  stattrak_enabled: boolean;
  image_url: string | null;
  rarity: { slug: string; name: string; color: string; effect: string };
  art: { kind: string; pattern: string; color_a: string; color_b: string };
}

export function publicCaseItem(row: CaseItemDetail): PublicCaseItem {
  return {
    id: row.id,
    skin_id: row.skin_id,
    market_name: row.market_name,
    weapon: row.weapon,
    finish: row.finish,
    price_minor: row.base_price_minor,
    weight: row.weight,
    chance: row.chance,
    min_float: row.min_float,
    max_float: row.max_float,
    stattrak_enabled: row.stattrak_enabled === 1,
    image_url: row.image_url,
    rarity: {
      slug: row.rarity_slug,
      name: row.rarity_name,
      color: row.rarity_color,
      effect: row.rarity_effect,
    },
    art: {
      kind: row.art_kind,
      pattern: row.art_pattern,
      color_a: row.art_color_a,
      color_b: row.art_color_b,
    },
  };
}

export interface PublicInventoryItem {
  id: number;
  skin_id: number;
  market_name: string;
  weapon: string;
  finish: string;
  price_minor: number;
  wear: string;
  float_value: number;
  stattrak: boolean;
  source: string;
  source_case: { name: string; slug: string } | null;
  status: string;
  acquired_at: number;
  image_url: string | null;
  rarity: { slug: string; name: string; color: string; effect: string };
  art: { kind: string; pattern: string; color_a: string; color_b: string };
}

export function publicInventoryItem(row: InventoryRow): PublicInventoryItem {
  return {
    id: row.id,
    skin_id: row.skin_id,
    market_name: row.market_name,
    weapon: row.weapon,
    finish: row.finish,
    price_minor: row.price_minor,
    wear: row.wear,
    float_value: row.float_value,
    stattrak: row.stattrak === 1,
    source: row.source,
    source_case:
      row.source_case_name && row.source_case_slug
        ? { name: row.source_case_name, slug: row.source_case_slug }
        : null,
    status: row.status,
    acquired_at: row.acquired_at,
    image_url: row.image_url,
    rarity: {
      slug: row.rarity_slug,
      name: row.rarity_name,
      color: row.rarity_color,
      effect: row.rarity_effect,
    },
    art: {
      kind: row.art_kind,
      pattern: row.art_pattern,
      color_a: row.art_color_a,
      color_b: row.art_color_b,
    },
  };
}

export interface PublicOpening {
  id: number;
  created_at: number;
  username: string;
  avatar_seed: string;
  case: { name: string; slug: string };
  market_name: string;
  weapon: string;
  finish: string;
  price_paid_minor: number;
  value_minor: number;
  image_url: string | null;
  rarity: { slug: string; name: string; color: string };
  art: { kind: string; pattern: string; color_a: string; color_b: string };
  audit: { roll: number; total_weight: number };
}

export function publicOpening(row: OpeningRow): PublicOpening {
  return {
    id: row.id,
    created_at: row.created_at,
    username: row.username,
    avatar_seed: row.avatar_seed,
    case: { name: row.case_name, slug: row.case_slug },
    market_name: row.market_name,
    weapon: row.weapon,
    finish: row.finish,
    price_paid_minor: row.price_paid_minor,
    value_minor: row.value_minor,
    image_url: row.image_url,
    rarity: {
      slug: row.rarity_slug,
      name: row.rarity_name,
      color: row.rarity_color,
    },
    art: {
      kind: row.art_kind,
      pattern: row.art_pattern,
      color_a: row.art_color_a,
      color_b: row.art_color_b,
    },
    audit: { roll: row.roll, total_weight: row.total_weight },
  };
}
