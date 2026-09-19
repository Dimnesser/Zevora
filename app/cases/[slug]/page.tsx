import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CASES, getCase } from "@/data/cases";
import { CaseDetail } from "@/components/cases/CaseDetail";

export function generateStaticParams() {
  return CASES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const def = getCase(slug);
  if (!def) return { title: "Кейс не найден" };
  return {
    title: def.name,
    description: `${def.subtitle}. Открой кейс ${def.name} в Zevora и забери скин CS2.`,
  };
}

export default async function CasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const def = getCase(slug);
  if (!def) notFound();
  return <CaseDetail def={def} />;
}
