export interface SkeletonProps {
  className?: string
}

/** Bloque gris animado. Decorativo: se oculta a lectores de pantalla (el estado se anuncia aparte). */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-ink-500/15 motion-reduce:animate-none ${className}`.trim()} />
}
