import { memo } from 'react'
import { PROJECT_STATUSES, type ProjectsSummary } from '../../types'
import { formatKw, PROJECT_STATUS_LABELS } from '../../utils'
import { Skeleton } from '../ui'
import { STATUS_ACCENT } from './statusStyles'

export interface ProjectsSummaryProps {
  /** null mientras carga o si falló: skeleton o "—", nunca ceros falsos. */
  summary: ProjectsSummary | null
  loading: boolean
}

/** Tarjetas de estado del dashboard: cuántos proyectos y cuántos kW hay en cada etapa. */
export const ProjectsSummaryPanel = memo(function ProjectsSummaryPanel({ summary, loading }: ProjectsSummaryProps) {
  const value = (count: number | undefined, kw: number | undefined) => {
    if (loading) return <Skeleton className="mt-1 h-7 w-20" />
    if (count === undefined || kw === undefined) return <span aria-label="No disponible">—</span>
    return (
      <>
        {/* Espacio y texto oculto explícitos: sin ellos un lector de pantalla leía "2115 kW" (conteo y kW pegados). */}
        <span className="text-3xl font-bold tabular-nums">{count}</span>
        <span className="sr-only"> {count === 1 ? 'proyecto' : 'proyectos'},</span>{' '}
        <span className="ml-1 text-sm text-ink-500">{formatKw(kw)}</span>
      </>
    )
  }

  return (
    <section aria-labelledby="projects-summary-title" aria-busy={loading}>
      <h2 id="projects-summary-title" className="sr-only">Resumen de proyectos por estado</h2>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROJECT_STATUSES.map((status) => (
          <div key={status} className={`rounded-xl border border-t-4 border-ink-500/15 bg-white p-5 ${STATUS_ACCENT[status]}`}>
            <dt className="text-sm font-medium text-ink-700">{PROJECT_STATUS_LABELS[status]}</dt>
            <dd className="mt-1">{value(summary?.byStatus[status].count, summary?.byStatus[status].capacityKw)}</dd>
          </div>
        ))}
        <div className="rounded-xl bg-brand-900 p-5 text-white">
          <dt className="text-sm text-brand-100">Capacidad total</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums">
            {loading ? <Skeleton className="h-7 w-24 bg-white/20" /> : summary ? formatKw(summary.total.capacityKw) : '—'}
          </dd>
        </div>
      </dl>
    </section>
  )
})
