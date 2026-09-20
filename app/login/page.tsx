import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Вход",
  description: "Войдите в аккаунт Zevora или создайте новый.",
};

export default function LoginPage() {
  return <AuthForm />;
}
