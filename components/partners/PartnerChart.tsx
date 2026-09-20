"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ActivityPoint } from "@/lib/client/api";
import { formatCompact, formatMinor, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Metric = "opens" | "spent_minor" | "won_minor";

const METRICS: { id: Metric; label: string; color: string; money: boolean }[] = [
  { id: "opens", label: "Открытия", color: "#6E71FF", money: false },
  { id: "spent_minor", label: "Потрачено", color: "#22D3EE", money: true },
  { id: "won_minor", label: "Выиграно", color: "#F5B841", money: true },
];

// One SVG user unit equals one pixel, so labels never scale up.
const H = 260;
const PAD = { top: 18, right: 16, bottom: 30, left: 56 };
const PLOT_H = H - PAD.top - PAD.bottom;
const MIN_W = 320;

/**
 * Single-series activity chart over the last 14 days.
 *
 * One metric at a time keeps it to a single y-axis; the metric switch
 * doubles as the legend, so identity is never carried by colour alone.
 */
export function PartnerChart({ series }: { series: ActivityPoint[] }) {
  const [metric, setMetric] = useState<Metric>("opens");
  const [hover, setHover] = useState<number | null>(null);
  const [width, setWidth] = useState(720);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(MIN_W, el.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = width;
  const PLOT_W = W - PAD.left - PAD.right;
  const active = METRICS.find((m) => m.id === metric)!;

  const { points, ticks, peakIndex } = useMemo(() => {
    const values = series.map((d) => d[metric]);
    const rawMax = Math.max(...values, 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const top = Math.max(Math.ceil(rawMax / magnitude) * magnitude, 1);
    const step = series.length > 1 ? PLOT_W / (series.length - 1) : 0;

    return {
      peakIndex: values.indexOf(rawMax),
      points: values.map((v, i) => ({
        x: PAD.left + i * step,
        y: PAD.top + PLOT_H - (v / top) * PLOT_H,
        v,
      })),
      ticks: [0, 0.25, 0.5, 0.75, 1].map((t) => ({
        y: PAD.top + PLOT_H - t * PLOT_H,
        label: active.money
          ? formatCompact(Math.round((top * t) / 100))
          : formatCompact(top * t),
      })),
    };
  }, [series, metric, PLOT_W, active.money]);

  if (points.length === 0) return null;

  const line = points.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  const area = `${line} L${points[points.length - 1].x} ${PAD.top + PLOT_H} L${points[0].x} ${PAD.top + PLOT_H} Z`;
  const hovered = hover !== null ? points[hover] : null;
  const format = (v: number) => (active.money ? formatMinor(v) : formatNumber(v));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHover(nearest);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {METRICS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMetric(m.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition",
              metric === m.id
                ? "border-white/20 bg-white/[0.09] text-white"
                : "border-white/[0.07] text-slate-400 hover:text-white",
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
            {m.label}
          </button>
        ))}
      </div>

      <div className="relative" ref={wrapRef}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="block w-full"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label={`${active.label} за 14 дней`}
        >
          <defs>
            <linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={active.color} stopOpacity="0.38" />
              <stop offset="100%" stopColor={active.color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={PAD.left}
                y1={t.y}
                x2={W - PAD.right}
                y2={t.y}
                stroke="#ffffff"
                strokeOpacity="0.055"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 10}
                y={t.y + 4}
                textAnchor="end"
                className="fill-slate-500"
                style={{ fontSize: 11 }}
              >
                {t.label}
              </text>
            </g>
          ))}

          <path d={area} fill={`url(#fill-${metric})`} />
          <path
            d={line}
            fill="none"
            stroke={active.color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 6px ${active.color}55)` }}
          />

          <circle
            cx={points[peakIndex].x}
            cy={points[peakIndex].y}
            r="4"
            fill={active.color}
            stroke="#0D1020"
            strokeWidth="2"
          />

          {series.map((d, i) =>
            i % (PLOT_W < 460 ? 3 : 2) === 0 ? (
              <text
                key={d.day}
                x={points[i].x}
                y={H - 8}
                textAnchor="middle"
                className="fill-slate-500"
                style={{ fontSize: 11 }}
              >
                {d.day}
              </text>
            ) : null,
          )}

          {hovered && (
            <g>
              <line
                x1={hovered.x}
                y1={PAD.top}
                x2={hovered.x}
                y2={PAD.top + PLOT_H}
                stroke="#ffffff"
                strokeOpacity="0.22"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx={hovered.x}
                cy={hovered.y}
                r="5"
                fill={active.color}
                stroke="#0D1020"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {hover !== null && hovered && (
          <div
            className="glass-strong pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl px-3 py-2"
            style={{ left: hovered.x, top: hovered.y, marginTop: -10 }}
          >
            <p className="whitespace-nowrap text-[11px] text-slate-400">
              {series[hover].day}
            </p>
            <p className="whitespace-nowrap text-[13px] font-bold text-white">
              {format(hovered.v)}
            </p>
          </div>
        )}
      </div>

      <p className="mt-2 text-center text-[11.5px] text-slate-500">
        {active.label} за последние 14 дней · максимум{" "}
        <span className="font-semibold text-slate-300">{format(points[peakIndex].v)}</span>
      </p>
    </div>
  );
}
