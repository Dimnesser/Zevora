"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import type { InventoryItem } from "@/lib/client/api";
import { SkinImage } from "@/components/art/SkinImage";
import { cn } from "@/lib/utils";

/**
 * The ten input slots.
 *
 * Empty slots are drawn as sockets rather than hidden, so the contract
 * reads as a machine with a fixed shape: you can see at a glance how many
 * items it still wants.
 */
export function ContractSlots({
  size,
  items,
  color,
  onRemove,
}: {
  size: number;
  items: InventoryItem[];
  color: string;
  onRemove: (id: number) => void;
}) {
  const slots = Array.from({ length: size }, (_, i) => items[i] ?? null);

  return (
    <div className="grid grid-cols-5 gap-2">
      {slots.map((item, i) => (
        <div
          key={item?.id ?? `empty-${i}`}
          className={cn(
            "ticks relative aspect-[4/5] overflow-hidden rounded-sm border text-white/15",
            item
              ? "border-line bg-slab/80"
              : "border-dashed border-line-soft bg-white/[0.015]",
          )}
          style={item ? { borderColor: `${color}4D` } : undefined}
        >
          <AnimatePresence mode="wait">
            {item ? (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => onRemove(item.id)}
                initial={{ opacity: 0, scale: 0.86 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="group absolute inset-0 flex flex-col p-1.5"
                aria-label={`Убрать ${item.market_name}`}
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[2px]"
                  style={{ background: color, boxShadow: `0 0 10px ${color}` }}
                />
                <span className="flex flex-1 items-center justify-center">
                  <SkinImage
                    imageUrl={item.image_url}
                    art={item.art}
                    label={item.market_name}
                  />
                </span>
                <span className="meta truncate text-[8.5px] tracking-[0.06em] text-slate-500">
                  {item.float_value.toFixed(3)}
                </span>
                <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-xs bg-black/70 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                  <X size={11} />
                </span>
              </motion.button>
            ) : (
              <span
                key="empty"
                className="absolute inset-0 flex items-center justify-center text-slate-700"
              >
                <Plus size={16} />
              </span>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

/** The wear bands, with the contract's projected float marked on them. */
export function FloatGauge({ value }: { value: number | null }) {
  const bands = [
    { label: "FN", to: 0.07, color: "#2FD98A" },
    { label: "MW", to: 0.15, color: "#7BD93B" },
    { label: "FT", to: 0.38, color: "#F5B841" },
    { label: "WW", to: 0.45, color: "#F58A18" },
    { label: "BS", to: 1.0, color: "#E04B3B" },
  ];
  let cursor = 0;

  return (
    <div>
      <div className="relative h-[9px] w-full overflow-hidden rounded-xs border border-line-soft">
        <div className="flex h-full w-full">
          {bands.map((b) => {
            const width = (b.to - cursor) * 100;
            cursor = b.to;
            return (
              <span
                key={b.label}
                className="h-full"
                style={{ width: `${width}%`, background: `${b.color}59` }}
              />
            );
          })}
        </div>
        {value !== null && (
          <motion.span
            className="absolute inset-y-0 w-[2px] bg-white"
            style={{ boxShadow: "0 0 8px rgba(255,255,255,.9)" }}
            initial={false}
            animate={{ left: `calc(${Math.min(1, Math.max(0, value)) * 100}% - 1px)` }}
            transition={{ type: "spring", stiffness: 210, damping: 26 }}
          />
        )}
      </div>
      {/* Each label sits under its own band, so the ticks line up with
          the colours rather than spreading evenly across the bar. */}
      <div className="mt-1 flex">
        {bands.map((b, i) => (
          <span
            key={b.label}
            className="meta text-[8.5px] text-slate-600"
            style={{ width: `${(b.to - (bands[i - 1]?.to ?? 0)) * 100}%` }}
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** One line of the contract's summary. */
export function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="meta text-slate-500">{label}</span>
      <span className="text-[13px] font-semibold tnum" style={{ color: tone ?? "#fff" }}>
        {value}
      </span>
    </div>
  );
}
