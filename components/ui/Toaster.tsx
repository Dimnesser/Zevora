"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, Sparkles, X, XCircle } from "lucide-react";
import { useToastStore, type ToastVariant } from "@/lib/store/useToast";
import { cn } from "@/lib/utils";

const ICONS: Record<ToastVariant, typeof Info> = {
  default: Info,
  success: CheckCircle2,
  error: XCircle,
  rare: Sparkles,
};

const ACCENT: Record<ToastVariant, string> = {
  default: "#6E71FF",
  success: "#2FD98A",
  error: "#FF4D5E",
  rare: "#F5B841",
};

/** Global toast outlet. Mounted once in the root layout. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[72px] z-[120] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-5 sm:top-20 sm:items-end">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICONS[t.variant];
          const accent = ACCENT[t.variant];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="glass-strong pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl px-4 py-3"
              style={{ borderColor: `${accent}40` }}
            >
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${accent}22`, color: accent }}
              >
                <Icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold leading-tight text-white">
                  {t.title}
                </p>
                {t.description && (
                  <p className="mt-0.5 text-[12.5px] leading-snug text-slate-400">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Закрыть уведомление"
                className={cn(
                  "-mr-1 rounded-md p-1 text-slate-500 transition",
                  "hover:bg-white/10 hover:text-white",
                )}
              >
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
