/**
 * Seed catalogue.
 *
 * Skin names are the real CS2 market names, so `npm run skins:images`
 * can match them against the public CS2 API and fill in real Steam CDN
 * artwork. Prices are in ₽ minor units (копейки).
 *
 * `art` describes the procedural SVG fallback shown until an image row
 * exists, so the site is never blank offline.
 */

export interface SeedRarity {
  slug: string;
  name: string;
  color: string;
  default_weight: number;
  effect: "none" | "glow" | "shine" | "pulse" | "aurora";
  sort_order: number;
}

export const RARITIES: SeedRarity[] = [
  { slug: "consumer", name: "Consumer Grade", color: "#b0c3d9", default_weight: 25000, effect: "none", sort_order: 1 },
  { slug: "industrial", name: "Industrial Grade", color: "#5e98d9", default_weight: 12000, effect: "none", sort_order: 2 },
  { slug: "milspec", name: "Mil-Spec Grade", color: "#4b69ff", default_weight: 6000, effect: "glow", sort_order: 3 },
  { slug: "restricted", name: "Restricted", color: "#8847ff", default_weight: 2000, effect: "glow", sort_order: 4 },
  { slug: "classified", name: "Classified", color: "#d32ce6", default_weight: 600, effect: "shine", sort_order: 5 },
  { slug: "covert", name: "Covert", color: "#eb4b4b", default_weight: 200, effect: "pulse", sort_order: 6 },
  { slug: "extraordinary", name: "Extraordinary", color: "#caab05", default_weight: 40, effect: "aurora", sort_order: 7 },
  { slug: "contraband", name: "Contraband", color: "#e4ae39", default_weight: 10, effect: "aurora", sort_order: 8 },
];

export interface SeedSkin {
  slug: string;
  market_name: string;
  weapon: string;
  finish: string;
  rarity: string;
  /** Price in ₽ (major units); converted to minor at seed time. */
  price: number;
  stattrak: boolean;
  art: { kind: string; pattern: string; a: string; b: string };
}

