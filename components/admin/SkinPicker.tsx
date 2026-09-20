"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { api, type AdminSkin } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { SkinImage } from "@/components/art/SkinImage";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMinor } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Skin picker for the case editor.
 *
 * The default weight comes from the skin's rarity, so a Covert lands with
 * a sensible rarity out of the box instead of an arbitrary number.
 */
export function SkinPicker({
  excludeSkinIds,
  onPick,
}: {
  excludeSkinIds: number[];
  onPick: (skin: AdminSkin, weight: number) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminSkin | null>(null);
  const [weight, setWeight] = useState(1000);
  const [busy, setBusy] = useState(false);

  const { data, loading } = useResource(() => api.admin.skins(query), [query]);
  const skins = (data?.skins ?? []).filter((s) => !excludeSkinIds.includes(s.id));

  const pick = (skin: AdminSkin) => {
    setSelected(skin);
    setWeight(skin.default_weight);
  };

  const confirm = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await onPick(selected, weight);
      setSelected(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск по названию, например AWP"
        iconLeft={<Search size={15} />}
        aria-label="Поиск скина"
        autoFocus
      />

      {loading ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[62px]" />
          ))}
        </div>
      ) : skins.length === 0 ? (
        <EmptyState
          title="Скины не найдены"
          description="Измените запрос — возможно, все подходящие скины уже в кейсе."
          className="py-8"
        />
      ) : (
        <div className="no-scrollbar grid max-h-[360px] gap-2 overflow-y-auto sm:grid-cols-2">
          {skins.map((skin) => (
            <button
              key={skin.id}
              onClick={() => pick(skin)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                selected?.id === skin.id
                  ? "bg-white/[0.08]"
                  : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05]",
              )}
              style={{ borderColor: selected?.id === skin.id ? skin.rarity_color : undefined }}
            >
              <span
                className="h-8 w-14 shrink-0 rounded-lg"
                style={{ background: `${skin.rarity_color}14` }}
              >
                <SkinImage
                  imageUrl={skin.image_url}
                  art={{
                    kind: skin.art_kind,
                    pattern: skin.art_pattern,
                    color_a: skin.art_color_a,
                    color_b: skin.art_color_b,
                  }}
                  label={skin.market_name}
                  glow={false}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-white">
                  {skin.market_name}
                </span>
                <span
                  className="block truncate text-[11px]"
                  style={{ color: skin.rarity_color }}
                >
                  {skin.rarity_name} · {formatMinor(skin.base_price_minor)}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="rounded-2xl border border-white/[0.09] bg-white/[0.03] p-4">
          <p className="mb-3 text-[13px] font-semibold text-white">{selected.market_name}</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1.5 block text-[12px] text-slate-400">
                Вес (целое число тикетов)
              </label>
              <Input
                type="number"
                min={1}
                value={weight}
                onChange={(e) => setWeight(Math.max(1, Math.floor(Number(e.target.value))))}
              />
            </div>
            <div className="flex items-end">
              <Button loading={busy} onClick={() => void confirm()}>
                Добавить
              </Button>
            </div>
          </div>
          <p className="mt-2 text-[11.5px] text-slate-500">
            Чем больше вес, тем чаще предмет выпадает. Рекомендация для редкости{" "}
            {selected.rarity_name}: {selected.default_weight.toLocaleString("ru-RU")}.
          </p>
        </div>
      )}
    </div>
  );
}
