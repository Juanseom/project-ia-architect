import type { RealtimeStatus } from '../../types'

export interface LiveIndicatorProps {
  status: RealtimeStatus
}

const LABELS: Record<RealtimeStatus, string> = {
  connecting: 'Conectando…',
  live: 'En vivo',
  offline: 'Sin tiempo real',
}

const DOT: Record<RealtimeStatus, string> = {
  connecting: 'bg-amber-500',
  live: 'bg-brand-600',
  offline: 'bg-ink-500',
}

/** Estado de la conexión en tiempo real. Texto + color (no depende solo del color); <output> lo anuncia al cambiar. */
export function LiveIndicator({ status }: LiveIndicatorProps) {
  return (
    <output className="inline-flex items-center gap-2 rounded-full border border-ink-500/20 bg-white px-3 py-1 text-sm font-medium text-ink-700">
      <span aria-hidden="true" className="relative flex size-2.5">
        {status === 'live' && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-600 opacity-60 motion-reduce:hidden" />
        )}
        <span className={`relative inline-flex size-2.5 rounded-full ${DOT[status]}`} />
      </span>
      {LABELS[status]}
    </output>
  )
}
