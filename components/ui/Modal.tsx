"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  /** Hides the close button and ignores backdrop clicks (used mid-animation). */
  locked?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZES = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export function Modal({
  open,
  onClose,
  children,
  title,
  description,
  className,
  locked = false,
  size = "md",
}: ModalProps) {
  // Lock body scroll and wire up Escape while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !locked) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, locked, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-void/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={locked ? undefined : onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              "glass-strong relative z-10 flex max-h-[92vh] w-full flex-col",
              "rounded-t-3xl sm:rounded-3xl",
              SIZES[size],
              className,
            )}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            {/* mobile grab handle */}
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/15 sm:hidden" />

            {(title || !locked) && (
              <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-4 sm:px-7 sm:pt-6">
                <div className="min-w-0">
                  {title && (
                    <h2 className="font-display text-lg font-bold text-white sm:text-xl">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-1 text-[13px] text-slate-400">{description}</p>
                  )}
                </div>
                {!locked && (
                  <button
                    onClick={onClose}
                    aria-label="Закрыть"
                    className="-mr-1 -mt-1 rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4.5 w-4.5" size={18} />
                  </button>
                )}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 sm:px-7">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Small confirm dialog — used before destructive actions. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      {description && (
        <div className="text-sm leading-relaxed text-slate-300">{description}</div>
      )}
      <div className="mt-6 flex gap-3">
        <button
          onClick={onClose}
          className="h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.06] text-sm font-medium text-white transition hover:bg-white/[0.12]"
        >
          {cancelLabel}
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={cn(
            "h-11 flex-1 rounded-xl text-sm font-semibold text-white transition",
            danger
              ? "bg-danger/90 hover:bg-danger"
              : "bg-[linear-gradient(120deg,#5B4BFF,#7C5CFF)] hover:brightness-110",
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
