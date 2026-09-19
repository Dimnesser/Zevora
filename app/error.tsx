"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-2xl font-bold">Что-то пошло не так</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-slate-400">
        Произошла ошибка при загрузке раздела. Попробуйте обновить страницу.
      </p>
      <Button className="mt-6" onClick={reset} iconLeft={<RotateCw size={15} />}>
        Повторить
      </Button>
    </div>
  );
}
