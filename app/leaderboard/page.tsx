import type { Metadata } from "next";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { SectionHeader } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Рейтинг игроков",
  description:
    "Топ игроков Zevora по сумме выигранных предметов, потраченному балансу и числу апгрейдов.",
};

export default function LeaderboardPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <SectionHeader
        eyebrow="Сообщество"
        title="Рейтинг"
        description="Места распределяются по сумме выигранных предметов. Партнёры Zevora отмечены отдельным бейджем."
      />
      <LeaderboardTable />
    </div>
  );
}
