import type { Metadata } from "next";
import { InventoryGrid } from "@/components/items/InventoryGrid";
import { SectionHeader } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Инвентарь",
  description:
    "Ваши предметы в Zevora: продажа по рыночной цене, апгрейд и вывод в Steam.",
};

export default function InventoryPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <SectionHeader
        eyebrow="Аккаунт"
        title="Инвентарь"
        description="Продайте предмет в один клик, отправьте его на апгрейд или выведите в Steam."
      />
      <InventoryGrid />
    </div>
  );
}
