"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/client/api";
import { useResource } from "@/hooks/useResource";
import { CaseCard } from "@/components/cases/CaseCard";
import { SectionHeader } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { CaseCardSkeleton } from "@/components/ui/Skeleton";

/** The first eight public cases; the rest live on /cases. */
export function FeaturedCases() {
  const { data, loading } = useResource(() => api.cases(), []);
  const featured = data?.cases.slice(0, 8) ?? [];

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <SectionHeader
        eyebrow="Каталог"
        title="Популярные кейсы"
        description="От стартовых наборов до кузни клинков — выбирай под свой банкролл."
        action={
          <Link href="/cases">
            <Button variant="secondary" iconRight={<ArrowRight size={15} />}>
              Все кейсы
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <CaseCardSkeleton key={i} />)
          : featured.map((kase) => <CaseCard key={kase.id} kase={kase} />)}
      </div>
    </section>
  );
}
