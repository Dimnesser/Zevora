import type { Metadata } from "next";
import { CaseDetail } from "@/components/cases/CaseDetail";

/**
 * The page itself is a shell: `CaseDetail` fetches the case on the client,
 * so prerendering it costs nothing and buys the static demo build a real
 * page per case. `generateStaticParams` names the slugs the committed
 * catalogue has. The server build keeps resolving slugs outside that
 * list — Next's default — because the shell does not depend on which
 * case it is showing; the static export necessarily closes the set.
 */
export async function generateStaticParams() {
  const catalogue = (await import("@/lib/server/cases.json")).default as {
    slug: string;
  }[];
  return catalogue.map(({ slug }) => ({ slug }));
}

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
