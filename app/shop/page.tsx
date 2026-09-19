import type { Metadata } from "next";
import { ShopGrid } from "@/components/shop/ShopGrid";
import { SectionHeader } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Магазин",
  description:
    "Купите нужный скин CS2 напрямую за баланс, без открытия кейсов.",
};

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <SectionHeader
        eyebrow="Каталог"
        title="Магазин"
        description="Не хотите полагаться на удачу — купите нужный предмет сразу. Наценка к цене продажи составляет 12%."
      />
      <ShopGrid />
    </div>
  );
}
