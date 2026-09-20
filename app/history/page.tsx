import type { Metadata } from "next";
import { OpeningsHistory } from "@/components/history/OpeningsHistory";
import { SectionHeader } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "История открытий",
  description: "Полная история открытий кейсов Zevora с проверяемым билетом розыгрыша.",
};

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <SectionHeader
        eyebrow="Аккаунт"
        title="История открытий"
        description="Каждая запись хранит выигрышный билет и общий вес кейса — по ним можно перепроверить розыгрыш."
      />
      <OpeningsHistory />
    </div>
  );
}
