import type { ProjectStatus } from '../../types'

// Texto -800 sobre fondo -100 (contraste AA, misma familia medida en el Lab EcoTrack). El estado siempre va con texto.
export const STATUS_BADGE: Record<ProjectStatus, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  en_progreso: 'bg-sky-100 text-sky-800',
  completado: 'bg-brand-100 text-brand-900',
}

export const STATUS_ACCENT: Record<ProjectStatus, string> = {
  pendiente: 'border-t-amber-500',
  en_progreso: 'border-t-sky-600',
  completado: 'border-t-brand-600',
}

/** Texto del botón para pasar de un estado a otro. */
export const TRANSITION_LABEL: Record<ProjectStatus, Partial<Record<ProjectStatus, string>>> = {
  pendiente: { en_progreso: 'Iniciar instalación' },
  en_progreso: { completado: 'Marcar completado', pendiente: 'Pausar' },
  completado: { en_progreso: 'Reabrir' },
}
