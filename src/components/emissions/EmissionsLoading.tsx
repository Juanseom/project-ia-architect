import { Skeleton } from '../ui'

export interface EmissionsLoadingProps {
  /** Cantidad de tarjetas fantasma. */
  count?: number
}

/** Skeleton del listado. El texto oculto se anuncia por <output> (rol nativo status, aria-live polite). */
export function EmissionsLoading({ count = 6 }: EmissionsLoadingProps) {
  return (
    <div>
      <output className="sr-only">Cargando mediciones…</output>
      <ul aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="rounded-xl border border-ink-500/15 bg-white p-5">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="mt-3 h-5 w-3/4" />
            <Skeleton className="mt-6 h-7 w-1/2" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </li>
        ))}
      </ul>
    </div>
  )
}
