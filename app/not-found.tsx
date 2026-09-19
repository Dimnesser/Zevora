import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ZevoraLogo } from "@/components/art/ZevoraLogo";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <ZevoraLogo markOnly className="mb-8 scale-150" />
      <p className="font-display text-[80px] font-bold leading-none text-white/10">
        404
      </p>
      <h1 className="-mt-6 font-display text-2xl font-bold">Страница не найдена</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-slate-400">
        Возможно, кейс был снят с продажи или ссылка устарела.
      </p>
      <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
        <Link href="/">
          <Button>На главную</Button>
        </Link>
        <Link href="/cases">
          <Button variant="secondary">Открыть кейсы</Button>
        </Link>
      </div>
    </div>
  );
}
