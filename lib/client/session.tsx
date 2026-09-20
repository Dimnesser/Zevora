"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type SessionUser } from "@/lib/client/api";

interface SessionValue {
  user: SessionUser | null;
  /** False until the first /api/auth/me round trip completes. */
  ready: boolean;
  refresh: () => Promise<SessionUser | null>;
  /** Applies a balance the server just returned, without a round trip. */
  setBalance: (minor: number) => void;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Holds the signed-in user for the whole app.
 *
 * The session itself lives in an httpOnly cookie the client cannot read;
 * this context only mirrors what the server reports, so nothing here is
 * trusted for authorisation.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { user: fresh } = await api.me();
      setUser(fresh);
      return fresh;
    } catch {
      setUser(null);
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setBalance = useCallback((minor: number) => {
    setUser((prev) => (prev ? { ...prev, balance_minor: minor } : prev));
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      user,
      ready,
      refresh,
      setBalance,
      login: async (username, password) => {
        const { user: fresh } = await api.login(username, password);
        setUser(fresh);
      },
      register: async (username, password) => {
        const { user: fresh } = await api.register(username, password);
        setUser(fresh);
      },
      logout: async () => {
        await api.logout();
        setUser(null);
      },
    }),
    [user, ready, refresh, setBalance],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
