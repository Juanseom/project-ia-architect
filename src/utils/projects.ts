import {
  PROJECT_STATUSES,
  type InstallerSpecialty,
  type MaterialUnit,
  type ProjectFieldErrors,
  type ProjectFormValues,
  type ProjectStatus,
  type ProjectsSummary,
  type ProjectValidationResult,
} from '../types'

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completado: 'Completado',
}

export const SPECIALTY_LABELS: Record<InstallerSpecialty, string> = {
  general: 'General',
  electrica: 'Eléctrica',
  estructural: 'Estructural',
  mantenimiento: 'Mantenimiento',
}

export const UNIT_LABELS: Record<MaterialUnit, string> = { unidad: 'unidad', metro: 'm', kg: 'kg', juego: 'juego' }

const kwFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })
const copFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
// Las columnas date llegan como 'YYYY-MM-DD'; se formatean en UTC para no correr un día por la zona horaria.
const dateFormatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const part = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''

export const formatKw = (kw: number): string => `${kwFormatter.format(kw)} kW`
export const formatCop = (value: number): string => copFormatter.format(value)
/** '2026-11-10' → '10 nov 2026' (compacto para tarjetas angostas; "10 de nov de 2026" ocupaba 2 líneas). */
export function formatProjectDate(isoDate: string): string {
  const parts = dateFormatter.formatToParts(new Date(`${isoDate}T00:00:00Z`))
  return `${part(parts, 'day')} ${part(parts, 'month').replace('.', '')} ${part(parts, 'year')}`
}

/**
 * Transiciones permitidas. ESPEJO de la RPC cambiar_estado_proyecto: la BD es la autoridad;
 * esto solo decide qué botones mostrar (un test verifica que coincidan con la especificación).
 */
export function allowedTransitions(status: ProjectStatus, isCoordinator: boolean, hasInstaller: boolean): ProjectStatus[] {
  const next: ProjectStatus[] = []
  if (status === 'pendiente' && hasInstaller) next.push('en_progreso')
  if (status === 'en_progreso') next.push('completado', 'pendiente')
  if (status === 'completado' && isCoordinator) next.push('en_progreso')
  return next
}

/** Resumen vacío con todas las claves (TypeScript exige los tres estados). */
export const emptyProjectsSummary = (): ProjectsSummary => ({
  byStatus: {
    pendiente: { count: 0, capacityKw: 0 },
    en_progreso: { count: 0, capacityKw: 0 },
    completado: { count: 0, capacityKw: 0 },
  },
  total: { count: 0, capacityKw: 0 },
})

/** Construye el resumen a partir de filas agregadas (vista proyectos_resumen) o de una lista. */
export function summarizeProjects(rows: readonly { status: ProjectStatus; count: number; capacityKw: number }[]): ProjectsSummary {
  const summary = emptyProjectsSummary()
  let cents = 0
  for (const row of rows) {
    summary.byStatus[row.status].count += row.count
    summary.byStatus[row.status].capacityKw = Math.round((summary.byStatus[row.status].capacityKw + row.capacityKw) * 100) / 100
    summary.total.count += row.count
    cents += Math.round(row.capacityKw * 100)
  }
  summary.total.capacityKw = cents / 100
  return summary
}

export const PROJECT_RULES = {
  nameMin: 3,
  nameMax: 120,
  clientMin: 2,
  clientMax: 120,
  locationMin: 2,
  locationMax: 160,
  capacityMax: 100_000,
  maxMaterials: 30,
} as const

