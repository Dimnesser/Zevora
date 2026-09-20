"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The case opening itself.
 *
 * Plays between the server's answer and the reel: the case rattles, the
 * latches let go, and the lid hinges off its back edge while light floods
 * out of the seam. It is pure decoration — the drop is already decided,
 * and `onDone` fires on a timer that cannot be influenced by anything the
 * animation does.
 *
 * The artwork is the same Figma design as the catalogue card, rendered by
 * `npm run build:cases` into three layers so the lid can move on its own:
 *
 *   <slug>-body.webp   shell, latches, bumpers, decal
 *   <slug>-lid.webp    lid only, in the same 640x480 space
 */

const RATTLE_MS = 620;
const BURST_MS = 760;
export const UNLOCK_MS = RATTLE_MS + BURST_MS;

export function CaseUnlock({
  slug,
  name,
  accent,
  onDone,
  className,
}: {
  slug: string;
  name: string;
  /** Case shell colour, used for the light that escapes the seam. */
  accent: string;
  onDone: () => void;
  className?: string;
}) {
  const lid = useAnimationControls();
  const body = useAnimationControls();
  const glow = useAnimationControls();
  const done = useRef(false);

  // Sparks are random, but only once — re-rolling them on every render
  // would make them jitter instead of fly.
  const sparks = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 300,
        y: -90 - Math.random() * 150,
        delay: Math.random() * 0.12,
        size: 3 + Math.random() * 4,
      })),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // 1. The case fights the latches.
      await Promise.all([
        body.start({
          x: [0, -5, 5, -7, 7, -4, 4, 0],
          rotate: [0, -1, 1, -1.6, 1.6, -0.8, 0.8, 0],
          transition: { duration: RATTLE_MS / 1000, ease: "easeInOut" },
        }),
        lid.start({
          x: [0, -5, 5, -7, 7, -4, 4, 0],
          rotate: [0, -1, 1, -1.6, 1.6, -0.8, 0.8, 0],
          transition: { duration: RATTLE_MS / 1000, ease: "easeInOut" },
        }),
      ]);
      if (cancelled) return;

      // 2. The lid lets go and the light gets out.
      glow.start({
        opacity: [0, 1, 0.85],
        scaleY: [0.2, 1.25, 1.1],
        transition: { duration: BURST_MS / 1000, ease: "easeOut" },
      });
      body.start({
        y: [0, 6, 2],
        transition: { duration: BURST_MS / 1000, ease: "easeOut" },
      });
      await lid.start({
        y: [0, -120, -210],
        rotateX: [0, -38, -62],
        scale: [1, 1.05, 1.02],
        opacity: [1, 1, 0],
        transition: { duration: BURST_MS / 1000, ease: [0.22, 0.8, 0.3, 1] },
      });
      if (cancelled || done.current) return;
      done.current = true;
      onDone();
    };

    void run();
    // A stalled animation must never strand the reel.
    const guard = window.setTimeout(() => {
      if (!cancelled && !done.current) { done.current = true; onDone(); }
    }, UNLOCK_MS + 900);

    return () => { cancelled = true; window.clearTimeout(guard); };
  }, [body, glow, lid, onDone]);

  return (
    <div
      className={cn("relative mx-auto aspect-[4/3] w-full max-w-[420px]", className)}
      style={{ perspective: 900 }}
      aria-label={`Открывается кейс «${name}»`}
      role="img"
    >
      {/* light escaping the seam, behind the shell */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scaleY: 0.2 }}
        animate={glow}
        className="pointer-events-none absolute left-1/2 top-[46%] h-40 w-[62%] -translate-x-1/2 rounded-full blur-2xl"
        style={{ background: accent, transformOrigin: "50% 100%" }}
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={glow}
        className="pointer-events-none absolute left-1/2 top-[20%] h-[46%] w-[34%] -translate-x-1/2 blur-xl"
        style={{
          background: `linear-gradient(to top, ${accent}, transparent)`,
          transformOrigin: "50% 100%",
        }}
      />

      {sparks.map((s) => (
        <motion.span
          key={s.id}
          aria-hidden
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={{ opacity: [0, 1, 0], x: s.x, y: s.y }}
          transition={{
            duration: 0.9,
            delay: RATTLE_MS / 1000 + s.delay,
            ease: "easeOut",
          }}
          className="pointer-events-none absolute left-1/2 top-[48%] rounded-full"
          style={{ width: s.size, height: s.size, background: accent }}
        />
      ))}

      {/* eslint-disable @next/next/no-img-element */}
      <motion.img
        src={`/cases/${slug}-body.webp`}
        alt=""
        animate={body}
        className="absolute inset-0 h-full w-full object-contain"
      />
      <motion.img
        src={`/cases/${slug}-lid.webp`}
        alt=""
        animate={lid}
        className="absolute inset-0 h-full w-full object-contain"
        style={{ transformOrigin: "50% 62%", transformStyle: "preserve-3d" }}
      />
      {/* eslint-enable @next/next/no-img-element */}
    </div>
  );
}
