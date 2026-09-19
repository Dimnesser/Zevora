import type { Metadata } from "next";
import { Prose } from "@/components/ui/Prose";
import { SupportForm } from "@/components/support/SupportForm";

export const metadata: Metadata = {
  title: "Поддержка",
  description: "Свяжитесь с командой Zevora: вывод, баланс, партнёрская программа.",
};

export default function SupportPage() {
  return (
    <Prose
      title="Поддержка"
      lead="Отвечаем круглосуточно. Партнёры Zevora обслуживаются в отдельной приоритетной очереди."
    >
      <SupportForm />
    </Prose>
  );
}
