"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { ApiRequestError, api, type CaseSummary } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { CaseEditor } from "@/components/admin/CaseEditor";
import { CaseImage } from "@/components/art/CaseImage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMinor } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { cn } from "@/lib/utils";

/**
 * Case management.
 *
 * Creating a case takes a name and a price; items are added from the
 * editor. Nothing here requires touching source code.
 */
export function CasesAdmin() {
  const { data, loading, reload } = useResource(() => api.admin.cases(), []);
  const [selected, setSelected] = useState<CaseSummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  const cases = (data?.cases ?? []).filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  if (selected) {
    return (
      <CaseEditor
        caseId={selected.id}
        onBack={() => {
          setSelected(null);
          reload();
        }}
      />
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск кейса"
          iconLeft={<Search size={15} />}
          className="sm:max-w-xs"
          aria-label="Поиск кейса"
        />
        <Button
          className="sm:ml-auto"
          iconLeft={<Plus size={16} />}
          onClick={() => setCreating(true)}
        >
          Создать кейс
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[132px]" />
          ))}
        </div>
      ) : cases.length === 0 ? (
        <EmptyState
          title="Кейсов нет"
          description="Создайте первый кейс — он появится на сайте сразу после добавления предметов."
          action={<Button onClick={() => setCreating(true)}>Создать кейс</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((kase) => (
            <button
              key={kase.id}
              onClick={() => setSelected(kase)}
              className="glass group flex items-center gap-4 p-4 text-left transition hover:border-white/20"
            >
              <span className="h-16 w-16 shrink-0">
                <CaseImage imageUrl={kase.image_url} art={kase.art} label={kase.name} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-semibold text-white">
                    {kase.name}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                      kase.is_active
                        ? "bg-success/15 text-success"
                        : "bg-danger/15 text-danger",
                    )}
                  >
                    {kase.is_active ? "вкл" : "выкл"}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-slate-500">
                  {kase.item_count ?? 0} предм. ·{" "}
                  {kase.price_minor === 0 ? "бесплатно" : formatMinor(kase.price_minor)}
                </span>
                {kase.partner_only && (
                  <span className="mt-1 inline-block rounded bg-gold-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gold-300">
                    партнёрский
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      <CreateCaseModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(created) => {
          setCreating(false);
          reload();
          setSelected(created);
        }}
      />
    </>
  );
}

function CreateCaseModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (kase: CaseSummary) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState(500);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const { case: created } = await api.admin.createCase({
        name: name.trim(),
        description: description.trim(),
        price_minor: Math.round(price * 100),
      });
      toast.success("Кейс создан", "Добавьте предметы, чтобы он заработал");
      setName("");
      setDescription("");
      setPrice(500);
      onCreated(created);
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
    <Modal open={open} onClose={onClose} title="Новый кейс" size="sm">
      <div className="space-y-4">
        <Field label="Название">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Revolution Case"
            autoFocus
          />
        </Field>
        <Field label="Цена" hint="0 — бесплатный кейс">
          <Input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
            suffix="₽"
          />
        </Field>
        <Field label="Описание">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Короткое описание для карточки"
          />
        </Field>
        <Button
          fullWidth
          size="lg"
          disabled={name.trim().length < 2}
          loading={busy}
          onClick={() => void submit()}
        >
          Создать и перейти к предметам
        </Button>
      </div>
    </Modal>
  );
}
