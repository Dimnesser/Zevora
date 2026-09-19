import type { Metadata } from "next";
import { PartnersPage } from "@/components/partners/PartnersPage";

export const metadata: Metadata = {
  title: "Zevora Partners",
  description:
    "Закрытая программа для людей, которые развивают Zevora вместе с нами. Статус выдаётся только владельцем вручную.",
};

export default function Partners() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PartnersPage />
    </div>
  );
}
