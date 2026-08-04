import { Skeleton } from "@/components/ui/skeleton";

/** Card placeholder that mirrors PackageCard's dotted-leader stat layout. */
export function PackageCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-14 rounded-md" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="mt-3 h-5 w-3/4" />
      <Skeleton className="mt-2 h-3.5 w-full" />
      <Skeleton className="mt-1.5 h-3.5 w-5/6" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-3 w-16 shrink-0" />
            <span aria-hidden className="mt-1 flex-1 border-b border-dashed border-border/60" />
            <Skeleton className="h-3 w-10 shrink-0" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

/** Grid of card placeholders, matching the live results grid at every width. */
export function PackageGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      aria-hidden
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: count }).map((_, i) => (
        <PackageCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Sidebar filter placeholder used while the registry counts are unknown. */
export function FilterSidebarSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      {[5, 6, 4].map((rows, g) => (
        <div key={g}>
          <Skeleton className="mb-3 h-3 w-24" />
          <div className="space-y-1.5">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-2">
                <Skeleton className="h-3.5 w-3.5 shrink-0 rounded-[3px]" />
                <Skeleton className="h-3.5 flex-1" />
                <Skeleton className="h-3 w-6 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Full-page placeholder for the package details route while its loader runs. */
export function PackageDetailSkeleton() {
  return (
    <div aria-hidden>
      <section className="border-b border-border bg-surface/40">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          <Skeleton className="h-3 w-52" />
          <Skeleton className="mt-4 h-4 w-40" />
          <Skeleton className="mt-3 h-9 w-2/3 max-w-md sm:h-11" />
          <Skeleton className="mt-3 h-4 w-full max-w-xl" />
          <div className="mt-4 flex flex-wrap gap-2">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        <div className="min-w-0 space-y-8">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-6 w-40" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </section>
    </div>
  );
}
