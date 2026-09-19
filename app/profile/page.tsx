import type { Metadata } from "next";
import { ProfileView } from "@/components/profile/ProfileView";

export const metadata: Metadata = {
  title: "Профиль",
  description:
    "Профиль игрока Zevora: статистика, достижения, инвентарь и история действий.",
};

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <ProfileView />
    </div>
  );
}