export const SKINS: SeedSkin[] = [
  // ───────────── Rare Special Item ─────────────
  { slug: "sport-gloves-pandoras-box", market_name: "★ Sport Gloves | Pandora's Box", weapon: "★ Sport Gloves", finish: "Pandora's Box", rarity: "covert", price: 214900, stattrak: false, art: { kind: "gloves", pattern: "marble", a: "#C0509A", b: "#3A1430" } },
  { slug: "butterfly-knife-fade", market_name: "★ Butterfly Knife | Fade", weapon: "★ Butterfly Knife", finish: "Fade", rarity: "covert", price: 181500, stattrak: true, art: { kind: "knife-butterfly", pattern: "fade", a: "#FF8A3D", b: "#B44AC0" } },
  { slug: "karambit-doppler", market_name: "★ Karambit | Doppler", weapon: "★ Karambit", finish: "Doppler", rarity: "covert", price: 96400, stattrak: true, art: { kind: "knife-karambit", pattern: "doppler", a: "#7C5CFF", b: "#1B2A6B" } },
  { slug: "specialist-gloves-fade", market_name: "★ Specialist Gloves | Fade", weapon: "★ Specialist Gloves", finish: "Fade", rarity: "covert", price: 92300, stattrak: false, art: { kind: "gloves", pattern: "fade", a: "#FF7A18", b: "#C23BD6" } },
  { slug: "m9-bayonet-marble-fade", market_name: "★ M9 Bayonet | Marble Fade", weapon: "★ M9 Bayonet", finish: "Marble Fade", rarity: "covert", price: 86700, stattrak: true, art: { kind: "knife-bayonet", pattern: "marble", a: "#FF4D5E", b: "#2B6BD6" } },
  { slug: "talon-knife-slaughter", market_name: "★ Talon Knife | Slaughter", weapon: "★ Talon Knife", finish: "Slaughter", rarity: "covert", price: 71200, stattrak: true, art: { kind: "knife-karambit", pattern: "splatter", a: "#D6304A", b: "#2A0A10" } },
  { slug: "bayonet-tiger-tooth", market_name: "★ Bayonet | Tiger Tooth", weapon: "★ Bayonet", finish: "Tiger Tooth", rarity: "covert", price: 55800, stattrak: true, art: { kind: "knife-bayonet", pattern: "stripe", a: "#F5B841", b: "#1A1405" } },

  // ───────────── added for the reference set ─────────────
  { slug: "m4a4-howl", market_name: "M4A4 | Howl", weapon: "M4A4", finish: "Howl", rarity: "contraband", price: 412000, stattrak: true, art: { kind: "rifle-m4", pattern: "splatter", a: "#E03B2A", b: "#1A1010" } },
  { slug: "awp-dragon-lore", market_name: "AWP | Dragon Lore", weapon: "AWP", finish: "Dragon Lore", rarity: "covert", price: 1180000, stattrak: false, art: { kind: "sniper", pattern: "marble", a: "#C4A03B", b: "#2A2410" } },
  { slug: "ak-47-the-empress", market_name: "AK-47 | The Empress", weapon: "AK-47", finish: "The Empress", rarity: "covert", price: 6800, stattrak: true, art: { kind: "rifle-ak", pattern: "marble", a: "#C43B6B", b: "#2A1140" } },
  { slug: "m4a1s-player-two", market_name: "M4A1-S | Player Two", weapon: "M4A1-S", finish: "Player Two", rarity: "covert", price: 5200, stattrak: true, art: { kind: "rifle-m4", pattern: "stripe", a: "#E86BA8", b: "#2A1A3A" } },
  { slug: "m4a4-neo-noir", market_name: "M4A4 | Neo-Noir", weapon: "M4A4", finish: "Neo-Noir", rarity: "covert", price: 4300, stattrak: true, art: { kind: "rifle-m4", pattern: "marble", a: "#C23BD6", b: "#14102A" } },
  { slug: "awp-lightning-strike", market_name: "AWP | Lightning Strike", weapon: "AWP", finish: "Lightning Strike", rarity: "covert", price: 8900, stattrak: false, art: { kind: "sniper", pattern: "stripe", a: "#3BC4E0", b: "#101A28" } },
  { slug: "glock-18-fade", market_name: "Glock-18 | Fade", weapon: "Glock-18", finish: "Fade", rarity: "restricted", price: 9400, stattrak: false, art: { kind: "pistol", pattern: "fade", a: "#FF7A18", b: "#C23BD6" } },
  { slug: "desert-eagle-blaze", market_name: "Desert Eagle | Blaze", weapon: "Desert Eagle", finish: "Blaze", rarity: "restricted", price: 43000, stattrak: false, art: { kind: "pistol-heavy", pattern: "splatter", a: "#FF6B1A", b: "#2A0F05" } },

  // ───────────── Covert ─────────────
  { slug: "m4a1s-printstream", market_name: "M4A1-S | Printstream", weapon: "M4A1-S", finish: "Printstream", rarity: "covert", price: 14200, stattrak: true, art: { kind: "rifle-m4", pattern: "marble", a: "#E8E8F0", b: "#14141C" } },
  { slug: "awp-asiimov", market_name: "AWP | Asiimov", weapon: "AWP", finish: "Asiimov", rarity: "covert", price: 9600, stattrak: true, art: { kind: "sniper", pattern: "stripe", a: "#F0F0F0", b: "#FF7A18" } },
  { slug: "usp-s-kill-confirmed", market_name: "USP-S | Kill Confirmed", weapon: "USP-S", finish: "Kill Confirmed", rarity: "covert", price: 6400, stattrak: true, art: { kind: "pistol", pattern: "splatter", a: "#E03B3B", b: "#1A1A22" } },
  { slug: "ak-47-asiimov", market_name: "AK-47 | Asiimov", weapon: "AK-47", finish: "Asiimov", rarity: "covert", price: 5500, stattrak: true, art: { kind: "rifle-ak", pattern: "stripe", a: "#F2F2F2", b: "#FF7A18" } },
  { slug: "awp-wildfire", market_name: "AWP | Wildfire", weapon: "AWP", finish: "Wildfire", rarity: "covert", price: 5100, stattrak: true, art: { kind: "sniper", pattern: "splatter", a: "#FF6B1A", b: "#2A0F05" } },
  { slug: "m4a4-the-emperor", market_name: "M4A4 | The Emperor", weapon: "M4A4", finish: "The Emperor", rarity: "covert", price: 4700, stattrak: true, art: { kind: "rifle-m4", pattern: "marble", a: "#C43B6B", b: "#2A1140" } },
  { slug: "ak-47-bloodsport", market_name: "AK-47 | Bloodsport", weapon: "AK-47", finish: "Bloodsport", rarity: "covert", price: 4400, stattrak: true, art: { kind: "rifle-ak", pattern: "stripe", a: "#E03B5A", b: "#101018" } },
  { slug: "awp-neo-noir", market_name: "AWP | Neo-Noir", weapon: "AWP", finish: "Neo-Noir", rarity: "covert", price: 4100, stattrak: true, art: { kind: "sniper", pattern: "marble", a: "#C23BD6", b: "#14102A" } },
  { slug: "desert-eagle-printstream", market_name: "Desert Eagle | Printstream", weapon: "Desert Eagle", finish: "Printstream", rarity: "covert", price: 3900, stattrak: true, art: { kind: "pistol-heavy", pattern: "marble", a: "#EDEDF2", b: "#16161E" } },
  { slug: "ak-47-neon-rider", market_name: "AK-47 | Neon Rider", weapon: "AK-47", finish: "Neon Rider", rarity: "covert", price: 3600, stattrak: true, art: { kind: "rifle-ak", pattern: "stripe", a: "#FF3B6B", b: "#22D3EE" } },
  { slug: "awp-hyper-beast", market_name: "AWP | Hyper Beast", weapon: "AWP", finish: "Hyper Beast", rarity: "covert", price: 3200, stattrak: true, art: { kind: "sniper", pattern: "splatter", a: "#2FD98A", b: "#C23BD6" } },
  { slug: "m4a1s-hyper-beast", market_name: "M4A1-S | Hyper Beast", weapon: "M4A1-S", finish: "Hyper Beast", rarity: "covert", price: 2400, stattrak: true, art: { kind: "rifle-m4", pattern: "splatter", a: "#FF7A18", b: "#2A1140" } },
  { slug: "mp9-starlight-protector", market_name: "MP9 | Starlight Protector", weapon: "MP9", finish: "Starlight Protector", rarity: "covert", price: 950, stattrak: true, art: { kind: "smg", pattern: "doppler", a: "#6E71FF", b: "#101A3A" } },

  // ───────────── Classified ─────────────
  { slug: "ak-47-vulcan", market_name: "AK-47 | Vulcan", weapon: "AK-47", finish: "Vulcan", rarity: "classified", price: 5900, stattrak: true, art: { kind: "rifle-ak", pattern: "carbon", a: "#3E82F7", b: "#16161E" } },
  { slug: "ak-47-redline", market_name: "AK-47 | Redline", weapon: "AK-47", finish: "Redline", rarity: "classified", price: 1500, stattrak: true, art: { kind: "rifle-ak", pattern: "carbon", a: "#C4243B", b: "#131318" } },
  { slug: "ak-47-point-disarray", market_name: "AK-47 | Point Disarray", weapon: "AK-47", finish: "Point Disarray", rarity: "classified", price: 1250, stattrak: true, art: { kind: "rifle-ak", pattern: "splatter", a: "#E0603B", b: "#1A1620" } },
  { slug: "m4a4-desolate-space", market_name: "M4A4 | Desolate Space", weapon: "M4A4", finish: "Desolate Space", rarity: "classified", price: 1050, stattrak: true, art: { kind: "rifle-m4", pattern: "doppler", a: "#4A6BD6", b: "#120F2A" } },
  { slug: "awp-man-o-war", market_name: "AWP | Man-o'-war", weapon: "AWP", finish: "Man-o'-war", rarity: "classified", price: 880, stattrak: true, art: { kind: "sniper", pattern: "camo", a: "#3B8A6B", b: "#141C18" } },
  { slug: "mac-10-neon-rider", market_name: "MAC-10 | Neon Rider", weapon: "MAC-10", finish: "Neon Rider", rarity: "classified", price: 690, stattrak: true, art: { kind: "smg", pattern: "stripe", a: "#FF3B6B", b: "#22D3EE" } },
  { slug: "five-seven-hyper-beast", market_name: "Five-SeveN | Hyper Beast", weapon: "Five-SeveN", finish: "Hyper Beast", rarity: "classified", price: 520, stattrak: true, art: { kind: "pistol", pattern: "splatter", a: "#2FD98A", b: "#3A1140" } },

  // ───────────── Restricted ─────────────
  { slug: "m4a1s-cyrex", market_name: "M4A1-S | Cyrex", weapon: "M4A1-S", finish: "Cyrex", rarity: "restricted", price: 700, stattrak: true, art: { kind: "rifle-m4", pattern: "stripe", a: "#E04B2A", b: "#F0F0F4" } },
  { slug: "glock-18-vogue", market_name: "Glock-18 | Vogue", weapon: "Glock-18", finish: "Vogue", rarity: "restricted", price: 600, stattrak: true, art: { kind: "pistol", pattern: "marble", a: "#E86BA8", b: "#2A1A3A" } },
  { slug: "glock-18-water-elemental", market_name: "Glock-18 | Water Elemental", weapon: "Glock-18", finish: "Water Elemental", rarity: "restricted", price: 450, stattrak: true, art: { kind: "pistol", pattern: "hydro", a: "#3B9AD6", b: "#0E1C2A" } },
  { slug: "desert-eagle-conspiracy", market_name: "Desert Eagle | Conspiracy", weapon: "Desert Eagle", finish: "Conspiracy", rarity: "restricted", price: 410, stattrak: true, art: { kind: "pistol-heavy", pattern: "marble", a: "#C43B4A", b: "#1A1420" } },
  { slug: "usp-s-cortex", market_name: "USP-S | Cortex", weapon: "USP-S", finish: "Cortex", rarity: "restricted", price: 350, stattrak: true, art: { kind: "pistol", pattern: "circuit", a: "#D66B3B", b: "#1A1620" } },
  { slug: "awp-atheris", market_name: "AWP | Atheris", weapon: "AWP", finish: "Atheris", rarity: "restricted", price: 300, stattrak: true, art: { kind: "sniper", pattern: "camo", a: "#3BC46B", b: "#101A14" } },
  { slug: "mag-7-firestarter", market_name: "MAG-7 | Firestarter", weapon: "MAG-7", finish: "Firestarter", rarity: "restricted", price: 285, stattrak: true, art: { kind: "shotgun", pattern: "splatter", a: "#F58A18", b: "#1A1206" } },
  { slug: "mp7-bloodsport", market_name: "MP7 | Bloodsport", weapon: "MP7", finish: "Bloodsport", rarity: "restricted", price: 260, stattrak: true, art: { kind: "smg", pattern: "stripe", a: "#E03B5A", b: "#111118" } },
  { slug: "ak-47-slate", market_name: "AK-47 | Slate", weapon: "AK-47", finish: "Slate", rarity: "restricted", price: 250, stattrak: true, art: { kind: "rifle-ak", pattern: "solid", a: "#4A5266", b: "#14161C" } },
  { slug: "nova-hyper-beast", market_name: "Nova | Hyper Beast", weapon: "Nova", finish: "Hyper Beast", rarity: "restricted", price: 220, stattrak: true, art: { kind: "shotgun", pattern: "splatter", a: "#2FD98A", b: "#3A1140" } },

  // ───────────── Mil-Spec ─────────────
  { slug: "galil-ar-sugar-rush", market_name: "Galil AR | Sugar Rush", weapon: "Galil AR", finish: "Sugar Rush", rarity: "milspec", price: 150, stattrak: true, art: { kind: "rifle-ak", pattern: "splatter", a: "#E86BA8", b: "#2A1030" } },
  { slug: "ssg-08-necropos", market_name: "SSG 08 | Necropos", weapon: "SSG 08", finish: "Necropos", rarity: "milspec", price: 125, stattrak: true, art: { kind: "sniper", pattern: "marble", a: "#3B9A8A", b: "#101A1A" } },
  { slug: "p250-nevermore", market_name: "P250 | Nevermore", weapon: "P250", finish: "Nevermore", rarity: "milspec", price: 110, stattrak: true, art: { kind: "pistol", pattern: "splatter", a: "#6E71FF", b: "#12121C" } },
  { slug: "famas-roll-cage", market_name: "FAMAS | Roll Cage", weapon: "FAMAS", finish: "Roll Cage", rarity: "milspec", price: 95, stattrak: true, art: { kind: "rifle-m4", pattern: "carbon", a: "#4A8AD6", b: "#121820" } },
  { slug: "mp9-rose-iron", market_name: "MP9 | Rose Iron", weapon: "MP9", finish: "Rose Iron", rarity: "milspec", price: 90, stattrak: true, art: { kind: "smg", pattern: "camo", a: "#C4566B", b: "#1A1216" } },
  { slug: "glock-18-moonrise", market_name: "Glock-18 | Moonrise", weapon: "Glock-18", finish: "Moonrise", rarity: "milspec", price: 80, stattrak: true, art: { kind: "pistol", pattern: "doppler", a: "#5A6BD6", b: "#101228" } },
  { slug: "ump-45-momentum", market_name: "UMP-45 | Momentum", weapon: "UMP-45", finish: "Momentum", rarity: "milspec", price: 70, stattrak: true, art: { kind: "smg", pattern: "stripe", a: "#3BA8D6", b: "#0E1A22" } },

  // ───────────── Industrial ─────────────
  { slug: "scar-20-cardiac", market_name: "SCAR-20 | Cardiac", weapon: "SCAR-20", finish: "Cardiac", rarity: "industrial", price: 55, stattrak: true, art: { kind: "sniper", pattern: "circuit", a: "#3BC46B", b: "#101A14" } },
  { slug: "nova-predator", market_name: "Nova | Predator", weapon: "Nova", finish: "Predator", rarity: "industrial", price: 45, stattrak: true, art: { kind: "shotgun", pattern: "camo", a: "#3B7A4A", b: "#121A14" } },
  { slug: "tec-9-isaac", market_name: "Tec-9 | Isaac", weapon: "Tec-9", finish: "Isaac", rarity: "industrial", price: 40, stattrak: true, art: { kind: "pistol", pattern: "stripe", a: "#C4A03B", b: "#1A1610" } },
  { slug: "p2000-handgun", market_name: "P2000 | Handgun", weapon: "P2000", finish: "Handgun", rarity: "industrial", price: 35, stattrak: true, art: { kind: "pistol", pattern: "solid", a: "#6B7280", b: "#14161C" } },

  // ───────────── Consumer ─────────────
  { slug: "dual-berettas-contractor", market_name: "Dual Berettas | Contractor", weapon: "Dual Berettas", finish: "Contractor", rarity: "consumer", price: 18, stattrak: true, art: { kind: "pistol", pattern: "camo", a: "#5A6350", b: "#16180F" } },
  { slug: "sawed-off-forest-ddpat", market_name: "Sawed-Off | Forest DDPAT", weapon: "Sawed-Off", finish: "Forest DDPAT", rarity: "consumer", price: 16, stattrak: true, art: { kind: "shotgun", pattern: "camo", a: "#4A5A3A", b: "#14180E" } },
  { slug: "mp9-storm", market_name: "MP9 | Storm", weapon: "MP9", finish: "Storm", rarity: "consumer", price: 15, stattrak: true, art: { kind: "smg", pattern: "camo", a: "#5A6B7A", b: "#12161C" } },
  { slug: "nova-polar-mesh", market_name: "Nova | Polar Mesh", weapon: "Nova", finish: "Polar Mesh", rarity: "consumer", price: 14, stattrak: true, art: { kind: "shotgun", pattern: "carbon", a: "#8A97A8", b: "#181C22" } },
  { slug: "pp-bizon-urban-dashed", market_name: "PP-Bizon | Urban Dashed", weapon: "PP-Bizon", finish: "Urban Dashed", rarity: "consumer", price: 13, stattrak: true, art: { kind: "smg", pattern: "camo", a: "#6B7280", b: "#14161C" } },
  { slug: "p250-sand-dune", market_name: "P250 | Sand Dune", weapon: "P250", finish: "Sand Dune", rarity: "consumer", price: 12, stattrak: true, art: { kind: "pistol", pattern: "solid", a: "#C4A878", b: "#22201A" } },
  { slug: "p2000-grassland", market_name: "P2000 | Grassland", weapon: "P2000", finish: "Grassland", rarity: "consumer", price: 11, stattrak: true, art: { kind: "pistol", pattern: "camo", a: "#5A7A4A", b: "#141A10" } },
];

