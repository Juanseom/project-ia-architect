import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../context'
import { AppError, createMockEmissionsService, ERROR_MESSAGES, type EmissionsService } from '../services'
import type { Emission, RealtimeStatus } from '../types'
import { useEmissions } from './useEmissions'

const READY: AuthContextValue = {
  status: 'ready',
  user: { id: 'user-a', isAnonymous: true },
  retry: () => {},
  signOut: async () => {},
}

const wrapperWith = (auth: AuthContextValue) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
  }

const SEED: Emission[] = [
  { id: '1', source: 'Flota', category: 'transporte', co2Kg: 100, measuredAt: '2026-11-05T10:00:00Z' },
  { id: '2', source: 'Planta', category: 'energia', co2Kg: 50.5, measuredAt: '2026-11-04T10:00:00Z' },
]

describe('useEmissions', () => {
  it('pasa de loading a success con los datos y el resumen', async () => {
    const service = createMockEmissionsService({ latencyMs: 0, seed: SEED })
    const { result } = renderHook(() => useEmissions(service), { wrapper: wrapperWith(READY) })

    expect(result.current.state.status).toBe('loading')
    expect(result.current.summary).toBeNull()

    await waitFor(() => expect(result.current.state.status).toBe('success'))
    expect(result.current.state).toMatchObject({ status: 'success', emissions: SEED })
    expect(result.current.summary).toEqual({ totalKg: 150.5, byCategory: { transporte: 100, energia: 50.5, residuos: 0 } })
    expect(result.current.canSubmit).toBe(true)
  })

  it('muestra empty con resumen en cero cuando no hay mediciones', async () => {
    const service = createMockEmissionsService({ latencyMs: 0, seed: [] })
    const { result } = renderHook(() => useEmissions(service), { wrapper: wrapperWith(READY) })
    await waitFor(() => expect(result.current.state.status).toBe('empty'))
    expect(result.current.summary?.totalKg).toBe(0)
  })

  it('traduce el error de carga y se recupera con reload()', async () => {
    const mock = createMockEmissionsService({ latencyMs: 0, seed: SEED })
    const list = vi
      .fn<EmissionsService['list']>()
      .mockRejectedValueOnce({ code: '', message: 'TypeError: Failed to fetch' })
      .mockImplementation(() => mock.list())
    const service: EmissionsService = { ...mock, list }
    const { result } = renderHook(() => useEmissions(service), { wrapper: wrapperWith(READY) })

    await waitFor(() => expect(result.current.state).toEqual({ status: 'error', error: ERROR_MESSAGES.network }))
    expect(result.current.summary).toBeNull()

    act(() => result.current.reload())
    expect(result.current.state.status).toBe('loading')
    await waitFor(() => expect(result.current.state.status).toBe('success'))
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('addEmission antepone el registro, actualiza el resumen y resuelve true', async () => {
    const service = createMockEmissionsService({ latencyMs: 0, seed: SEED })
    const { result } = renderHook(() => useEmissions(service), { wrapper: wrapperWith(READY) })
    await waitFor(() => expect(result.current.state.status).toBe('success'))

    let saved = false
    await act(async () => {
      saved = await result.current.addEmission({ source: 'Caldera', category: 'residuos', co2Kg: 9.5 })
    })

    expect(saved).toBe(true)
    const state = result.current.state
    expect(state.status === 'success' && state.emissions[0]?.source).toBe('Caldera')
    expect(result.current.summary?.byCategory.residuos).toBe(9.5)
    expect(result.current.isSubmitting).toBe(false)
  })

  it('si la inserción falla, conserva el listado y expone submitError', async () => {
    const mock = createMockEmissionsService({ latencyMs: 0, seed: SEED })
    const service: EmissionsService = {
      ...mock,
      create: () => Promise.reject(new AppError('permission', ERROR_MESSAGES.permission)),
    }
    const { result } = renderHook(() => useEmissions(service), { wrapper: wrapperWith(READY) })
    await waitFor(() => expect(result.current.state.status).toBe('success'))

    let saved = true
    await act(async () => {
      saved = await result.current.addEmission({ source: 'Caldera', category: 'energia', co2Kg: 1 })
    })

    expect(saved).toBe(false)
    expect(result.current.submitError).toBe(ERROR_MESSAGES.permission)
    expect(result.current.state).toMatchObject({ status: 'success', emissions: SEED })
  })

  it('ignora un segundo envío mientras el primero está en curso', async () => {
    const mock = createMockEmissionsService({ latencyMs: 0, seed: [] })
    const create = vi.fn<EmissionsService['create']>((input) => mock.create(input))
    const service: EmissionsService = { ...mock, create }
    const { result } = renderHook(() => useEmissions(service), { wrapper: wrapperWith(READY) })
    await waitFor(() => expect(result.current.state.status).toBe('empty'))

    await act(async () => {
      const input = { source: 'Caldera', category: 'energia' as const, co2Kg: 1 }
      await Promise.all([result.current.addEmission(input), result.current.addEmission(input)])
    })
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('no carga sin sesión y propaga el error de autenticación', () => {
    const service = createMockEmissionsService({ latencyMs: 0 })
    const list = vi.spyOn(service, 'list')

    const loading = renderHook(() => useEmissions(service), {
      wrapper: wrapperWith({ status: 'loading', retry: () => {}, signOut: async () => {} }),
    })
    expect(loading.result.current.state.status).toBe('loading')
    expect(loading.result.current.canSubmit).toBe(false)

    const failed = renderHook(() => useEmissions(service), {
      wrapper: wrapperWith({ status: 'error', error: ERROR_MESSAGES.anonymousDisabled, retry: () => {}, signOut: async () => {} }),
    })
    expect(failed.result.current.state).toEqual({ status: 'error', error: ERROR_MESSAGES.anonymousDisabled })
    expect(list).not.toHaveBeenCalled()
  })

  it('no actualiza estado si se desmonta durante la carga', async () => {
    const service = createMockEmissionsService({ latencyMs: 20, seed: SEED })
    const errorSpy = vi.spyOn(console, 'error')
    const { unmount } = renderHook(() => useEmissions(service), { wrapper: wrapperWith(READY) })
    unmount()
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})

/** Servicio controlable para simular Realtime: `emit` entrega un INSERT como lo haría el canal. */
function createControllableService(seed: Emission[]) {
  const mock = createMockEmissionsService({ latencyMs: 0, seed })
  let listener: ((e: Emission) => void) | null = null
  let statusListener: ((s: RealtimeStatus) => void) | null = null
  const unsubscribe = vi.fn(() => {
    listener = null
  })
  const service: EmissionsService = {
    list: mock.list,
    create: mock.create,
    subscribeToInserts: (onInsert, onStatus) => {
      listener = onInsert
      statusListener = onStatus
      return unsubscribe
    },
  }
  return {
    service,
    unsubscribe,
    emit: (e: Emission) => listener?.(e),
    setStatus: (s: RealtimeStatus) => statusListener?.(s),
  }
}

const REMOTE: Emission = { id: 'remote-1', source: 'Generador (otra pestaña)', category: 'energia', co2Kg: 42, measuredAt: '2026-11-06T10:00:00Z' }

describe('useEmissions — tiempo real', () => {
  it('antepone una inserción remota, actualiza el resumen y expone el estado de conexión', async () => {
    const rt = createControllableService(SEED)
    const { result } = renderHook(() => useEmissions(rt.service), { wrapper: wrapperWith(READY) })
    await waitFor(() => expect(result.current.state.status).toBe('success'))
    expect(result.current.realtime).toBe('connecting')

    act(() => rt.setStatus('live'))
    expect(result.current.realtime).toBe('live')

    act(() => rt.emit(REMOTE))
    const state = result.current.state
    expect(state.status === 'success' && state.emissions.map((e) => e.id)).toEqual(['remote-1', '1', '2'])
    expect(result.current.summary?.byCategory.energia).toBe(92.5)
  })

  it('no duplica si el mismo evento llega dos veces', async () => {
    const rt = createControllableService(SEED)
    const { result } = renderHook(() => useEmissions(rt.service), { wrapper: wrapperWith(READY) })
    await waitFor(() => expect(result.current.state.status).toBe('success'))
    act(() => {
      rt.emit(REMOTE)
      rt.emit(REMOTE)
    })
    const state = result.current.state
    expect(state.status === 'success' && state.emissions.length).toBe(3)
  })

  it('deduplica la inserción propia cuando el eco llega DESPUÉS de create()', async () => {
    // El mock real emite el eco en un microtask posterior a resolver create().
    const service = createMockEmissionsService({ latencyMs: 0, seed: SEED })
    const { result } = renderHook(() => useEmissions(service), { wrapper: wrapperWith(READY) })
    await waitFor(() => expect(result.current.state.status).toBe('success'))
    await act(async () => {
      await result.current.addEmission({ source: 'Caldera', category: 'residuos', co2Kg: 1 })
      await Promise.resolve()
    })
    const state = result.current.state
    expect(state.status === 'success' && state.emissions.filter((e) => e.source === 'Caldera')).toHaveLength(1)
  })

  it('deduplica la inserción propia cuando el eco llega ANTES de que create() resuelva', async () => {
    const rt = createControllableService(SEED)
    const created: Emission = { id: 'own-1', source: 'Caldera', category: 'residuos', co2Kg: 1, measuredAt: '2026-11-06T11:00:00Z' }
    rt.service.create = async () => {
      rt.emit(created) // el eco de Realtime gana la carrera
      return created
    }
    const { result } = renderHook(() => useEmissions(rt.service), { wrapper: wrapperWith(READY) })
    await waitFor(() => expect(result.current.state.status).toBe('success'))
    await act(async () => {
      await result.current.addEmission({ source: 'Caldera', category: 'residuos', co2Kg: 1 })
    })
    const state = result.current.state
    expect(state.status === 'success' && state.emissions.filter((e) => e.id === 'own-1')).toHaveLength(1)
  })

  it('cancela la suscripción al desmontar y no se suscribe sin sesión', async () => {
    const rt = createControllableService(SEED)
    const { result, unmount } = renderHook(() => useEmissions(rt.service), { wrapper: wrapperWith(READY) })
    await waitFor(() => expect(result.current.state.status).toBe('success'))
    unmount()
    expect(rt.unsubscribe).toHaveBeenCalledTimes(1)

    const noSession = createControllableService(SEED)
    const subscribe = vi.spyOn(noSession.service, 'subscribeToInserts')
    renderHook(() => useEmissions(noSession.service), {
      wrapper: wrapperWith({ status: 'loading', retry: () => {}, signOut: async () => {} }),
    })
    expect(subscribe).not.toHaveBeenCalled()
  })
})

