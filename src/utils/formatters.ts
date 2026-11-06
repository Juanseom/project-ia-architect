import type { EmissionCategory } from '../types'

export const formatKgCO2 = (kg: number): string => `${kg.toFixed(2)} kg CO₂e`

export const isLowStock = (stock: number, threshold = 5): boolean => stock <= threshold

/** Etiquetas visibles en español (con tilde) para cada categoría de emisión. */
export const CATEGORY_LABELS: Record<EmissionCategory, string> = {
  transporte: 'Transporte',
  energia: 'Energía',
  residuos: 'Residuos',
}

export const formatCategory = (category: EmissionCategory): string => CATEGORY_LABELS[category]

export const formatMeasuredAt = (iso: string): string =>
  new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
