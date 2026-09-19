"use client";

import { motion } from "framer-motion";

const STATS = [
  { value: "1.2M", label: "открытых кейсов" },
  { value: "48", label: "предметов в каталоге" },
  { value: "5 мин", label: "средний вывод" },
  { value: "24/7", label: "поддержка" },
];

export function Stats() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
      <div className="glass grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/[0.05] lg:grid-cols-4">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="bg-surface/60 px-5 py-6 text-center lg:py-7"
          >
            <p className="font-display text-2xl font-bold text-white lg:text-[30px]">
              {s.value}
            </p>
            <p className="mt-1 text-[12px] uppercase tracking-wider text-slate-500">
              {s.label}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
