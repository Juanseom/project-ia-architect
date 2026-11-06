import { useCallback, useEffect, useRef, useState } from 'react'
import { emissionsService, getErrorMessage, type EmissionsService } from '../services'
import type { Emission, NewEmission } from '../types'
import { useAuth } from './useAuth'

export interface UseEmissionsResult {
  emissions: Emission[]
  /** true mientras se obtiene la sesión o se cargan las mediciones. */
  loading: boolean
  /** Error de carga ya traducido para la UI (o null). */
  error: string | null
  isSubmitting: boolean
  /** Error del último intento de inserción (no reemplaza el listado). */
  submitError: string | null
  /** Inserta una medición. Resuelve true si se guardó (para limpiar el formulario solo en ese caso). */
  addEmission: (input: NewEmission) => Promise<boolean>
  reload: () => void
}

interface LoadResult {
  key: string
  emissions: Emission[]
  error: string | null
}

/**
 * Lógica del dashboard de emisiones: carga, inserción y errores.
 * El servicio se inyecta (por defecto el activo según VITE_USE_MOCK) para poder probarlo sin red.
 */
export function useEmissions(service: EmissionsService = emissionsService): UseEmissionsResult {
  const auth = useAuth()
  const userId = auth.status === 'ready' ? auth.user.id : null

  const [reloadToken, setReloadToken] = useState(0)
  const [result, setResult] = useState<LoadResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Cada carga se identifica por (usuario, reloadToken). `loading` se DERIVA comparando la clave
  // del último resultado con la actual: no hace falta setLoading(true) dentro del efecto.
  const requestKey = userId === null ? null : `${userId}:${reloadToken}`

  // Evita setState después de desmontar en operaciones iniciadas por el usuario (addEmission).
  const mountedRef = useRef(false)
  // Evita doble envío aunque el estado isSubmitting aún no se haya re-renderizado.
  const submittingRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // `active` descarta respuestas de efectos ya limpiados: en StrictMode el primer efecto se limpia
  // antes de responder, y en un reload rápido la respuesta vieja no pisa a la nueva.
  useEffect(() => {
    if (requestKey === null) return
    let active = true
    service
      .list()
      .then((emissions) => {
        if (active) setResult({ key: requestKey, emissions, error: null })
      })
      .catch((e: unknown) => {
        if (active) setResult({ key: requestKey, emissions: [], error: getErrorMessage(e) })
      })
    return () => {
      active = false
    }
  }, [service, requestKey])

  const authRetry = auth.retry
  const authFailed = auth.status === 'error'

  const reload = useCallback(() => {
    if (authFailed) authRetry()
    else setReloadToken((n) => n + 1)
  }, [authFailed, authRetry])

  const addEmission = useCallback(
    async (input: NewEmission): Promise<boolean> => {
      if (submittingRef.current) return false
      submittingRef.current = true
      setIsSubmitting(true)
      setSubmitError(null)
      try {
        const created = await service.create(input)
        if (mountedRef.current) {
          setResult((prev) =>
            prev && { ...prev, emissions: [created, ...prev.emissions.filter((e) => e.id !== created.id)] },
          )
        }
        return true
      } catch (e: unknown) {
        if (mountedRef.current) setSubmitError(getErrorMessage(e))
        return false
      } finally {
        submittingRef.current = false
        if (mountedRef.current) setIsSubmitting(false)
      }
    },
    [service],
  )

  const current = result !== null && result.key === requestKey ? result : null

  return {
    emissions: current?.emissions ?? [],
    loading: auth.status === 'loading' || (requestKey !== null && current === null),
    error: auth.status === 'error' ? auth.error : (current?.error ?? null),
    isSubmitting,
    submitError,
    addEmission,
    reload,
  }
}
