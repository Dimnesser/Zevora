"use client";

import { create } from "zustand";
import { uid } from "@/lib/utils";

export type ToastVariant = "default" | "success" | "error" | "rare";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  /** ms; 0 keeps it until dismissed. */
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Partial<Toast>, "id"> & { title: string }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = uid("toast");
    const toast: Toast = {
      id,
      title: t.title,
      description: t.description,
      variant: t.variant ?? "default",
      duration: t.duration ?? 3600,
    };
    set((s) => ({ toasts: [toast, ...s.toasts].slice(0, 4) }));
    if (toast.duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
      }, toast.duration);
    }
    return id;
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

/** Convenience helper usable outside React components. */
export const toast = {
  show: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description }),
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: "success" }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: "error" }),
  rare: (title: string, description?: string) =>
    useToastStore
      .getState()
      .push({ title, description, variant: "rare", duration: 5000 }),
};
