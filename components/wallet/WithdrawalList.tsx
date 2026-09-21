"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { CheckCircle2, Clock, Send, X, XCircle } from "lucide-react";
import { ApiRequestError, api, type Withdrawal, type WithdrawalStatus } from "@/lib/client/api";
import { Button } from "@/components/ui/Button";
import { formatDateTime, formatMinor } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { cn } from "@/lib/utils";

const LOOK: Record<
  WithdrawalStatus,
  { label: string; tone: string; icon: typeof Clock; note: string }
> = {
  pending: {
    label: "Ожидает отправки",
    tone: "#F5B841",
    icon: Clock,
    note: "Предметы удержаны. Пока обмен не отправлен, заявку можно отменить.",
  },
  sent: {
    label: "Обмен отправлен",
    tone: "#22D3EE",
    icon: Send,
    note: "Примите обмен в Steam — он действует 30 минут.",
  },
  completed: {
    label: "Выведено",
    tone: "#2FD98A",
    icon: CheckCircle2,
    note: "Предметы ушли в ваш инвентарь Steam.",
  },
  rejected: {
    label: "Отклонена",
    tone: "#FF3B6B",
    icon: XCircle,
    note: "Предметы вернулись в инвентарь Zevora.",
  },
  cancelled: {
    label: "Отменена",
    tone: "#8B95AE",
    icon: X,
    note: "Предметы вернулись в инвентарь Zevora.",
  },
};

/**
 * The player's side of a withdrawal.
 *
 * Before this existed, a request was invisible once made: the items were
 * simply gone from the inventory with no record of where. Every state the
 * request can be in is now on screen, and the one state the player can
 * still act on carries the button to act.
 */
export function WithdrawalList({
  withdrawals,
  onChange,
}: {
  withdrawals: Withdrawal[];
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  if (withdrawals.length === 0) return null;

  const cancel = async (id: string) => {
    setBusy(id);
    try {
      await api.cancelWithdrawal(id);
      toast.success("Заявка отменена", "Предметы вернулись в инвентарь");
      onChange();
    } catch (err) {
      toast.error(
        "Не удалось отменить",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <p className="meta mb-2.5">Мои заявки</p>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {withdrawals.map((w) => {
            const look = LOOK[w.status];
            const Icon = look.icon;
            return (
              <motion.div
                key={w.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-sm border border-line-soft bg-white/[0.02] px-3.5 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Icon size={14} style={{ color: look.tone }} />
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: look.tone }}
                    >
                      {look.label}
                    </span>
                    <span className="meta">
                      {w.item_count} предм. · {formatMinor(w.value_minor)}
                    </span>
                  </span>
                  <span className="meta text-slate-600">
                    {formatDateTime(w.created_at)}
                  </span>
                </div>

                <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-500">
                  {w.note ?? look.note}
                </p>

                {w.items && w.items.length > 0 && (
                  <p className="mt-1.5 truncate text-[11.5px] text-slate-600">
                    {w.items.map((i) => i.market_name).join(" · ")}
                  </p>
                )}

                {w.status === "pending" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn("mt-2 px-0 text-danger hover:text-danger")}
                    loading={busy === w.id}
                    onClick={() => void cancel(w.id)}
                  >
                    Отменить заявку
                  </Button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
