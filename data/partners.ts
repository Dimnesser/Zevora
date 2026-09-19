import type { PartnerTier } from "@/types";

export interface TierMeta {
  id: PartnerTier;
  name: string;
  tagline: string;
  /** Accent colours for badges, glows and gradients. */
  colors: [string, string];
  /** Revenue share shown in the tier table. */
  share: number;
  /** Daily partner reward in ₽. */
  dailyReward: number;
  /** Referral bonus multiplier vs. a regular user. */
  refMultiplier: number;
  perks: string[];
}

export const TIERS: Record<PartnerTier, TierMeta> = {
  partner: {
    id: "partner",
    name: "Partner",
    tagline: "Вход в закрытый круг Zevora",
    colors: ["#6E71FF", "#22D3EE"],
    share: 0.05,
    dailyReward: 250,
    refMultiplier: 1.5,
    perks: [
      "badge",
      "profile-color",
      "daily-boost",
      "personal-promo",
      "ref-link",
      "priority-support",
    ],
  },
  creator: {
    id: "creator",
    name: "Creator",
    tagline: "Для тех, кто делает контент о Zevora",
    colors: ["#A855F7", "#6E71FF"],
    share: 0.08,
    dailyReward: 600,
    refMultiplier: 2,
    perks: [
      "badge",
      "profile-color",
      "daily-boost",
      "personal-promo",
      "ref-link",
      "priority-support",
      "partner-cases",
      "closed-drops",
      "early-access",
    ],
  },
  elite: {
    id: "elite",
    name: "Elite Partner",
    tagline: "Расширенный доступ и лимитированные награды",
    colors: ["#F5B841", "#FF7A18"],
    share: 0.12,
    dailyReward: 1500,
    refMultiplier: 3,
    perks: [
      "badge",
      "profile-color",
      "daily-boost",
      "personal-promo",
      "ref-link",
      "priority-support",
      "partner-cases",
      "closed-drops",
      "early-access",
      "closed-tests",
      "limited-items",
      "lounge",
    ],
  },
  ambassador: {
    id: "ambassador",
    name: "Zevora Ambassador",
    tagline: "Лицо платформы. Максимальный уровень доступа",
    colors: ["#22D3EE", "#A855F7"],
    share: 0.18,
    dailyReward: 4000,
    refMultiplier: 4,
    perks: [
      "badge",
      "profile-color",
      "daily-boost",
      "personal-promo",
      "ref-link",
      "priority-support",
      "partner-cases",
      "closed-drops",
      "early-access",
      "closed-tests",
      "limited-items",
      "lounge",
      "custom-case",
      "revenue-share",
    ],
  },
};

export const TIER_LIST: TierMeta[] = [
  TIERS.partner,
  TIERS.creator,
  TIERS.elite,
  TIERS.ambassador,
];

export interface Perk {
  id: string;
  name: string;
  description: string;
  /** lucide-react icon name resolved in components/partners/PerkIcon.tsx */
  icon: string;
}

export const PERKS: Perk[] = [
  {
    id: "badge",
    name: "Партнёрский бейдж",
    description:
      "Значок ★ ZEVORA PARTNER рядом с ником — в чате, топе и профиле.",
    icon: "star",
  },
  {
    id: "profile-color",
    name: "Уникальный цвет профиля",
    description:
      "Персональный градиент карточки профиля и подсветка ника в рейтинге.",
    icon: "palette",
  },
  {
    id: "daily-boost",
    name: "Повышенный daily",
    description:
      "Ежедневная награда увеличивается в зависимости от уровня партнёрства.",
    icon: "gift",
  },
  {
    id: "personal-promo",
    name: "Персональный промокод",
    description:
      "Собственный код вида ZEV-NAME с бонусом для ваших зрителей и вас.",
    icon: "ticket",
  },
  {
    id: "ref-link",
    name: "Партнёрская ссылка",
    description:
      "Личная ссылка с полной статистикой переходов, регистраций и дохода.",
    icon: "link",
  },
  {
    id: "priority-support",
    name: "Приоритетная поддержка",
    description: "Отдельная очередь и личный менеджер вместо общего тикета.",
    icon: "headset",
  },
  {
    id: "partner-cases",
    name: "Эксклюзивные кейсы",
    description:
      "Zevora Vault и Lounge Reliquary — недоступны обычным пользователям.",
    icon: "package",
  },
  {
    id: "closed-drops",
    name: "Закрытые розыгрыши",
    description: "Розыгрыши внутри клуба с минимальным числом участников.",
    icon: "dice",
  },
  {
    id: "early-access",
    name: "Ранний доступ",
    description: "Новые режимы и кейсы появляются у партнёров раньше всех.",
    icon: "rocket",
  },
  {
    id: "closed-tests",
    name: "Закрытые тесты",
    description: "Доступ к тестовой среде и влияние на механику до релиза.",
    icon: "flask",
  },
  {
    id: "limited-items",
    name: "Лимитированные предметы",
    description:
      "Сезонные предметы с партнёрской печатью, которые нельзя выбить иначе.",
    icon: "gem",
  },
  {
    id: "lounge",
    name: "Partner Lounge",
    description:
      "Закрытый раздел с внутренними анонсами, метриками и прямой связью.",
    icon: "door",
  },
  {
    id: "custom-case",
    name: "Именной кейс",
    description: "Кейс с вашим названием и дроп-таблицей в общем каталоге.",
    icon: "boxes",
  },
  {
    id: "revenue-share",
    name: "Доля от оборота",
    description: "Процент от оборота приглашённых пользователей на ваш баланс.",
    icon: "percent",
  },
];

export const PERK_MAP: Record<string, Perk> = Object.fromEntries(
  PERKS.map((p) => [p.id, p]),
);

export function tierMeta(tier: PartnerTier): TierMeta {
  return TIERS[tier];
}
