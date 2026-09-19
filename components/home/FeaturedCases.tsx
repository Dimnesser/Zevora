"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CASES } from "@/data/cases";
import { CaseCard } from "@/components/cases/CaseCard";
import { SectionHeader } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";

/** Eight public cases on the home dashboard; the rest live on /cases. */
export function FeaturedCases() {
  const featured = CASES.filter((c) => !c.partnerOnly).slice(0, 8);

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <SectionHeader
        eyebrow="Каталог"
        title="Популярные кейсы"
        description="От стартовых наборов до хранилища клинков — выбирай под свой банкролл."
        action={
          <Link href="/cases">
            <Button variant="secondary" iconRight={<ArrowRight size={15} />}>
              Все кейсы
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {featured.map((def) => (
          <CaseCard key={def.id} def={def} />
        ))}
      </div>
    </section>
  );
}
