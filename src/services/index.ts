export * as inventoryService from './inventory.service'
export * as authService from './auth.service'
export { emissionsService, parseEmissionRow, supabaseEmissionsService } from './emissions.service'
export type { EmissionsService } from './emissions.service'
// El mock NO se re-exporta aquí a propósito: si el barrel lo importara, viajaría en el bundle de producción.
// Tests y modo demo lo cargan directamente desde './emissions.mock'.
export { AppError, ERROR_MESSAGES, getErrorMessage, toAppError } from './errors'
export type { AppErrorKind } from './errors'
