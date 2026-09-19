"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { PartnerBadge } from "@/components/partners/PartnerBadge";
import { toast } from "@/lib/store/useToast";

const TOPICS = [
  "Вывод предметов",
  "Пополнение баланса",
  "Партнёрская программа",
  "Технический вопрос",
];

export function SupportForm() {
  const hydrated = useHydrated();
  const tier = useStore((s) => s.user.partner?.tier);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (message.trim().length < 10) {
      toast.error("Слишком короткое сообщение", "Опишите вопрос подробнее");
      return;
    }
    setSending(true);
    await new Promise((r) => setTimeout(r, 800));
    setSending(false);
    setMessage("");
    toast.success(
      "Обращение отправлено",
      tier ? "Приоритетная очередь — ответим в течение 10 минут" : "Ответим в течение часа",
    );
  };

  return (
    <Card className="not-prose p-5 sm:p-6">
      {hydrated && tier && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5">
          <PartnerBadge tier={tier} size="xs" />
          <span className="text-[12.5px] text-slate-400">
            Ваши обращения обрабатываются в приоритетной очереди
          </span>
        </div>
      )}

      <Field label="Тема обращения" className="mb-4">
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={`rounded-xl border px-3 py-2 text-[12.5px] font-medium transition ${
                topic === t
                  ? "border-zev-400/60 bg-zev-500/[0.14] text-white"
                  : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Field>

      <Field label="E-mail для ответа" className="mb-4">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </Field>

      <Field label="Сообщение" className="mb-5">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Опишите вопрос — чем подробнее, тем быстрее решим."
          className="w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-zev-400/70"
        />
      </Field>

      <Button
        size="lg"
        fullWidth
        loading={sending}
        onClick={submit}
        iconLeft={<Send size={15} />}
      >
        Отправить обращение
      </Button>
    </Card>
  );
}
