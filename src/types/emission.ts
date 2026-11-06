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

/** Campos del formulario, en el orden en que aparecen (se usa para enfocar el primero inválido). */
export type EmissionField = keyof EmissionFormValues
export const EMISSION_FIELDS: readonly EmissionField[] = ['source', 'category', 'co2Kg']

/** Mensaje de error por campo (solo los campos inválidos tienen clave). */
export type EmissionFieldErrors = Partial<Record<EmissionField, string>>

export type EmissionValidationResult =
  | { ok: true; value: NewEmission }
  | { ok: false; errors: EmissionFieldErrors }

/** Pedido de foco hacia un campo; el token cambia en cada pedido para poder enfocar el mismo campo dos veces. */
export interface FocusRequest {
  field: EmissionField
  token: number
}

/** Estado de la suscripción en tiempo real. */
export type RealtimeStatus = 'connecting' | 'live' | 'offline'
