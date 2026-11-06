import type { Plugin } from 'vite'
import { isSecretKey } from './secrets.ts'

/**
 * Falla el build si una clave secreta de Supabase se va a exponer al cliente:
 * 1) en cualquier variable VITE_* (Vite las incrusta en el JS), y
 * 2) en cualquier archivo generado (red de seguridad por si llega por otra vía).
 */
export function noClientSecrets(): Plugin {
  return {
    name: 'ecotrack:no-client-secrets',
    apply: 'build',
    configResolved(config) {
      for (const [name, value] of Object.entries(config.env)) {
        if (name.startsWith('VITE_') && typeof value === 'string' && isSecretKey(value)) {
          throw new Error(
            `[seguridad] ${name} contiene una clave secreta de Supabase (service_role / sb_secret_). ` +
              'Las variables VITE_* se publican en el bundle: usa solo la anon/publishable key.',
          )
        }
      }
    },
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        const content = file.type === 'chunk' ? file.code : typeof file.source === 'string' ? file.source : ''
        if (isSecretKey(content)) this.error(`[seguridad] ${file.fileName} contiene una clave secreta de Supabase.`)
      }
    },
  }
}

/**
 * Content-Security-Policy para el build de producción (en desarrollo Vite inyecta scripts inline del HMR).
 * Defensa en profundidad contra XSS: solo scripts y estilos propios, y conexiones solo al proyecto Supabase.
 * Nota: frame-ancestors y HSTS no funcionan en <meta>; deben ir como cabeceras HTTP en el hosting.
 */
export function contentSecurityPolicy(supabaseUrl: string | undefined): Plugin {
  const connect = ["'self'"]
  if (supabaseUrl) {
    const url = new URL(supabaseUrl)
    connect.push(url.origin, `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`)
  }
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${connect.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return {
    name: 'ecotrack:csp',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }]
    },
  }
}
