// Traducción de errores técnicos (PostgrestError, AuthError, fallos de red, configuración)
// a un error de dominio con mensaje en español. La UI nunca muestra el error crudo de Postgres.

export type AppErrorKind = 'config' | 'auth' | 'permission' | 'validation' | 'rateLimit' | 'network' | 'unknown'

export class AppError extends Error {
  readonly kind: AppErrorKind

  constructor(kind: AppErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'AppError'
    this.kind = kind
  }
}

export const ERROR_MESSAGES = {
  network: 'No hay conexión con el servidor de datos. Revisa tu conexión e inténtalo de nuevo.',
  permission: 'No tienes permiso para esta operación. Recarga la página para renovar tu sesión.',
  sessionExpired: 'Tu sesión expiró. Recarga la página para continuar.',
  anonymousDisabled: 'El acceso de invitado está deshabilitado en el servidor (enable_anonymous_sign_ins).',
  checkViolation: 'Algún dato no cumple las reglas: la fuente debe tener entre 2 y 100 caracteres y el CO₂ debe ser mayor que 0.',
  invalidValue: 'Hay un valor con formato inválido. Revisa la categoría y el valor de CO₂.',
  tooLarge: 'El valor de CO₂ es demasiado grande (máximo 9.999.999.999,99 kg).',
  rateLimitBatch: 'Solo se pueden enviar hasta 10 mediciones por solicitud.',
  rateLimitMinute: 'Estás registrando mediciones muy rápido. Espera un minuto e inténtalo de nuevo.',
  quota: 'Tu cuenta alcanzó el máximo de 5000 mediciones.',
  unknown: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
} as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const readString = (record: Record<string, unknown>, key: string): string =>
  typeof record[key] === 'string' ? record[key] : ''

const NETWORK_PATTERN = /failed to fetch|fetch failed|networkerror|network request failed|load failed/i

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (!isRecord(error)) return new AppError('unknown', ERROR_MESSAGES.unknown, { cause: error })

  const code = readString(error, 'code')
  const name = readString(error, 'name')
  const message = readString(error, 'message')
  const hint = readString(error, 'hint')

  if (name === 'AuthRetryableFetchError' || NETWORK_PATTERN.test(message)) {
    return new AppError('network', ERROR_MESSAGES.network, { cause: error })
  }

  switch (code) {
    case '42501': // insufficient_privilege / violación de política RLS
      return new AppError('permission', ERROR_MESSAGES.permission, { cause: error })
    case 'PGRST301':
    case 'PGRST303':
      return new AppError('auth', ERROR_MESSAGES.sessionExpired, { cause: error })
    case 'anonymous_provider_disabled':
      return new AppError('auth', ERROR_MESSAGES.anonymousDisabled, { cause: error })
    case '23514': // check_violation
    case '23502': // not_null_violation
      return new AppError('validation', ERROR_MESSAGES.checkViolation, { cause: error })
    case '22P02': // invalid_text_representation (ej. valor fuera del ENUM)
      return new AppError('validation', ERROR_MESSAGES.invalidValue, { cause: error })
    case 'PT429': // límite de escritura del trigger emisiones_limitar_escrituras (PostgREST → HTTP 429)
      if (hint === 'rate_limit_lote') return new AppError('rateLimit', ERROR_MESSAGES.rateLimitBatch, { cause: error })
      if (hint === 'cuota_total') return new AppError('rateLimit', ERROR_MESSAGES.quota, { cause: error })
      return new AppError('rateLimit', ERROR_MESSAGES.rateLimitMinute, { cause: error })
    case '22003': // numeric_value_out_of_range
      return new AppError('validation', ERROR_MESSAGES.tooLarge, { cause: error })
    default:
      return new AppError('unknown', ERROR_MESSAGES.unknown, { cause: error })
  }
}

/** Mensaje listo para la UI a partir de cualquier valor lanzado (`catch (e: unknown)`). */
export const getErrorMessage = (error: unknown): string => toAppError(error).message
