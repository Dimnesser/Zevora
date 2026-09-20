import type { Metadata } from "next";
import { WalletView } from "@/components/wallet/WalletView";
import { SectionHeader } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Баланс",
  description:
    "Пополнение баланса, вывод предметов в Steam и полная история операций Zevora.",
};

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initial =
    tab === "withdraw" || tab === "history" ? tab : "deposit";

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <SectionHeader
        eyebrow="Аккаунт"
        title="Баланс и вывод"
        description="Пополняйте баланс удобным способом и выводите предметы напрямую в Steam."
      />
      <WalletView initialTab={initial} />
    </div>
  );
}
