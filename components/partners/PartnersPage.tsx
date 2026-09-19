"use client";

import { useStore } from "@/lib/store/useStore";
import { useHydrated } from "@/hooks/useHydrated";
import { PartnerLounge } from "@/components/partners/PartnerLounge";
import { PartnersIntro } from "@/components/partners/PartnersIntro";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Routes between the public programme page and the members-only lounge.
 * Partner status lives on the user record and is set by the owner only.
 */
export function PartnersPage() {
  const hydrated = useHydrated();
  const partner = useStore((s) => s.user.partner);
  const username = useStore((s) => s.user.username);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[320px] w-full rounded-3xl" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return partner ? (
    <PartnerLounge partner={partner} username={username} />
  ) : (
    <PartnersIntro />
  );
}
