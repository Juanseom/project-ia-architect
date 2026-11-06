import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { emissionsService, getErrorMessage, type EmissionsService } from '../services'
import type { Emission, EmissionsTotals, NewEmission, RealtimeStatus } from '../types'
import { addToTotals } from '../utils'
import { useAuth } from './useAuth'

/** Estado del listado como unión discriminada: `emissions` solo existe cuando hay datos. */
export type EmissionsState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'empty' }
  | { status: 'success'; emissions: readonly Emission[] }

export interface UseEmissionsResult {
  state: EmissionsState
  /** Total, desglose y conteo de TODAS las mediciones (calculado en la BD); null mientras carga o si falló. */
  summary: EmissionsTotals | null
  /** false si no hay sesión lista: el formulario se deshabilita. */
  canSubmit: boolean
  isSubmitting: boolean
  /** Error del último intento de inserción (no reemplaza el listado). */
  submitError: string | null
  /** Inserta una medición. Resuelve true si se guardó. */
  addEmission: (input: NewEmission) => Promise<boolean>
  reload: () => void
  /** Estado de la suscripción en tiempo real (indicador "En vivo"). */
  realtime: RealtimeStatus
}

interface LoadResult {
  key: string
  emissions: readonly Emission[]
  totals: EmissionsTotals | null
  error: string | null
}

const EMPTY: readonly Emission[] = []

/**
 * Antepone una medición si aún no está (deduplicación por id). Se usa tanto al resolver create() como al
 * recibir el eco de Realtime: el que llegue segundo no duplica, sin importar el orden.
 */
const withEmission = (prev: LoadResult | null, emission: Emission): LoadResult | null => {
  if (prev === null || prev.emissions.some((e) => e.id === emission.id)) return prev
  return {
    ...prev,
    emissions: [emission, ...prev.emissions],
    // El resumen viene de la BD; las inserciones nuevas se suman localmente sin volver a consultarlo.
    totals: prev.totals && addToTotals(prev.totals, emission),
  }
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
  const [realtime, setRealtime] = useState<RealtimeStatus>('connecting')

  // Cada carga se identifica por (usuario, reloadToken). El estado de carga se DERIVA comparando la clave
  // del último resultado con la actual: no hace falta setState síncrono dentro del efecto.
  const requestKey = userId === null ? null : `${userId}:${reloadToken}`

  const mountedRef = useRef(false) // evita setState tras desmontar en addEmission
  const submittingRef = useRef(false) // evita doble envío antes de que isSubmitting se re-renderice

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // `active` descarta respuestas de efectos ya limpiados (primer efecto de StrictMode o reload anterior).
  useEffect(() => {
    if (requestKey === null) return
    let active = true
    // Lista (últimas N) y resumen (todas, agregadas en la BD) en paralelo.
    Promise.all([service.list(), service.summary()])
      .then(([emissions, totals]) => {
        if (active) setResult({ key: requestKey, emissions, totals, error: null })
      })
      .catch((e: unknown) => {
        if (active) setResult({ key: requestKey, emissions: EMPTY, totals: null, error: getErrorMessage(e) })
      })
    return () => {
      active = false
    }
  }, [service, requestKey])

  // Tiempo real: una suscripción por usuario; se limpia (removeChannel en el servicio) al desmontar o cambiar de usuario.
  useEffect(() => {
    if (userId === null) return
    let active = true
    const unsubscribe = service.subscribeToInserts(
      userId,
      (emission) => {
        if (active) setResult((prev) => withEmission(prev, emission))
      },
      (status) => {
        if (active) setRealtime(status)
      },
    )
    return () => {
      active = false
      unsubscribe()
    }
  }, [service, userId])

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
        if (mountedRef.current) setResult((prev) => withEmission(prev, created))
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
  const authError = auth.status === 'error' ? auth.error : null

  // Memo: el objeto de estado y su arreglo solo cambian cuando cambian los datos, no cuando la página
  // se re-renderiza por el formulario. Así React.memo en EmissionList/EmissionCard puede saltarse renders.
  const state = useMemo<EmissionsState>(() => {
    if (authError !== null) return { status: 'error', error: authError }
    if (current === null) return { status: 'loading' }
    if (current.error !== null) return { status: 'error', error: current.error }
    if (current.emissions.length === 0) return { status: 'empty' }
    return { status: 'success', emissions: current.emissions }
  }, [authError, current])

  // El resumen solo se muestra si la carga fue exitosa (nunca ceros falsos mientras carga o con error).
  const summary = state.status === 'success' || state.status === 'empty' ? (current?.totals ?? null) : null

  return {
    state,
    summary,
    canSubmit: userId !== null,
    isSubmitting,
    submitError,
    addEmission,
    reload,
    realtime: userId === null ? (auth.status === 'error' ? 'offline' : 'connecting') : realtime,
  }
}
