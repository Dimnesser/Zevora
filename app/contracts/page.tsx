import type { Metadata } from "next";
import { ContractBoard } from "@/components/contracts/ContractBoard";
import { SectionHeader } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Контракты",
  description:
    "Обменяйте десять предметов одной редкости на один предмет рангом выше. Износ результата зависит от среднего float вложенных предметов.",
};

export default function ContractsPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <SectionHeader
        eyebrow="Режим игры"
        title="Контракты"
        description="Десять предметов одной редкости обмениваются на один предмет рангом выше. Что именно может выпасть, решают кейсы, из которых пришли вложенные предметы, а износ результата — их средний float."
      />
      <ContractBoard />
    </div>
  );
}
