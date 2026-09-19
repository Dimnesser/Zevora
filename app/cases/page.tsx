import type { Metadata } from "next";
import { CasesBrowser } from "@/components/cases/CasesBrowser";

export const metadata: Metadata = {
  title: "Кейсы CS2",
  description:
    "Каталог кейсов Zevora: от стартовых наборов до хранилища клинков. Шансы каждого предмета видны до открытия.",
};

export default function CasesPage() {
  return <CasesBrowser />;
}
