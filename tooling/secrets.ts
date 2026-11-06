// Detección de claves de Supabase que NUNCA deben llegar al navegador (Lab 5, hallazgo H3).
// Se usa en el build (plugin noClientSecrets) y se replica en src/config/env.ts para la verificación en ejecución.

const JWT_PATTERN = /eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g

/** Claves secretas del formato nuevo de Supabase (prefijo + al menos 20 caracteres; el literal 'sb_secret_' solo no cuenta). */
const SECRET_KEY_PATTERN = /sb_secret_[\w-]{20,}/

const decodeJwtRole = (jwt: string): string | null => {
  const payload = jwt.split('.')[1]
  if (payload === undefined) return null
  try {
    const json: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return typeof json === 'object' && json !== null && 'role' in json && typeof json.role === 'string' ? json.role : null
  } catch {
    return null
  }
}

/** true si el valor es una clave secreta (sb_secret_… o JWT con role = service_role). */
export function isSecretKey(value: string): boolean {
  if (SECRET_KEY_PATTERN.test(value)) return true
  return [...value.matchAll(JWT_PATTERN)].some(([jwt]) => decodeJwtRole(jwt) === 'service_role')
}
