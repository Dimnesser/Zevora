import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

/** Matches the CaseCard footprint so the grid never jumps on load. */
export function CaseCardSkeleton() {
  return (
    <div className="glass p-4">
      <Skeleton className="mb-4 aspect-[4/3] w-full rounded-xl" />
      <Skeleton className="mb-2 h-4 w-2/3" />
      <Skeleton className="mb-4 h-3 w-1/2" />
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  );
}

export function ItemCardSkeleton() {
  return (
    <div className="glass p-3">
      <Skeleton className="mb-3 aspect-[4/3] w-full rounded-lg" />
      <Skeleton className="mb-2 h-3 w-3/4" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}
