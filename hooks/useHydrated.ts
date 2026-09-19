"use client";

import { useEffect, useState } from "react";

/**
 * True only after the first client render. Gate any persisted-store read
 * behind this so the server HTML and the first client render match.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
