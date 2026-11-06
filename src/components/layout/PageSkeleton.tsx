import { Skeleton } from '../ui'

/** Fallback de <Suspense> mientras llega el chunk de una página: misma silueta que el dashboard (sin saltos de layout). */
export function PageSkeleton() {
  return (
    <div aria-busy="true" className="space-y-8">
      <output className="sr-only">Cargando página…</output>
      <div aria-hidden="true" className="space-y-2">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div aria-hidden="true" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  )
}
