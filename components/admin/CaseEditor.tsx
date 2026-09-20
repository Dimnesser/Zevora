"use client";

import { useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Image as ImageIcon,
  Package,
  Plus,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import { ApiRequestError, api } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { CaseImage } from "@/components/art/CaseImage";
import { SkinImage } from "@/components/art/SkinImage";
import { CaseStats } from "@/components/admin/CaseStats";
import { SkinPicker } from "@/components/admin/SkinPicker";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { PageLoader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMinor, formatPercent } from "@/lib/format";
import { toast } from "@/lib/store/useToast";
import { cn } from "@/lib/utils";

type Tab = "general" | "items" | "stats";

const EMBLEMS = ["hex", "bolt", "orbit", "crown", "prism", "flame", "eye", "skull"];

/**
 * Full case editor: general settings, drop table and statistics.
 *
 * Weights are edited as raw integers and the resulting probability is
 * recomputed live, so the owner always sees the real odds they are about
 * to publish.
 */
export function CaseEditor({
  caseId,
  onBack,
}: {
  caseId: number;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<Tab>("general");
  const { data, loading, reload } = useResource(
    () => api.admin.caseDetail(caseId),
    [caseId],
  );

  if (loading || !data) return <PageLoader label="Загружаем кейс" />;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} iconLeft={<ArrowLeft size={15} />}>
          К списку
        </Button>
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-10 w-10 shrink-0">
            <CaseImage
              imageUrl={data.case.image_url}
              art={data.case.art}
              label={data.case.name}
            />
          </span>
          <h2 className="truncate text-[17px] font-bold text-white">{data.case.name}</h2>
        </div>
      </div>

      <Tabs
        items={[
          { id: "general", label: "Основное" },
          { id: "items", label: "Предметы", count: data.items.length },
          { id: "stats", label: "Статистика" },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-5 w-fit"
      />

      {tab === "general" && (
        <GeneralTab data={data} onSaved={reload} onDeleted={onBack} />
      )}
      {tab === "items" && <ItemsTab caseId={caseId} data={data} onChanged={reload} />}
      {tab === "stats" && <CaseStats caseId={caseId} />}
    </>
  );
}

type Detail = NonNullable<Awaited<ReturnType<typeof api.admin.caseDetail>>>;

function GeneralTab({
  data,
  onSaved,
  onDeleted,
}: {
  data: Detail;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const kase = data.case;
  const [name, setName] = useState(kase.name);
  const [description, setDescription] = useState(kase.description);
  const [price, setPrice] = useState(kase.price_minor / 100);
  const [imageUrl, setImageUrl] = useState(kase.image_url ?? "");
  const [emblem, setEmblem] = useState(kase.art.emblem);
  const [colorA, setColorA] = useState(kase.art.color_a);
  const [colorB, setColorB] = useState(kase.art.color_b);
  const [isActive, setIsActive] = useState(kase.is_active);
  const [partnerOnly, setPartnerOnly] = useState(kase.partner_only);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api.admin.updateCase(kase.id, {
        name: name.trim(),
        description: description.trim(),
        price_minor: Math.round(price * 100),
        image_url: imageUrl.trim() || null,
        art_emblem: emblem,
        art_color_a: colorA,
        art_color_b: colorB,
        is_active: isActive,
        partner_only: partnerOnly,
      });
      toast.success("Сохранено", "Изменения сразу видны на сайте");
      onSaved();
    } catch (err) {
      toast.error(
        "Не удалось сохранить",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (hard: boolean) => {
    try {
      const res = await api.admin.deleteCase(kase.id, hard);
      toast.success(res.deleted ? "Кейс удалён" : "Кейс архивирован");
      onDeleted();
    } catch (err) {
      toast.error(
        "Не удалось удалить",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Settings2 size={16} className="text-zev-300" />
          <h3 className="text-[15px] font-semibold text-white">Основные настройки</h3>
        </div>

        <div className="space-y-4">
          <Field label="Название">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Описание">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Цена" hint="0 — бесплатный кейс">
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
                suffix="₽"
              />
            </Field>
            <Field label="Slug" hint="Изменить нельзя — ссылка уже опубликована">
              <Input value={kase.slug} readOnly className="opacity-60" />
            </Field>
          </div>

          <Field
            label="Ссылка на изображение"
            hint="Оставьте пустым, чтобы использовать сгенерированный ящик"
          >
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              iconLeft={<ImageIcon size={15} />}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Цвет 1">
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colorA}
                  onChange={(e) => setColorA(e.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-xl border border-white/[0.09] bg-transparent"
                  aria-label="Основной цвет"
                />
                <Input value={colorA} onChange={(e) => setColorA(e.target.value)} />
              </div>
            </Field>
            <Field label="Цвет 2">
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colorB}
                  onChange={(e) => setColorB(e.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-xl border border-white/[0.09] bg-transparent"
                  aria-label="Дополнительный цвет"
                />
                <Input value={colorB} onChange={(e) => setColorB(e.target.value)} />
              </div>
            </Field>
          </div>

          <Field label="Эмблема">
            <div className="flex flex-wrap gap-2">
              {EMBLEMS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmblem(e)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-[12px] font-medium transition",
                    emblem === e
                      ? "border-zev-400/70 bg-zev-500/[0.15] text-white"
                      : "border-white/[0.08] text-slate-400 hover:text-white",
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </Field>

          <div className="flex flex-wrap gap-3">
            <Toggle label="Кейс активен" value={isActive} onChange={setIsActive} />
            <Toggle
              label="Только для партнёров"
              value={partnerOnly}
              onChange={setPartnerOnly}
            />
          </div>

          <div className="flex flex-wrap gap-2.5 border-t border-white/[0.07] pt-4">
            <Button loading={busy} onClick={() => void save()} iconLeft={<Save size={15} />}>
              Сохранить
            </Button>
            <Button variant="secondary" onClick={() => void remove(false)}>
              Архивировать
            </Button>
            <Button
              variant="danger"
              onClick={() => setConfirmDelete(true)}
              iconLeft={<Trash2 size={15} />}
            >
              Удалить
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="mb-4 text-[15px] font-semibold text-white">Предпросмотр</h3>
          <div className="mx-auto h-40 w-40">
            <CaseImage
              imageUrl={imageUrl.trim() || null}
              art={{ emblem, color_a: colorA, color_b: colorB }}
              label={name}
            />
          </div>
          <p className="mt-3 text-center text-[14px] font-semibold text-white">{name}</p>
          <p className="mt-0.5 text-center text-[12px] text-slate-500">{description}</p>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-[15px] font-semibold text-white">Экономика</h3>
          <dl className="space-y-2.5">
            <Row label="Предметов" value={String(data.items.length)} />
            <Row label="Сумма весов" value={data.total_weight.toLocaleString("ru-RU")} />
            <Row label="Средняя ценность" value={formatMinor(data.expected_value_minor)} />
            <Row
              label="Маржа"
              value={
                kase.price_minor > 0
                  ? formatPercent(1 - data.expected_value_minor / kase.price_minor, 1)
                  : "—"
              }
              accent={
                kase.price_minor > 0 && data.expected_value_minor > kase.price_minor
                  ? "#FF4D5E"
                  : "#2FD98A"
              }
            />
          </dl>
          {kase.price_minor > 0 && data.expected_value_minor > kase.price_minor && (
            <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[11.5px] text-danger">
              Средняя ценность выше цены — кейс работает в убыток.
            </p>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void remove(true)}
        title="Удалить кейс безвозвратно?"
        description="Если кейс уже открывали, удаление будет отклонено — история открытий ссылается на него. В этом случае используйте архивирование."
        confirmLabel="Удалить"
        danger
      />
    </div>
  );
}

function ItemsTab({
  caseId,
  data,
  onChanged,
}: {
  caseId: number;
  data: Detail;
  onChanged: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const total = data.total_weight || 1;

  const updateWeight = async (itemId: number, weight: number) => {
    if (!Number.isInteger(weight) || weight < 1) return;
    setBusyId(itemId);
    try {
      await api.admin.updateItem(caseId, itemId, { weight });
      onChanged();
    } catch (err) {
      toast.error(
        "Не удалось изменить вес",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (itemId: number) => {
    setBusyId(itemId);
    try {
      const res = await api.admin.deleteItem(caseId, itemId);
      toast.success("Предмет удалён");
      if (res.remaining === 0) {
        toast.error("Кейс выключен", "В кейсе не осталось предметов");
      }
      onChanged();
    } catch (err) {
      toast.error(
        "Не удалось удалить",
        err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-slate-400">
          Сумма весов: <span className="font-semibold text-white">{total.toLocaleString("ru-RU")}</span>{" "}
          · шанс предмета = вес / сумма
        </p>
        <Button iconLeft={<Plus size={16} />} onClick={() => setPicking(true)}>
          Добавить скин
        </Button>
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          icon={<Package size={22} />}
          title="В кейсе нет предметов"
          description="Пока кейс пуст, его нельзя открыть. Добавьте хотя бы один скин."
          action={<Button onClick={() => setPicking(true)}>Добавить скин</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,2fr)_120px_120px_110px_60px] gap-4 border-b border-white/[0.07] px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 lg:grid">
            <span>Предмет</span>
            <span className="text-right">Цена</span>
            <span className="text-right">Вес</span>
            <span className="text-right">Шанс</span>
            <span />
          </div>

          <ul className="divide-y divide-white/[0.04]">
            {data.items.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 lg:grid-cols-[minmax(0,2fr)_120px_120px_110px_60px] lg:gap-4 lg:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-9 w-[64px] shrink-0 rounded-lg"
                    style={{ background: `${item.rarity.color}14` }}
                  >
                    <SkinImage
                      imageUrl={item.image_url}
                      art={item.art}
                      label={item.market_name}
                      glow={false}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-white">
                      {item.market_name}
                    </p>
                    <p
                      className="truncate text-[11.5px]"
                      style={{ color: item.rarity.color }}
                    >
                      {item.rarity.name}
                    </p>
                  </div>
                </div>

                <span className="hidden text-right text-[13px] tabular-nums text-slate-400 lg:block">
                  {formatMinor(item.price_minor)}
                </span>

                <div className="hidden lg:block">
                  <input
                    type="number"
                    min={1}
                    defaultValue={item.weight}
                    disabled={busyId === item.id}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== item.weight) void updateWeight(item.id, v);
                    }}
                    className="h-9 w-full rounded-lg border border-white/[0.09] bg-white/[0.04] px-2 text-right text-[13px] tabular-nums text-white outline-none transition focus:border-zev-400/70"
                    aria-label={`Вес ${item.market_name}`}
                  />
                </div>

                <span
                  className="text-right text-[13px] font-semibold tabular-nums"
                  style={{ color: item.rarity.color }}
                >
                  {formatPercent(item.weight / total, item.weight / total < 0.01 ? 3 : 2)}
                </span>

                <div className="flex justify-end">
                  <button
                    onClick={() => void remove(item.id)}
                    disabled={busyId === item.id}
                    aria-label="Удалить из кейса"
                    className="rounded-lg border border-white/10 bg-white/[0.05] p-2 text-slate-400 transition hover:border-danger/40 hover:text-danger disabled:opacity-40"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        open={picking}
        onClose={() => setPicking(false)}
        title="Добавить скин в кейс"
        size="lg"
      >
        <SkinPicker
          excludeSkinIds={data.items.map((i) => i.skin_id)}
          onPick={async (skin, weight) => {
            try {
              await api.admin.addItem(caseId, { skin_id: skin.id, weight });
              toast.success("Скин добавлен", skin.market_name);
              onChanged();
            } catch (err) {
              toast.error(
                "Не удалось добавить",
                err instanceof ApiRequestError ? err.message : "Попробуйте ещё раз",
              );
            }
          }}
        />
      </Modal>
    </>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white transition hover:bg-white/[0.06]"
    >
      <span
        className={cn("h-4 w-7 shrink-0 rounded-full p-0.5 transition", !value && "bg-white/10")}
        style={{ background: value ? "#2FD98A" : undefined }}
      >
        <span
          className={cn(
            "block h-3 w-3 rounded-full bg-white transition-transform",
            value ? "translate-x-3" : "translate-x-0",
          )}
        />
      </span>
      {label}
    </button>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[12.5px] text-slate-400">{label}</dt>
      <dd
        className="text-[13px] font-semibold tabular-nums"
        style={{ color: accent ?? "#fff" }}
      >
        {value}
      </dd>
    </div>
  );
}
