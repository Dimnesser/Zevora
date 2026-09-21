"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check, Clock, ShieldCheck } from "lucide-react";
import { ApiRequestError, api, type PaymentOrder } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMinor } from "@/lib/format";
import { toast } from "@/lib/store/useToast";

/** Kept in step with the panel that opened the order. */
const POLL_MS = 2500;

/**
 * Checkout for the bundled test provider.
 *
 * The page never sees card details and never could: the balance is moved
 * by the settlement path, not by this form. With a real acquirer the
 * customer lands on the acquirer's own page instead, and this one is
 * unreachable.
 */
export function PayView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { refresh } = useSession();
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The static export prerenders one shell, so the id comes from the
  // address bar rather than from the route params it was built with.
  const id =
    typeof window !== "undefined"
      ? (window.location.pathname.split("/").filter(Boolean).pop() ?? params.id)
      : params.id;

  const load = useCallback(async () => {
    try {
      const res = await api.order(id);
      setOrder(res.order);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Заказ не найден");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!order || order.status !== "pending") return;
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [order, load]);

  const settle = async (outcome: "paid" | "failed") => {
    setBusy(true);
    try {
      const res = await api.simulatePayment(id, outcome);
      setOrder(res.order);
      if (res.order.status === "paid") {
        await refresh();
        toast.success("Баланс пополнен", formatMinor(res.order.credited_minor));
        router.push("/wallet");
      }
    } catch (err) {
      toast.error(
        "Не удалось завершить платёж",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <Card strong className="p-6 text-center">
        <AlertTriangle size={22} className="mx-auto text-danger" />
        <h1 className="mt-3 font-display text-[19px] font-bold text-white">
          Счёт недоступен
        </h1>
        <p className="mt-1.5 text-[13px] text-slate-500">{error}</p>
        <Link href="/wallet" className="mt-5 inline-block">
          <Button variant="secondary">К пополнению</Button>
        </Link>
      </Card>
    );
  }

  if (!order) return <Skeleton className="h-[340px] w-full rounded-lg" />;

  const total = order.amount_minor + order.bonus_minor;
  const settled = order.status !== "pending";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card strong className="overflow-hidden p-0">
        <div className="border-b border-line-soft px-6 py-4">
          <p className="meta">Оплата счёта</p>
          <p className="mt-1 font-mono text-[13px] text-slate-400">{order.id}</p>
        </div>

        <div className="px-6 py-6 text-center">
          <p className="meta">К оплате</p>
          <p className="mt-1 font-display text-[38px] font-bold leading-none tnum text-white">
            {formatMinor(order.amount_minor)}
          </p>
          {order.bonus_minor > 0 && (
            <p className="mt-2 text-[12.5px] text-success">
              + бонус {formatMinor(order.bonus_minor)} — на баланс поступит{" "}
              {formatMinor(total)}
            </p>
          )}

          <div className="mt-6">
            {order.status === "paid" ? (
              <Status
                tone="#2FD98A"
                icon={<Check size={20} />}
                title="Платёж подтверждён"
                note={`Зачислено ${formatMinor(order.credited_minor)}`}
              />
            ) : order.status === "pending" ? (
              <Status
                tone="#6E71FF"
                icon={<Clock size={20} />}
                title="Ожидает оплаты"
                note="Баланс изменится только после подтверждения провайдера"
              />
            ) : (
              <Status
                tone="#FF3B6B"
                icon={<AlertTriangle size={20} />}
                title={order.status === "expired" ? "Срок счёта истёк" : "Платёж не прошёл"}
                note={order.failure_reason ?? undefined}
              />
            )}
          </div>

          {order.simulated && !settled && (
            <div className="mt-6">
              <div className="flex gap-2">
                <Button
                  variant="accent"
                  size="lg"
                  fullWidth
                  loading={busy}
                  onClick={() => void settle("paid")}
                >
                  Подтвердить оплату
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  disabled={busy}
                  onClick={() => void settle("failed")}
                >
                  Отклонить
                </Button>
              </div>
              <p className="mt-3 flex items-start gap-2 text-left text-[11.5px] leading-relaxed text-slate-600">
                <ShieldCheck size={13} className="mt-0.5 shrink-0 text-gold-400" />
                Подключён тестовый провайдер: настоящие деньги не списываются.
                Кнопки отправляют такой же подписанный вебхук, какой пришёл бы
                от банка, и он проходит ту же проверку подписи.
              </p>
            </div>
          )}

          {settled && (
            <Link href="/wallet" className="mt-6 inline-block">
              <Button variant="secondary">Вернуться к балансу</Button>
            </Link>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function Status({
  tone,
  icon,
  title,
  note,
}: {
  tone: string;
  icon: React.ReactNode;
  title: string;
  note?: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-sm border px-4 py-3 text-left"
      style={{ borderColor: `${tone}40`, background: `${tone}12` }}
    >
      <span className="shrink-0" style={{ color: tone }}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold" style={{ color: tone }}>
          {title}
        </span>
        {note && <span className="block text-[11.5px] text-slate-500">{note}</span>}
      </span>
    </div>
  );
}
