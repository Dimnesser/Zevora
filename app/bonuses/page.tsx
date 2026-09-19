import type { Metadata } from "next";
import { BonusesView } from "@/components/bonuses/BonusesView";
import { SectionHeader } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Бонусы",
  description:
    "Ежедневный бонус, streak, промокоды, бонус за регистрацию и реферальная программа Zevora.",
};

export default function BonusesPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <SectionHeader
        eyebrow="Награды"
        title="Бонусы"
        description="Забирайте ежедневную награду, активируйте промокоды и приглашайте друзей."
      />
      <BonusesView />
    </div>
  );
}