export interface SeedCase {
  slug: string;
  name: string;
  description: string;
  /** Price in ₽ (major units). */
  price: number;
  tags: string[];
  partner_only?: boolean;
  art: { emblem: string; a: string; b: string };
  /** skin slug → integer weight. Weights are per-case and need not sum to any total. */
  items: Record<string, number>;
}

export const CASES: SeedCase[] = [
  {
    slug: "starter-drop",
    name: "Стартовый набор",
    description:
      "Самый дешёвый вход в Zevora. Ничего дорогого, но шанс на Restricted есть в каждом открытии.",
    price: 49,
    tags: ["cheap", "new"],
    art: { emblem: "bolt", a: "#22D3EE", b: "#0D1020" },
    items: {
      "p250-sand-dune": 20000,
      "dual-berettas-contractor": 6000,
      "sawed-off-forest-ddpat": 6000,
      "p2000-grassland": 18000,
      "mp9-storm": 18000,
      "nova-polar-mesh": 12000,
      "pp-bizon-urban-dashed": 8000,
      "ump-45-momentum": 9000,
      "glock-18-moonrise": 6000,
      "ssg-08-necropos": 3000,
      "ak-47-slate": 1500,
      "usp-s-cortex": 400,
      "desert-eagle-conspiracy": 100,
    },
  },
  {
    slug: "night-raid",
    name: "Ночной рейд",
    description:
      "Тактический набор: тёмные финиши, городской камуфляж и редкий шанс на Covert.",
    price: 299,
    tags: ["cheap", "popular"],
    art: { emblem: "eye", a: "#3E82F7", b: "#0B1220" },
    items: {
      "p2000-handgun": 13600,
      "tec-9-isaac": 12000,
      "nova-predator": 11000,
      "mag-7-firestarter": 6000,
      "scar-20-cardiac": 4000,
      "mp9-rose-iron": 10000,
      "famas-roll-cage": 9000,
      "p250-nevermore": 9000,
      "mp7-bloodsport": 11000,
      "ak-47-slate": 10000,
      "awp-atheris": 7000,
      "glock-18-water-elemental": 4500,
      "m4a1s-cyrex": 1800,
      "ak-47-redline": 900,
      "awp-hyper-beast": 200,
    },
  },
  {
    slug: "neon-division",
    name: "Neon Division",
    description:
      "Кислотные цвета и неон: Neon Rider, Vogue и Starlight Protector в одном пуле.",
    price: 899,
    tags: ["popular", "new"],
    art: { emblem: "bolt", a: "#FF3B6B", b: "#22D3EE" },
    items: {
      "mp9-rose-iron": 12000,
      "galil-ar-sugar-rush": 10500,
      "p250-nevermore": 9500,
      "glock-18-moonrise": 9000,
      "nova-hyper-beast": 9000,
      "glock-18-vogue": 9500,
      "mac-10-neon-rider": 9000,
      "five-seven-hyper-beast": 8000,
      "m4a1s-cyrex": 8000,
      "ak-47-redline": 7000,
      "mp9-starlight-protector": 5000,
      "ak-47-neon-rider": 2000,
      "awp-neo-noir": 900,
      "m4a4-the-emperor": 550,
      "karambit-doppler": 50,
    },
  },
  {
    slug: "asiimov-protocol",
    name: "Asiimov Protocol",
    description:
      "Премиальная серия: Asiimov, Printstream и Kill Confirmed. Дешёвого мусора здесь нет.",
    price: 2490,
    tags: ["premium", "rare"],
    art: { emblem: "hex", a: "#F5B841", b: "#16161E" },
    items: {
      "ak-47-slate": 14000,
      "awp-atheris": 12000,
      "usp-s-cortex": 11000,
      "glock-18-vogue": 10000,
      "m4a1s-cyrex": 9000,
      "awp-man-o-war": 8000,
      "m4a4-desolate-space": 7000,
      "ak-47-point-disarray": 6000,
      "ak-47-redline": 5500,
      "m4a1s-hyper-beast": 4500,
      "awp-hyper-beast": 3500,
      "ak-47-bloodsport": 2400,
      "ak-47-asiimov": 2400,
      "awp-wildfire": 1900,
      "usp-s-kill-confirmed": 1500,
      "awp-asiimov": 1000,
      "m4a1s-printstream": 520,
      "ak-47-vulcan": 420,
      "bayonet-tiger-tooth": 130,
      "karambit-doppler": 55,
      "m9-bayonet-marble-fade": 35,
      "butterfly-knife-fade": 12,
    },
  },
  {
    slug: "blade-forge",
    name: "Кузня клинков",
    description:
      "Шанс на нож или перчатки в каждом открытии. Самый высокий потолок в Zevora.",
    price: 7990,
    tags: ["premium", "rare", "popular"],
    art: { emblem: "orbit", a: "#A855F7", b: "#5B4BFF" },
    items: {
      "ak-47-redline": 12000,
      "m4a4-desolate-space": 10000,
      "awp-man-o-war": 9500,
      "ak-47-point-disarray": 9000,
      "awp-hyper-beast": 9000,
      "m4a1s-hyper-beast": 8500,
      "ak-47-neon-rider": 8000,
      "awp-neo-noir": 7500,
      "desert-eagle-printstream": 7000,
      "ak-47-bloodsport": 6000,
      "m4a4-the-emperor": 5000,
      "ak-47-asiimov": 4000,
      "usp-s-kill-confirmed": 3000,
      "awp-asiimov": 2400,
      "ak-47-vulcan": 1800,
      "m4a1s-printstream": 1200,
      "bayonet-tiger-tooth": 700,
      "talon-knife-slaughter": 420,
      "m9-bayonet-marble-fade": 300,
      "karambit-doppler": 220,
      "specialist-gloves-fade": 130,
      "butterfly-knife-fade": 70,
      "sport-gloves-pandoras-box": 30,
    },
  },
  {
    slug: "legacy-vault",
    name: "Legacy Vault",
    description:
      "Легендарные финиши CS2 — Dragon Lore, Howl и Blaze в одном пуле. Самый высокий потолок на площадке.",
    price: 19900,
    tags: ["premium", "rare"],
    art: { emblem: "crown", a: "#E4AE39", b: "#2A1A05" },
    items: {
      "ak-47-redline": 14000,
      "m4a4-neo-noir": 12000,
      "awp-hyper-beast": 11000,
      "m4a1s-player-two": 10000,
      "ak-47-the-empress": 9000,
      "usp-s-kill-confirmed": 8500,
      "ak-47-asiimov": 8000,
      "desert-eagle-blaze": 7370,
      "glock-18-fade": 7000,
      "awp-lightning-strike": 6500,
      "awp-asiimov": 5000,
      "m4a1s-printstream": 3500,
      "bayonet-tiger-tooth": 2345,
      "ak-47-vulcan": 1400,
      "m9-bayonet-marble-fade": 1340,
      "karambit-doppler": 837,
      "m4a4-howl": 134,
      "awp-dragon-lore": 34,
    },
  },
  {
    slug: "zevora-vault",
    name: "Zevora Vault",
    description:
      "Закрытый кейс партнёрской программы. Открывается бесплатно и недоступен обычным аккаунтам.",
    price: 0,
    tags: ["partner", "premium"],
    partner_only: true,
    art: { emblem: "crown", a: "#F5B841", b: "#5B4BFF" },
    items: {
      "ak-47-redline": 20000,
      "awp-hyper-beast": 16000,
      "m4a1s-hyper-beast": 14000,
      "ak-47-neon-rider": 12000,
      "awp-neo-noir": 10000,
      "desert-eagle-printstream": 8000,
      "ak-47-asiimov": 6000,
      "usp-s-kill-confirmed": 5000,
      "awp-asiimov": 3500,
      "m4a1s-printstream": 2000,
      "ak-47-vulcan": 1500,
      "karambit-doppler": 600,
      "m9-bayonet-marble-fade": 300,
      "butterfly-knife-fade": 80,
      "sport-gloves-pandoras-box": 20,
    },
  },
];
