"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { InventoryItem, Rarity, Skin } from "@/types";
import { SKINS, getSkin } from "@/data/skins";
import { RARITY, RARITY_ORDER } from "@/lib/rarity";
import { ItemCard } from "@/components/items/ItemCard";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Picker over the user's own items (the stake side). */
export function StakePicker({
  items,
  selected,
  onToggle,
  className,
}: {
  items: InventoryItem[];
  selected: string[];
  onToggle: (uid: string) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => i.status === "owned")
      .filter((i) => {
        if (!q) return true;
        const s = getSkin(i.skinId);
        return (
          s.name.toLowerCase().includes(q) || s.weapon.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.price - a.price);
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
              key={item.uid}
              item={item}
              size="sm"
              selected={selected.includes(item.uid)}
              onClick={() => onToggle(item.uid)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Picker over the catalogue (the target side). */
export function TargetPicker({
  stakeValue,
  selectedId,
  onSelect,
  className,
}: {
  stakeValue: number;
  selectedId: string | null;
  onSelect: (skin: Skin) => void;
  className?: string;
}) {
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [query, setQuery] = useState("");

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SKINS
      // A target must be worth more than the stake, otherwise it is not an upgrade.
      .filter((s) => s.price > stakeValue * 1.05)
      .filter((s) => rarity === "all" || s.rarity === rarity)
      .filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.weapon.toLowerCase().includes(q),
      )
      .sort((a, b) => a.price - b.price);
  }, [stakeValue, rarity, query]);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="mb-3 flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск предмета"
          iconLeft={<Search size={15} />}
          aria-label="Поиск предмета"
        />
      </div>

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
        {RARITY_ORDER.map((r) => (
          <button
            key={r}
            onClick={() => setRarity(r)}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-[11.5px] font-medium transition",
              rarity === r ? "text-white" : "text-slate-400 hover:text-white",
            )}
            style={{
              borderColor:
                rarity === r ? RARITY[r].color : "rgba(255,255,255,.07)",
              background: rarity === r ? `${RARITY[r].color}1F` : undefined,
            }}
          >
            {RARITY[r].label}
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
              key={skin.id}
              skin={skin}
              size="sm"
              selected={selectedId === skin.id}
              onClick={() => onSelect(skin)}
              meta={
                <span className="text-[11.5px] text-slate-500">
                  ×{(skin.price / Math.max(stakeValue, 1)).toFixed(2)} от ставки
                </span>
              }
            />
          ))}
        </div>
      )}

      {stakeValue > 0 && (
        <p className="mt-3 text-[12px] text-slate-500">
          Ставка: {formatMoney(stakeValue)} · доступно целей: {options.length}
        </p>
      )}
    </div>
  );
}
