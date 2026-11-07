import { Skeleton } from '../ui'

/** Skeleton del tablero (3 columnas). */
export function ProjectsLoading() {
  return (
    <div>
      <output className="sr-only">Cargando proyectos…</output>
      <div aria-hidden="true" className="grid gap-6 xl:grid-cols-3">
        {[0, 1, 2].map((col) => (
          <div key={col} className="space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
