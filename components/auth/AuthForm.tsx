"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { KeyRound, LogIn, UserPlus } from "lucide-react";
import { ApiRequestError } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { ZevoraLogo } from "@/components/art/ZevoraLogo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { toast } from "@/lib/store/useToast";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
/** The published static build has no server behind the form. */
const STATIC_DEMO = process.env.NEXT_PUBLIC_ZEVORA_STATIC === "1";

const MIN_PASSWORD = 6;

/** Demo accounts created by the seeder, shown so the app is usable at once. */
const DEMO = [
  { username: "dimnesser", password: "zevora123", note: "владелец · доступ в админку" },
  { username: "player", password: "player123", note: "обычный игрок" },
];

export function AuthForm() {
  const router = useRouter();
  const { login, register } = useSession();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const usernameValid = USERNAME_RE.test(username);
  const passwordValid = password.length >= MIN_PASSWORD;
  const valid = mode === "login" ? username.length > 0 && password.length > 0 : usernameValid && passwordValid;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      if (mode === "login") {
        await login(username.trim(), password);
        toast.success("С возвращением", username.trim());
      } else {
        await register(username.trim(), password);
        toast.success("Аккаунт создан", "Начальный баланс 1 000 ₽ уже на счету");
      }
      router.push("/cases");
      router.refresh();
    } catch (err) {
      toast.error(
        mode === "login" ? "Не удалось войти" : "Не удалось зарегистрироваться",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    } finally {
      setBusy(false);
    }
  };

  const useDemo = async (account: (typeof DEMO)[number]) => {
    setUsername(account.username);
    setPassword(account.password);
    setBusy(true);
    try {
      await login(account.username, account.password);
      toast.success("Вход выполнен", account.username);
      router.push("/cases");
      router.refresh();
    } catch (err) {
      toast.error(
        "Не удалось войти",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-200px)] max-w-md flex-col justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="mb-8 flex justify-center">
          <ZevoraLogo />
        </div>

        <Card strong className="p-6">
          <Tabs
            items={[
              { id: "login", label: "Вход" },
              { id: "register", label: "Регистрация" },
            ]}
            value={mode}
            onChange={(m) => setMode(m)}
            className="mb-6"
          />

          <div className="space-y-4">
            <Field
              label="Ник"
              hint={
                mode === "register" ? "3–20 символов: латиница, цифры и _" : undefined
              }
            >
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submit()}
                placeholder="dimnesser"
                autoComplete="username"
                invalid={mode === "register" && username.length > 0 && !usernameValid}
              />
            </Field>

            <Field
              label="Пароль"
              hint={mode === "register" ? `Минимум ${MIN_PASSWORD} символов` : undefined}
            >
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submit()}
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                iconLeft={<KeyRound size={15} />}
                invalid={mode === "register" && password.length > 0 && !passwordValid}
              />
            </Field>

            <Button
              size="lg"
              fullWidth
              disabled={!valid}
              loading={busy}
              onClick={() => void submit()}
              iconLeft={mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
            >
              {mode === "login" ? "Войти" : "Создать аккаунт"}
            </Button>
          </div>

          <div className="mt-6 border-t border-line-soft pt-5">
            {STATIC_DEMO ? (
              // The published demo has no user table: the account lives in
              // this browser, so naming the seeded ones would be a lie.
              <p className="text-[12px] leading-relaxed text-slate-500">
                <span className="meta mb-1.5 block">Витрина на GitHub Pages</span>
                Сервера здесь нет — аккаунт, баланс и инвентарь хранятся в этом
                браузере. Подойдёт любой ник и пароль от {MIN_PASSWORD} символов,
                на старте начисляется демо-баланс.
              </p>
            ) : (
              <>
                <p className="meta mb-3">Демо-аккаунты</p>
                <div className="space-y-2">
                  {DEMO.map((account) => (
                    <button
                      key={account.username}
                      onClick={() => void useDemo(account)}
                      disabled={busy}
                      className="flex w-full items-center justify-between gap-3 rounded-sm border border-line-soft bg-white/[0.025] px-3.5 py-2.5 text-left transition-colors hover:border-line hover:bg-white/[0.05] disabled:opacity-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-[13px] font-semibold text-white">
                          {account.username}
                        </span>
                        <span className="block truncate text-[11.5px] text-slate-500">
                          {account.note}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[11.5px] text-slate-600">
                        {account.password}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>

        <p className="mt-6 text-center text-[11.5px] leading-relaxed text-slate-600">
          Демонстрационная версия. Баланс и предметы виртуальные, реальные
          платежи не проводятся. 18+
        </p>
      </motion.div>
    </div>
  );
}
