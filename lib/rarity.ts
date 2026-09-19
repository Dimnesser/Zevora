import type { Rarity } from "@/types";

export const RARITY_ORDER: Rarity[] = [
  "common",
  "rare",
  "epic",
  "legendary",
  "mythic",
];

interface RarityMeta {
  label: string;
  short: string;
  color: string;
  /** Soft glow colour (rgba). */
  glow: string;
  /** Tailwind-ready gradient stops for card backgrounds. */
  gradient: string;
}

export const RARITY: Record<Rarity, RarityMeta> = {
  common: {
    label: "Обычный",
    short: "COMMON",
    color: "#7C8AA6",
    glow: "rgba(124,138,166,0.35)",
    gradient: "linear-gradient(180deg, rgba(124,138,166,0.18), transparent 70%)",
  },
  rare: {
    label: "Редкий",
    short: "RARE",
    color: "#3E82F7",
    glow: "rgba(62,130,247,0.45)",
    gradient: "linear-gradient(180deg, rgba(62,130,247,0.22), transparent 70%)",
  },
  epic: {
    label: "Эпический",
    short: "EPIC",
    color: "#A855F7",
    glow: "rgba(168,85,247,0.5)",
    gradient: "linear-gradient(180deg, rgba(168,85,247,0.24), transparent 70%)",
  },
  legendary: {
    label: "Легендарный",
    short: "LEGENDARY",
    color: "#F5B841",
    glow: "rgba(245,184,65,0.55)",
    gradient: "linear-gradient(180deg, rgba(245,184,65,0.26), transparent 70%)",
  },
  mythic: {
    label: "Мифический",
    short: "MYTHIC",
    color: "#FF3B6B",
    glow: "rgba(255,59,107,0.55)",
    gradient: "linear-gradient(180deg, rgba(255,59,107,0.28), transparent 70%)",
  },
};

export function rarityColor(r: Rarity) {
  return RARITY[r].color;
}

export function rarityRank(r: Rarity) {
  return RARITY_ORDER.indexOf(r);
}
