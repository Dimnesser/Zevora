import type { Metadata } from "next";
import { UpgradeBoard } from "@/components/upgrade/UpgradeBoard";
import { SectionHeader } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Апгрейд предметов",
  description:
    "Поставьте свой предмет и попробуйте получить более дорогой. Шанс, множитель и потенциальная прибыль видны до запуска.",
};

export default function UpgradePage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <SectionHeader
        eyebrow="Режим игры"
        title="Апгрейд"
        description="Выберите предмет из инвентаря и цель, на которую хотите его обменять. Шанс рассчитывается как отношение стоимости ставки к цели."
      />
      <UpgradeBoard />
    </div>
  );
}