export const PROJECT_MESSAGES = {
  nameLength: `El nombre debe tener entre ${PROJECT_RULES.nameMin} y ${PROJECT_RULES.nameMax} caracteres.`,
  clientLength: `El cliente debe tener entre ${PROJECT_RULES.clientMin} y ${PROJECT_RULES.clientMax} caracteres.`,
  locationLength: `La ubicación debe tener entre ${PROJECT_RULES.locationMin} y ${PROJECT_RULES.locationMax} caracteres.`,
  capacityRequired: 'Indica la capacidad en kW.',
  capacityFormat: 'Escribe un número válido con máximo 2 decimales (ej. 120,5).',
  capacityRange: 'La capacidad debe ser mayor que 0 y como máximo 100.000 kW.',
  startRequired: 'Indica la fecha de inicio.',
  endRequired: 'Indica la fecha estimada de finalización.',
  endBeforeStart: 'La fecha de finalización no puede ser anterior a la de inicio.',
  materialIncomplete: 'Cada material necesita un ítem del catálogo y una cantidad mayor que 0 (máx. 2 decimales).',
  materialDuplicate: 'Un mismo material aparece dos veces; suma las cantidades en una sola fila.',
  materialTooMany: `Máximo ${PROJECT_RULES.maxMaterials} materiales por proyecto.`,
} as const

const DECIMAL_2 = /^\d+([.,]\d{1,2})?$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Número con coma o punto decimal y máximo 2 decimales; null si el formato no es válido. */
export function parseDecimal(raw: string): number | null {
  const text = raw.trim()
  return DECIMAL_2.test(text) ? Number(text.replace(',', '.')) : null
}

const isValidIsoDate = (value: string): boolean =>
  ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value)

const lengthBetween = (value: string, min: number, max: number) => value.length >= min && value.length <= max

/** Valida el formulario con las MISMAS reglas que los CHECK/FK de la BD y devuelve el NewProject listo. */
export function validateProject(values: ProjectFormValues): ProjectValidationResult {
  const errors: ProjectFieldErrors = {}
  const name = values.name.trim()
  const client = values.client.trim()
  const location = values.location.trim()

  if (!lengthBetween(name, PROJECT_RULES.nameMin, PROJECT_RULES.nameMax)) errors.name = PROJECT_MESSAGES.nameLength
  if (!lengthBetween(client, PROJECT_RULES.clientMin, PROJECT_RULES.clientMax)) errors.client = PROJECT_MESSAGES.clientLength
  if (!lengthBetween(location, PROJECT_RULES.locationMin, PROJECT_RULES.locationMax)) errors.location = PROJECT_MESSAGES.locationLength

  const capacity = parseDecimal(values.capacityKw)
  if (values.capacityKw.trim() === '') errors.capacityKw = PROJECT_MESSAGES.capacityRequired
  else if (capacity === null) errors.capacityKw = PROJECT_MESSAGES.capacityFormat
  else if (capacity <= 0 || capacity > PROJECT_RULES.capacityMax) errors.capacityKw = PROJECT_MESSAGES.capacityRange

  if (!isValidIsoDate(values.startDate)) errors.startDate = PROJECT_MESSAGES.startRequired
  if (!isValidIsoDate(values.endDate)) errors.endDate = PROJECT_MESSAGES.endRequired
  else if (errors.startDate === undefined && values.endDate < values.startDate) errors.endDate = PROJECT_MESSAGES.endBeforeStart

  const materials: { materialId: string; quantity: number }[] = []
  const seen = new Set<string>()
  for (const row of values.materials) {
    const quantity = parseDecimal(row.quantity)
    if (row.materialId === '' || quantity === null || quantity <= 0) {
      errors.materials = PROJECT_MESSAGES.materialIncomplete
      break
    }
    if (seen.has(row.materialId)) {
      errors.materials = PROJECT_MESSAGES.materialDuplicate
      break
    }
    seen.add(row.materialId)
    materials.push({ materialId: row.materialId, quantity })
  }
  if (values.materials.length > PROJECT_RULES.maxMaterials) errors.materials = PROJECT_MESSAGES.materialTooMany

  if (capacity === null || Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      name,
      client,
      location,
      capacityKw: capacity,
      startDate: values.startDate,
      endDate: values.endDate,
      installerId: values.installerId === '' ? null : values.installerId,
      materials,
    },
  }
}

export const isProjectStatus = (value: string): value is ProjectStatus => (PROJECT_STATUSES as readonly string[]).includes(value)
