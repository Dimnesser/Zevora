"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Page transition.
 *
 * A `template` rather than a layout: Next remounts it on every
 * navigation, which is exactly what makes the entrance replay. A layout
 * would mount once and animate only on first paint.
 *
 * The move is small on purpose — 8px and a breath of opacity. Anything
 * larger reads as the page being rebuilt, and a case site is navigated
 * constantly, so a transition you notice twice is a transition you
 * resent by the tenth time.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
