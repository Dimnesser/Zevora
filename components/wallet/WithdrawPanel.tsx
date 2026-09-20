"use client";

import { useMemo, useState } from "react";
import { Send, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ApiRequestError, api } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { useSession } from "@/lib/client/session";
import { SkinImage } from "@/components/art/SkinImage";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Modal";
import { formatMinor } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { cn } from "@/lib/utils";

/** Mirrors the server-side pattern so the field validates before submit. */
const TRADE_URL_RE =
  /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[\w-]+$/;

export function WithdrawPanel() {
  const { user } = useSession();
  const [selected, setSelected] = useState<number[]>([]);
  const [tradeUrl, setTradeUrl] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data, reload } = useResource(
    () => (user ? api.inventory({ sort: "price-desc" }) : Promise.resolve(null)),
    [user?.id],
  );

  const all = data?.items ?? [];
  const available = useMemo(() => all.filter((i) => i.status === "owned"), [all]);
  const pending = useMemo(() => all.filter((i) => i.status === "withdrawing"), [all]);

  const total = available
    .filter((i) => selected.includes(i.id))
    .reduce((s, i) => s + i.price_minor, 0);

  const urlValid = TRADE_URL_RE.test(tradeUrl.trim());

  const submit = async () => {
    setBusy(true);
    try {
      const res = await api.withdraw(selected, tradeUrl.trim());
      toast.success(
        `Заявка на ${res.queued} предм. создана`,
        "Предметы поступят в Steam в течение 5 минут",
      );
      setSelected([]);
      reload();
    } catch (err) {
      toast.error(
        "Не удалось создать заявку",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    } finally {
      setBusy(false);
    }
  };

  if (available.length === 0 && pending.length === 0) {
    return (
      <EmptyState
        icon={<Send size={22} />}
        title="Нечего выводить"
        description="Откройте кейс, чтобы получить предметы, доступные к выводу."
        action={
          <Link href="/cases">
            <Button>Открыть кейсы</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Field
        label="Ссылка на обмен Steam"
        hint="Найдите её в настройках приватности Steam → «Обмен»."
      >
        <Input
          value={tradeUrl}
          onChange={(e) => setTradeUrl(e.target.value)}
          placeholder="https://steamcommunity.com/tradeoffer/new/?partner=123&token=abc"
          invalid={tradeUrl.length > 0 && !urlValid}
        />
      </Field>

      {pending.length > 0 && (
        <div className="rounded-2xl border border-aqua-400/25 bg-aqua-400/[0.07] px-4 py-3">
          <p className="text-[13px] font-semibold text-aqua-300">
            В обработке: {pending.length} предм.
          </p>
          <p className="mt-0.5 text-[12px] text-slate-400">
            Обмен придёт на указанную ссылку. Среднее время — 5 минут.
          </p>
        </div>
      )}

      {available.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[12.5px] font-medium text-slate-400">Доступно к выводу</p>
            <button
              onClick={() =>
                setSelected(
                  selected.length === available.length ? [] : available.map((i) => i.id),
                )
              }
              className="text-[12px] text-zev-300 transition hover:text-white"
            >
              {selected.length === available.length ? "Снять всё" : "Выбрать всё"}
            </button>
          </div>

          <div className="no-scrollbar max-h-[380px] space-y-2 overflow-y-auto pr-0.5">
            {available.map((item) => {
              const active = selected.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() =>
                    setSelected((p) =>
                      p.includes(item.id) ? p.filter((x) => x !== item.id) : [...p, item.id],
                    )
                  }
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                    active ? "bg-white/[0.07]" : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05]",
                  )}
                  style={{ borderColor: active ? item.rarity.color : undefined }}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      active ? "border-transparent" : "border-white/20",
                    )}
                    style={{ background: active ? item.rarity.color : undefined }}
                  >
                    {active && (
                      <svg viewBox="0 0 12 12" className="h-3 w-3 text-void">
                        <path
                          d="M2 6.5 L4.8 9 L10 3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>

                  <span className="h-8 w-14 shrink-0">
                    <SkinImage
                      imageUrl={item.image_url}
                      art={item.art}
                      label={item.market_name}
                      glow={false}
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-white">
                      {item.market_name}
                    </span>
                    <span className="block text-[11.5px] text-slate-500">
                      {item.wear}
                      {item.stattrak && " · StatTrak™"}
                    </span>
                  </span>

                  <span className="shrink-0 text-[13px] font-bold tabular-nums text-white">
                    {formatMinor(item.price_minor)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-slate-400">Выбрано {selected.length} предм.</span>
          <span className="text-[16px] font-bold tabular-nums text-white">
            {formatMinor(total)}
          </span>
        </div>
      </div>

      <Button
        size="xl"
        fullWidth
        disabled={selected.length === 0 || !urlValid}
        loading={busy}
        onClick={() => setConfirm(true)}
        iconLeft={<Send size={16} />}
      >
        {!urlValid && tradeUrl.length === 0
          ? "Укажите ссылку на обмен"
          : `Вывести ${selected.length} предм.`}
      </Button>

      <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-slate-600">
        <ShieldCheck size={13} className="mt-0.5 shrink-0" />
        Убедитесь, что инвентарь Steam открыт и на аккаунте нет торгового
        ограничения — иначе обмен не пройдёт.
      </p>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => void submit()}
        title="Подтвердите вывод"
        description={`${selected.length} предм. на сумму ${formatMinor(total)} будут отправлены на указанную ссылку обмена.`}
        confirmLabel="Вывести"
      />
    </div>
  );
}
