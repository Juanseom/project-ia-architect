// Modelo de dominio de EcoTrack. La UI solo conoce estos tipos, nunca las columnas SQL
// (fuente, categoria, co2_kg, medido_en): el servicio hace la traducción.

/** Categorías cerradas; coinciden con el ENUM `categoria_emision` de la BD. */
export const EMISSION_CATEGORIES = ['transporte', 'energia', 'residuos'] as const

export type EmissionCategory = (typeof EMISSION_CATEGORIES)[number]

export interface Emission {
  id: string
  source: string
  category: EmissionCategory
  co2Kg: number
  /** ISO 8601 (timestamptz). */
  measuredAt: string
}

/** Lo que el usuario puede enviar: id, fecha y dueño los pone la BD. */
export type NewEmission = Pick<Emission, 'source' | 'category' | 'co2Kg'>

/** Valores crudos del formulario (los inputs HTML siempre entregan strings). */
export interface EmissionFormValues {
  source: string
  category: EmissionCategory | ''
  co2Kg: string
}
