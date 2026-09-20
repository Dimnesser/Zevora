"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ApiRequestError, api } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/lib/store/useToast";
import { cn } from "@/lib/utils";

const EFFECTS = ["none", "glow", "shine", "pulse", "aurora"];

/** Rarities are rows, so the owner can add their own scale. */
export function RaritiesAdmin() {
  const { data, loading, reload } = useResource(() => api.admin.rarities(), []);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-[12.5px] text-slate-400">
          Редкость задаёт цвет, эффект и вес по умолчанию при добавлении скина в кейс.
        </p>
        <Button iconLeft={<Plus size={16} />} onClick={() => setCreating(true)}>
          Новая редкость
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-[280px]" />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[40px_minmax(0,1fr)_120px_130px_110px_90px] gap-4 border-b border-white/[0.07] px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:grid">
            <span>#</span>
            <span>Название</span>
            <span>Цвет</span>
            <span className="text-right">Вес по умолч.</span>
            <span>Эффект</span>
            <span className="text-right">Скинов</span>
          </div>
          <ul className="divide-y divide-white/[0.04]">
            {(data?.rarities ?? []).map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[40px_minmax(0,1fr)_120px_130px_110px_90px] sm:gap-4 sm:px-5"
              >
                <span className="hidden text-[13px] tabular-nums text-slate-500 sm:block">
                  {r.sort_order}
                </span>
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ background: r.color, boxShadow: `0 0 8px ${r.color}` }}
                  />
                  <span className="truncate text-[13.5px] font-medium text-white">
                    {r.name}
                  </span>
                </div>
                <span className="hidden font-mono text-[12px] text-slate-400 sm:block">
                  {r.color}
                </span>
                <span className="hidden text-right text-[13px] tabular-nums text-slate-300 sm:block">
                  {r.default_weight.toLocaleString("ru-RU")}
                </span>
                <span className="hidden text-[12px] text-slate-500 sm:block">{r.effect}</span>
                <span className="text-right text-[13px] tabular-nums text-slate-400">
                  {r.skin_count ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <CreateRarityModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          reload();
        }}
      />
    </>
  );
}

function CreateRarityModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [color, setColor] = useState("#8847FF");
  const [weight, setWeight] = useState(1000);
  const [effect, setEffect] = useState("glow");
  const [order, setOrder] = useState(8);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.admin.createRarity({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        color,
        default_weight: weight,
        effect,
        sort_order: order,
      });
      toast.success("Редкость создана", name.trim());
      setName("");
      setSlug("");
      onCreated();
    } catch (err) {
      toast.error(
        "Не удалось создать",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Новая редкость" size="sm">
      <div className="space-y-4">
        <Field label="Название">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
            }}
            placeholder="Contraband"
          />
        </Field>
        <Field label="Slug" hint="Латиница, цифры и дефис">
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="contraband"
            className="font-mono"
          />
        </Field>
        <Field label="Цвет">
          <div className="flex gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-11 w-14 cursor-pointer rounded-xl border border-white/[0.09] bg-transparent"
              aria-label="Цвет редкости"
            />
            <Input value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Вес по умолчанию">
            <Input
              type="number"
              min={1}
              value={weight}
              onChange={(e) => setWeight(Math.max(1, Number(e.target.value)))}
            />
          </Field>
          <Field label="Порядок">
            <Input
              type="number"
              min={0}
              value={order}
              onChange={(e) => setOrder(Math.max(0, Number(e.target.value)))}
            />
          </Field>
        </div>
        <Field label="Эффект">
          <div className="flex flex-wrap gap-2">
            {EFFECTS.map((e) => (
              <button
                key={e}
                onClick={() => setEffect(e)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-[12px] transition",
                  effect === e
                    ? "border-zev-400/70 bg-zev-500/[0.15] text-white"
                    : "border-white/[0.08] text-slate-400 hover:text-white",
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </Field>
        <Button
          fullWidth
          size="lg"
          disabled={name.trim().length < 2 || slug.trim().length < 2}
          loading={busy}
          onClick={() => void submit()}
        >
          Создать
        </Button>
      </div>
    </Modal>
  );
}
