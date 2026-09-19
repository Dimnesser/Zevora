"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Crown, Lock, MessageCircle, ShieldCheck, Users } from "lucide-react";
import { PerksGrid } from "@/components/partners/PerksGrid";
import { TiersSection } from "@/components/partners/TiersSection";
import { SectionHeader } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const CRITERIA = [
  {
    icon: Users,
    title: "Аудитория",
    text: "Стрим, канал, сообщество или турнирная команда с живой аудиторией по CS2.",
  },
  {
    icon: ShieldCheck,
    title: "Репутация",
    text: "Прозрачная история, отсутствие мультиаккаунтов и накрутки рефералов.",
  },
  {
    icon: MessageCircle,
    title: "Личный контакт",
    text: "Приглашение приходит от владельца Zevora напрямую. Заявок и покупки статуса нет.",
  },
];

const FAQ = [
  {
    q: "Можно ли купить партнёрку?",
    a: "Нет. Статус не продаётся и не выдаётся за депозиты. Единственный способ получить его — приглашение от владельца Zevora через админ-панель.",
  },
  {
    q: "Повышается ли уровень автоматически?",
    a: "Нет. Partner, Creator, Elite Partner и Zevora Ambassador назначаются вручную. Автоматического роста по обороту не существует.",
  },
  {
    q: "Что происходит при снятии статуса?",
    a: "Партнёрские кейсы, бейдж и повышенные бонусы отключаются. Заработанные ранее предметы и баланс остаются у вас.",
  },
  {
    q: "Сколько партнёров в программе?",
    a: "Число ограничено. Клуб растёт медленно: нам важнее качество, чем количество участников.",
  },
];

/** Public-facing page for users who are not partners. */
export function PartnersIntro() {
  return (
    <>
      {/* ───────── hero ───────── */}
      <section className="relative overflow-hidden rounded-3xl border border-gold-400/20 px-5 py-14 sm:px-10 sm:py-20">
        <span
          aria-hidden
          className="bg-tech-grid pointer-events-none absolute inset-0 opacity-50"
          style={{
            maskImage:
              "radial-gradient(640px circle at 50% 0%, #000 10%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(640px circle at 50% 0%, #000 10%, transparent 75%)",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-140px] h-[320px] w-[680px] -translate-x-1/2 rounded-full opacity-25 blur-[110px]"
          style={{
            background:
              "conic-gradient(from 200deg, #F5B841, #A855F7, #22D3EE, #F5B841)",
          }}
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-gold-300"
          >
            <Lock size={12} />
            Закрытая программа
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.06 }}
            className="mt-6 font-display text-[38px] font-bold leading-[1.05] sm:text-[58px]"
          >
            <span className="text-white">Zevora </span>
            <span className="text-gradient-brand">Partners</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.14 }}
            className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-slate-400 sm:text-base"
          >
            Закрытая программа для людей, которые развивают Zevora вместе с
            нами.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
            className="mt-8 flex flex-col items-center gap-3"
          >
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur">
              <Crown size={16} className="shrink-0 text-gold-300" />
              <p className="text-left text-[13px] leading-snug text-slate-300">
                Статус выдаётся <strong className="text-white">только вручную</strong>{" "}
                владельцем Zevora. Его нельзя купить или получить при
                регистрации.
              </p>
            </div>
            <Link href="/support">
              <Button variant="secondary">Связаться с командой</Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ───────── perks ───────── */}
      <section className="mt-16">
        <SectionHeader
          eyebrow="Привилегии"
          title="Что даёт партнёрка"
          description="Набор привилегий настраивается индивидуально — владелец может включить или отключить любую из них для конкретного партнёра."
        />
        <PerksGrid />
      </section>

      {/* ───────── tiers ───────── */}
      <section className="mt-16">
        <SectionHeader
          eyebrow="Уровни"
          title="Четыре ступени клуба"
          description="Каждый уровень расширяет доступ. Повышение происходит только по решению владельца."
        />
        <TiersSection />
      </section>

      {/* ───────── criteria ───────── */}
      <section className="mt-16">
        <SectionHeader
          eyebrow="Отбор"
          title="Кого мы приглашаем"
          description="Формальной заявки нет — мы находим партнёров сами и пишем первыми."
        />
        <div className="grid gap-3 lg:grid-cols-3">
          {CRITERIA.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Card className="h-full p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-400/25 bg-gold-400/10 text-gold-300">
                  <c.icon size={18} />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-white">
                  {c.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-400">
                  {c.text}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ───────── faq ───────── */}
      <section className="mt-16">
        <SectionHeader eyebrow="Вопросы" title="Частые вопросы" />
        <div className="grid gap-3 lg:grid-cols-2">
          {FAQ.map((item) => (
            <Card key={item.q} className="p-5">
              <h3 className="text-[14.5px] font-semibold text-white">{item.q}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-400">
                {item.a}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
