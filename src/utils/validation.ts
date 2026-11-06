import {
  EMISSION_CATEGORIES,
  type EmissionCategory,
  type EmissionFieldErrors,
  type EmissionFormValues,
  type EmissionValidationResult,
} from '../types'

/** Mismas reglas que la migración (CHECK de fuente y co2_kg, numeric(12,2)). */
export const EMISSION_RULES = {
  sourceMin: 2,
  sourceMax: 100,
  co2Max: 9_999_999_999.99,
} as const

/** Type guard: reemplaza el cast `value as EmissionCategory` del <select>. */
export const isEmissionCategory = (value: string): value is EmissionCategory =>
  (EMISSION_CATEGORIES as readonly string[]).includes(value)

// Acepta coma o punto decimal (en es-CO se escribe "845,3") y máximo 2 decimales, como numeric(12,2).
const CO2_PATTERN = /^\d+([.,]\d{1,2})?$/

/** Convierte el texto del input en número, o null si el formato no es válido. */
export function parseCo2(raw: string): number | null {
  const text = raw.trim()
  if (!CO2_PATTERN.test(text)) return null
  return Number(text.replace(',', '.'))
}

export const VALIDATION_MESSAGES = {
  sourceRequired: 'Escribe el nombre de la fuente.',
  sourceTooShort: `La fuente debe tener al menos ${EMISSION_RULES.sourceMin} caracteres.`,
  sourceTooLong: `La fuente no puede superar ${EMISSION_RULES.sourceMax} caracteres.`,
  categoryRequired: 'Selecciona una categoría.',
  co2Required: 'Indica los kg de CO₂.',
  co2Format: 'Escribe un número válido con máximo 2 decimales (ej. 845,30).',
  co2Positive: 'El CO₂ debe ser mayor que 0.',
  co2TooLarge: 'El valor es demasiado grande (máximo 9.999.999.999,99 kg).',
} as const

/** Valida los valores crudos del formulario y, si son válidos, devuelve el NewEmission listo para el servicio. */
export function validateEmission(values: EmissionFormValues): EmissionValidationResult {
  const errors: EmissionFieldErrors = {}

  const source = values.source.trim()
  if (source.length === 0) errors.source = VALIDATION_MESSAGES.sourceRequired
  else if (source.length < EMISSION_RULES.sourceMin) errors.source = VALIDATION_MESSAGES.sourceTooShort
  else if (source.length > EMISSION_RULES.sourceMax) errors.source = VALIDATION_MESSAGES.sourceTooLong

  const category = values.category
  if (category === '') errors.category = VALIDATION_MESSAGES.categoryRequired

  const co2 = parseCo2(values.co2Kg)
  if (values.co2Kg.trim() === '') errors.co2Kg = VALIDATION_MESSAGES.co2Required
  else if (co2 === null) errors.co2Kg = VALIDATION_MESSAGES.co2Format
  else if (co2 <= 0) errors.co2Kg = VALIDATION_MESSAGES.co2Positive
  else if (co2 > EMISSION_RULES.co2Max) errors.co2Kg = VALIDATION_MESSAGES.co2TooLarge

  if (category === '' || co2 === null || Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { source, category, co2Kg: co2 } }
}
