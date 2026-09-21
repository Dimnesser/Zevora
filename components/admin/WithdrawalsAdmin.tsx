"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Send, X } from "lucide-react";
import { ApiRequestError, api, type Withdrawal } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDateTime, formatMinor } from "@/lib/format";
import { toast } from "@/lib/store/useToast";

type Filter = "pending" | "sent" | "all";

type Row = Withdrawal & { username: string; trade_url: string };

const TONE: Record<string, string> = {
  pending: "#F5B841",
  sent: "#22D3EE",
  completed: "#2FD98A",
  rejected: "#FF3B6B",
  cancelled: "#8B95AE",
};

const LABEL: Record<string, string> = {
  pending: "Ожидает",
  sent: "Отправлено",
  completed: "Выведено",
  rejected: "Отклонена",
  cancelled: "Отменена",
};

/**
 * The operator's queue.
 *
 * A withdrawal needs a human: somebody sends the Steam offer and somebody
 * confirms it landed. This is where that happens — the trade link to copy,
 * the items being sent, and the three transitions that close the request.
 */
export function WithdrawalsAdmin() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [busy, setBusy] = useState<string | null>(null);

  const { data, loading, reload } = useResource(
    () => api.adminWithdrawals(filter),
    [filter],
  );

  const rows = (data?.withdrawals ?? []) as Row[];

  const move = async (id: string, status: string, note?: string) => {
    setBusy(id);
    try {
      await api.adminSetWithdrawal(id, status, note);
      toast.success("Заявка обновлена", LABEL[status] ?? status);
      reload();
    } catch (err) {
      toast.error(
        "Не удалось обновить",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    } finally {
      setBusy(null);
    }
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Буфер обмена недоступен", url);
    }
  };

  return (
    <div>
      <Tabs
        items={[
          { id: "pending", label: "Ожидают" },
          { id: "sent", label: "Отправлены" },
          { id: "all", label: "Все" },
        ]}
        value={filter}
        onChange={setFilter}
        className="mb-4 w-fit"
        size="sm"
      />

      {loading && !data ? (
        <Skeleton className="h-[240px] rounded-lg" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Send size={22} />}
          title="Заявок нет"
          description={
            filter === "pending"
              ? "Все заявки на вывод обработаны."
              : "В этой выборке пусто."
          }
          className="py-14"
        />
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {rows.map((w) => (
              <motion.div key={w.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="meta rounded-xs border px-1.5 py-1"
                          style={{
                            borderColor: `${TONE[w.status]}59`,
                            background: `${TONE[w.status]}14`,
                            color: TONE[w.status],
                          }}
                        >
                          {LABEL[w.status] ?? w.status}
                        </span>
                        <span className="text-[13.5px] font-semibold text-white">
                          {w.username}
                        </span>
                        <span className="meta">
                          {w.item_count} предм. · {formatMinor(w.value_minor)}
                        </span>
                        <span className="meta text-slate-600">
                          {formatDateTime(w.created_at)}
                        </span>
                      </div>

                      <p className="mt-1.5 truncate text-[11.5px] text-slate-500">
                        {(w.items ?? []).map((i) => `${i.market_name} (${i.wear})`).join(" · ")}
                      </p>

                      <button
                        type="button"
                        onClick={() => void copy(w.trade_url)}
                        className="meta mt-2 inline-flex items-center gap-1.5 text-zev-300 transition-colors hover:text-white"
                      >
                        <Copy size={11} /> Ссылка на обмен
                      </button>
                      {w.note && (
                        <p className="mt-1.5 text-[11.5px] text-slate-500">{w.note}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {w.status === "pending" && (
                        <Button
                          size="sm"
                          variant="accent"
                          loading={busy === w.id}
                          iconLeft={<Send size={13} />}
                          onClick={() => void move(w.id, "sent")}
                        >
                          Обмен отправлен
                        </Button>
                      )}
                      {w.status === "sent" && (
                        <Button
                          size="sm"
                          variant="accent"
                          loading={busy === w.id}
                          iconLeft={<Check size={13} />}
                          onClick={() => void move(w.id, "completed")}
                        >
                          Принят
                        </Button>
                      )}
                      {(w.status === "pending" || w.status === "sent") && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy === w.id}
                          iconLeft={<X size={13} />}
                          onClick={() =>
                            void move(w.id, "rejected", "Отклонена оператором")
                          }
                        >
                          Отклонить
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
