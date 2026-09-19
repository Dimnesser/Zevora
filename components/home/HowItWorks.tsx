"use client";

import { motion } from "framer-motion";
import { Backpack, Package, TrendingUp, Wallet } from "lucide-react";
import { SectionHeader } from "@/components/ui/Section";

const STEPS = [
  {
    icon: Wallet,
    title: "Пополни баланс",
    text: "Картой, СБП или криптой. Зачисление мгновенное, минимальная сумма — 100 ₽.",
    color: "#6E71FF",
  },
  {
    icon: Package,
    title: "Открой кейс",
    text: "Выбери кейс под свой бюджет. Шансы каждого предмета видны до открытия.",
    color: "#22D3EE",
  },
  {
    icon: TrendingUp,
    title: "Улучши предмет",
    text: "Поставь дроп на апгрейд и попробуй получить предмет дороже в несколько раз.",
    color: "#A855F7",
  },
  {
    icon: Backpack,
    title: "Продай или выведи",
    text: "Продай предмет по рыночной цене в один клик или выведи его в инвентарь Steam.",
    color: "#F5B841",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <SectionHeader
        eyebrow="Как это работает"
        title="Четыре шага до нужного скина"
        description="Никаких скрытых условий: цена кейса, шанс каждого предмета и сумма выплаты видны заранее."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: i * 0.07 }}
            className="glass group relative p-5"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40"
              style={{ background: step.color }}
            />
            <div className="flex items-center justify-between">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl border"
                style={{
                  color: step.color,
                  borderColor: `${step.color}40`,
                  background: `${step.color}14`,
                }}
              >
                <step.icon size={19} />
              </span>
              <span className="font-display text-[34px] font-bold leading-none text-white/[0.07]">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-white">
              {step.title}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-400">
              {step.text}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
