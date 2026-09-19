import type { ReactNode } from "react";

/** Simple typographic wrapper for the static informational pages. */
export function Prose({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-16">
      <h1 className="font-display text-[34px] font-bold sm:text-[42px]">{title}</h1>
      {lead && (
        <p className="mt-4 text-[15px] leading-relaxed text-slate-400">{lead}</p>
      )}
      <div className="mt-10 space-y-8 [&_h2]:text-xl [&_h2]:font-bold [&_li]:text-[14px] [&_li]:leading-relaxed [&_li]:text-slate-400 [&_p]:text-[14px] [&_p]:leading-relaxed [&_p]:text-slate-400 [&_ul]:space-y-2">
        {children}
      </div>
    </div>
  );
}
