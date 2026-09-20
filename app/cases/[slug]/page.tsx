import type { Metadata } from "next";
import { CaseDetail } from "@/components/cases/CaseDetail";

/**
 * Case pages are dynamic: the catalogue lives in the database and the
 * owner can add or edit a case at any time, so nothing is prerendered.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "Кейс",
    description: `Открой кейс ${slug} в Zevora и забери скин CS2.`,
  };
}

export default async function CasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CaseDetail slug={slug} />;
}
