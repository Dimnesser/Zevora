import Link from "next/link";
import { ZevoraLogo } from "@/components/art/ZevoraLogo";

const COLUMNS = [
  {
    title: "Платформа",
    links: [
      { href: "/cases", label: "Кейсы" },
      { href: "/upgrade", label: "Апгрейд" },
      { href: "/shop", label: "Магазин" },
      { href: "/leaderboard", label: "Рейтинг" },
      { href: "/history", label: "История" },
    ],
  },
  {
    title: "Аккаунт",
    links: [
      { href: "/profile", label: "Профиль" },
      { href: "/inventory", label: "Инвентарь" },
      { href: "/wallet", label: "Баланс" },
      { href: "/bonuses", label: "Бонусы" },
    ],
  },
  {
    title: "Zevora",
    links: [
      { href: "/partners", label: "Partners" },
      { href: "/fair", label: "Честная игра" },
      { href: "/terms", label: "Условия" },
      { href: "/support", label: "Поддержка" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-white/[0.07] bg-abyss/60">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <ZevoraLogo />
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-slate-500">
              Игровая платформа для открытия кейсов CS2, апгрейда предметов и
              вывода скинов. Прозрачные шансы, быстрый вывод, честная механика.
            </p>
            <p className="mt-5 text-[11.5px] leading-relaxed text-slate-600">
              18+. Демонстрационная версия: балансы и предметы виртуальные.
              Zevora не связана с Valve Corporation.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[13.5px] text-slate-500 transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.06] pt-6 text-[12.5px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Zevora. Все права защищены.</span>
          <span className="font-mono text-[11.5px] uppercase tracking-wider">
            Provably fair · v1.0
          </span>
        </div>
      </div>
    </footer>
  );
}
