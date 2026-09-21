import type { Metadata } from "next";
import { WalletView } from "@/components/wallet/WalletView";
import { SectionHeader } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Баланс",
  description:
    "Пополнение баланса, вывод предметов в Steam и полная история операций Zevora.",
};

export default function WalletPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <SectionHeader
        eyebrow="Аккаунт"
        title="Баланс и вывод"
        description="Пополняйте баланс удобным способом и выводите предметы напрямую в Steam."
      />
      <WalletView />
    </div>
  );
}
