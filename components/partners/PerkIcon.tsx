"use client";

import {
  Boxes,
  Dices,
  DoorOpen,
  FlaskConical,
  Gem,
  Gift,
  Headset,
  Link2,
  Package,
  Palette,
  Percent,
  Rocket,
  Star,
  Ticket,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  star: Star,
  palette: Palette,
  gift: Gift,
  ticket: Ticket,
  link: Link2,
  headset: Headset,
  package: Package,
  dice: Dices,
  rocket: Rocket,
  flask: FlaskConical,
  gem: Gem,
  door: DoorOpen,
  boxes: Boxes,
  percent: Percent,
};

export function PerkIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = MAP[name] ?? Star;
  return <Icon size={size} />;
}
