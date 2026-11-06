import type { EmissionCategory } from '../types'

// Formateadores Intl creados una sola vez (crearlos en cada render es costoso).
const kgFormatter = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

/** 4980.75 → "4.980,75" (separador de miles y coma decimal de es-CO). */
export const formatKg = (kg: number): string => kgFormatter.format(kg)

/** Unidad de medida mostrada junto a los valores. */
export const CO2_UNIT = 'kg CO₂e'

/** 4980.75 → "4.980,75 kg CO₂e". */
export const formatKgCO2 = (kg: number): string => `${formatKg(kg)} ${CO2_UNIT}`

export const isLowStock = (stock: number, threshold = 5): boolean => stock <= threshold

/** Etiquetas visibles en español (con tilde) para cada categoría de emisión. */
export const CATEGORY_LABELS: Record<EmissionCategory, string> = {
  transporte: 'Transporte',
  energia: 'Energía',
  residuos: 'Residuos',
}

export const formatCategory = (category: EmissionCategory): string => CATEGORY_LABELS[category]

export const formatMeasuredAt = (iso: string): string => dateFormatter.format(new Date(iso))
