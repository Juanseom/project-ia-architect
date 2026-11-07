import { describe, expect, it } from 'vitest'
import { AppError, ERROR_MESSAGES, toAppError } from './errors'

describe('toAppError', () => {
  it.each([
    [{ code: '42501', message: 'new row violates row-level security policy for table "emisiones"' }, 'permission', ERROR_MESSAGES.permission],
    [{ code: '23514', message: 'new row violates check constraint "emisiones_co2_kg_check"' }, 'validation', ERROR_MESSAGES.checkViolation],
    [{ code: '22P02', message: 'invalid input value for enum categoria_emision: "agua"' }, 'validation', ERROR_MESSAGES.invalidValue],
    [{ code: '22003', message: 'numeric field overflow' }, 'validation', ERROR_MESSAGES.tooLarge],
    [{ code: '', message: 'TypeError: Failed to fetch' }, 'network', ERROR_MESSAGES.network],
    [{ name: 'AuthRetryableFetchError', message: 'fetch failed' }, 'network', ERROR_MESSAGES.network],
    [{ code: 'PT429', hint: 'rate_limit_lote', message: 'Máximo 10 mediciones por solicitud (recibidas: 5000).' }, 'rateLimit', ERROR_MESSAGES.rateLimitBatch],
    [{ code: 'PT429', hint: 'rate_limit_minuto', message: 'Demasiadas mediciones en el último minuto (40).' }, 'rateLimit', ERROR_MESSAGES.rateLimitMinute],
    [{ code: 'PT429', hint: 'cuota_total', message: 'Se alcanzó el máximo de 5000 mediciones por cuenta.' }, 'rateLimit', ERROR_MESSAGES.quota],
    [{ code: 'P0001', hint: 'transicion_invalida', message: 'Transición no permitida: pendiente → completado.' }, 'validation', 'Transición no permitida: pendiente → completado.'],
    [{ code: 'P0001', hint: 'codigo_invalido', message: 'Código inválido o ya utilizado.' }, 'validation', 'Código inválido o ya utilizado.'],
    [{ code: 'P0002', message: 'Proyecto no encontrado.' }, 'notFound', ERROR_MESSAGES.notFound],
    [{ code: '23503', message: 'violates foreign key constraint "proyectos_instalador_fkey"' }, 'validation', ERROR_MESSAGES.invalidReference],
    [{ code: '23505', message: 'duplicate key value violates unique constraint "materiales_nombre_por_coordinador_key"' }, 'conflict', ERROR_MESSAGES.duplicate],
    [{ code: 'anonymous_provider_disabled', message: 'Anonymous sign-ins are disabled' }, 'auth', ERROR_MESSAGES.anonymousDisabled],
  ])('traduce %o', (raw, kind, message) => {
    const error = toAppError(raw)
    expect(error.kind).toBe(kind)
    expect(error.message).toBe(message)
    expect(error.cause).toBe(raw)
  })

  it('un P0001 sin hint conocido NO muestra el mensaje crudo', () => {
    expect(toAppError({ code: 'P0001', hint: 'otro', message: 'detalle interno' }).message).toBe(ERROR_MESSAGES.unknown)
  })

  it('nunca expone el mensaje crudo de Postgres para códigos desconocidos', () => {
    const error = toAppError({ code: 'XX000', message: 'internal error at pg_foo.c:123' })
    expect(error.message).toBe(ERROR_MESSAGES.unknown)
  })

  it('devuelve el mismo AppError si ya lo es y tolera valores no-objeto', () => {
    const original = new AppError('config', 'Falta configurar')
    expect(toAppError(original)).toBe(original)
    expect(toAppError('boom').kind).toBe('unknown')
  })
})
