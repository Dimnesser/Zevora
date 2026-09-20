"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { CaseItem, InventoryItem } from "@/lib/client/api";
import { ItemCard } from "@/components/items/ItemCard";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMinor } from "@/lib/format";
import { RARITY_ORDER } from "@/lib/client/display";
import { cn } from "@/lib/utils";

const RARITY_LABEL: Record<string, string> = {
  consumer: "Consumer",
  industrial: "Industrial",
  milspec: "Mil-Spec",
  restricted: "Restricted",
  classified: "Classified",
  covert: "Covert",
  special: "Special",
};

/** Picker over the player's own items — the stake side. */
export function StakePicker({
  items,
  selected,
  onToggle,
  className,
}: {
  items: InventoryItem[];
  selected: number[];
  onToggle: (id: number) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => i.status === "owned")
      .filter((i) => !q || i.market_name.toLowerCase().includes(q))
      .sort((a, b) => b.price_minor - a.price_minor);
  }, [items, query]);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск по инвентарю"
        iconLeft={<Search size={15} />}
        className="mb-3"
        aria-label="Поиск по инвентарю"
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="Инвентарь пуст"
          description="Откройте кейс, чтобы получить предметы для апгрейда."
          className="py-10"
        />
      ) : (
        <div className="no-scrollbar grid max-h-[420px] grid-cols-2 gap-2.5 overflow-y-auto pr-0.5 lg:max-h-[520px]">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              skin={item}
              size="sm"
              selected={selected.includes(item.id)}
              onClick={() => onToggle(item.id)}
              meta={
                <span className="truncate text-[11.5px] text-slate-500">
                  {item.wear}
                </span>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Picker over the catalogue — the target side. */
export function TargetPicker({
  catalogue,
  stakeValue,
  selectedSkinId,
  onSelect,
  className,
}: {
  catalogue: CaseItem[];
  stakeValue: number;
  selectedSkinId: number | null;
  onSelect: (skin: CaseItem) => void;
  className?: string;
}) {
  const [rarity, setRarity] = useState<string>("all");
  const [query, setQuery] = useState("");

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalogue
      // A target must be worth more than the stake, or it is not an upgrade.
      .filter((s) => s.price_minor > stakeValue * 1.05)
      .filter((s) => rarity === "all" || s.rarity.slug === rarity)
      .filter((s) => !q || s.market_name.toLowerCase().includes(q))
      .sort((a, b) => a.price_minor - b.price_minor);
  }, [catalogue, stakeValue, rarity, query]);

  const present = useMemo(() => {
    const map = new Map<string, string>();
    catalogue.forEach((c) => map.set(c.rarity.slug, c.rarity.color));
    return RARITY_ORDER.filter((slug) => map.has(slug)).map((slug) => ({
      slug,
      color: map.get(slug)!,
    }));
  }, [catalogue]);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск предмета"
        iconLeft={<Search size={15} />}
        className="mb-3"
        aria-label="Поиск предмета"
      />

      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          onClick={() => setRarity("all")}
          className={cn(
            "rounded-lg border px-2.5 py-1.5 text-[11.5px] font-medium transition",
            rarity === "all"
              ? "border-white/20 bg-white/[0.1] text-white"
              : "border-white/[0.07] text-slate-400 hover:text-white",
          )}
        >
          Все
        </button>
        {present.map(({ slug, color }) => (
          <button
            key={slug}
            onClick={() => setRarity(slug)}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-[11.5px] font-medium transition",
              rarity === slug ? "text-white" : "text-slate-400 hover:text-white",
            )}
            style={{
              borderColor: rarity === slug ? color : "rgba(255,255,255,.07)",
              background: rarity === slug ? `${color}1F` : undefined,
            }}
          >
            {RARITY_LABEL[slug] ?? slug}
          </button>
        ))}
      </div>

      {stakeValue <= 0 ? (
        <EmptyState
          title="Сначала выберите предмет"
          description="Цель подбирается относительно стоимости вашей ставки."
          className="py-10"
        />
      ) : options.length === 0 ? (
        <EmptyState
          title="Нет подходящих целей"
          description="Попробуйте снять фильтр по редкости или уменьшить ставку."
          className="py-10"
        />
      ) : (
        <div className="no-scrollbar grid max-h-[420px] grid-cols-2 gap-2.5 overflow-y-auto pr-0.5 lg:max-h-[520px]">
          {options.map((skin) => (
            <ItemCard
              key={skin.skin_id}
              skin={skin}
              size="sm"
              selected={selectedSkinId === skin.skin_id}
              onClick={() => onSelect(skin)}
              meta={
                <span className="text-[11.5px] text-slate-500">
                  ×{(skin.price_minor / Math.max(stakeValue, 1)).toFixed(2)} от ставки
                </span>
              }
            />
          ))}
        </div>
      )}

      {stakeValue > 0 && (
        <p className="mt-3 text-[12px] text-slate-500">
          Ставка: {formatMinor(stakeValue)} · доступно целей: {options.length}
        </p>
      )}
    </div>
  );
}
