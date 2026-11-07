import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../context'
import type { ProjectsService } from '../services'
import { createMockProjectsService } from '../services/projects.mock'
import { useProjects } from './useProjects'
import { useTeam } from './useTeam'

const READY: AuthContextValue = { status: 'ready', user: { id: 'coord-1', isAnonymous: true }, retry: () => {}, signOut: async () => {} }
const wrapper = ({ children }: { children: ReactNode }) => <AuthContext.Provider value={READY}>{children}</AuthContext.Provider>
const NEW_PROJECT = { name: 'Techo Hospital', client: 'Hospital Central', location: 'Neiva', capacityKw: 60, startDate: '2026-12-01', endDate: '2026-12-31', installerId: 'inst-ana', materials: [{ materialId: 'mat-panel', quantity: 100 }] }

describe('useProjects', () => {
  it('carga proyectos y el resumen, y agrupa el tablero por estado', async () => {
    const { result } = renderHook(() => useProjects(createMockProjectsService({ latencyMs: 0 })), { wrapper })
    expect(result.current.state.status).toBe('loading')
    await waitFor(() => expect(result.current.state.status).toBe('success'))
    expect(result.current.summary?.total).toEqual({ count: 3, capacityKw: 235.5 })
    expect(result.current.board.pendiente.map((p) => p.name)).toEqual(['Techo Colegio San José'])
    expect(result.current.board.en_progreso).toHaveLength(1)
  })

  it('el filtro deja solo la columna elegida', async () => {
    const { result } = renderHook(() => useProjects(createMockProjectsService({ latencyMs: 0 })), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('success'))
    act(() => result.current.setFilter('completado'))
    expect(result.current.board.pendiente).toHaveLength(0)
    expect(result.current.board.completado).toHaveLength(1)
  })

  it('cambia el estado con la regla de la BD y actualiza el resumen', async () => {
    const { result } = renderHook(() => useProjects(createMockProjectsService({ latencyMs: 0 })), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('success'))
    await act(async () => result.current.changeStatus('proj-1', 'completado'))
    expect(result.current.board.completado.map((p) => p.id)).toContain('proj-1')
    expect(result.current.summary?.byStatus.completado.count).toBe(2)
    expect(result.current.pendingIds.size).toBe(0)
  })

  it('muestra el error de negocio de la BD (sin instalador) y no cambia nada', async () => {
    const { result } = renderHook(() => useProjects(createMockProjectsService({ latencyMs: 0 })), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('success'))
    await act(async () => result.current.changeStatus('proj-2', 'en_progreso'))
    expect(result.current.actionError).toBe('Asigna un instalador antes de iniciar el proyecto.')
    expect(result.current.board.pendiente.map((p) => p.id)).toContain('proj-2')
  })

  it('crea un proyecto y recarga con sus relaciones', async () => {
    const service = createMockProjectsService({ latencyMs: 0 })
    const list = vi.spyOn(service, 'listProjects')
    const { result } = renderHook(() => useProjects(service), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('success'))
    let ok = false
    await act(async () => {
      ok = await result.current.createProject(NEW_PROJECT)
    })
    expect(ok).toBe(true)
    await waitFor(() => expect(result.current.board.pendiente.map((p) => p.name)).toContain('Techo Hospital'))
    expect(list).toHaveBeenCalledTimes(2)
    const created = result.current.board.pendiente.find((p) => p.name === 'Techo Hospital')
    expect(created?.installer?.name).toBe('Ana Solar')
    expect(created?.materials[0]?.quantity).toBe(100)
  })

  it('si la BD rechaza la creación expone createError y no recarga', async () => {
    const mock = createMockProjectsService({ latencyMs: 0 })
    const service: ProjectsService = { ...mock, createProject: () => Promise.reject({ code: '23503', message: 'violates foreign key constraint "proyectos_instalador_fkey"' }) }
    const { result } = renderHook(() => useProjects(service), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('success'))
    await act(async () => {
      await result.current.createProject(NEW_PROJECT)
    })
    expect(result.current.createError).toBe('El instalador o material seleccionado no es válido para tu equipo.')
  })

  it('vacío cuando el usuario no tiene proyectos (resumen en cero, no null)', async () => {
    const { result } = renderHook(() => useProjects(createMockProjectsService({ latencyMs: 0, empty: true })), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('empty'))
    expect(result.current.summary?.total.count).toBe(0)
  })
})

describe('useTeam', () => {
  it('valida antes de llamar a la BD y agrega instaladores con su código', async () => {
    const service = createMockProjectsService({ latencyMs: 0 })
    const create = vi.spyOn(service, 'createInstaller')
    const { result } = renderHook(() => useTeam(service), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.addInstaller('A', 'general')
    })
    expect(result.current.installerError).toMatch(/entre 2 y 80/)
    expect(create).not.toHaveBeenCalled()
    await act(async () => {
      await result.current.addInstaller('Marta Inversores', 'electrica')
    })
    const marta = result.current.installers.find((i) => i.name === 'Marta Inversores')
    expect(marta?.inviteCode).toMatch(/^[0-9A-F]{6,}$/)
  })

  it('vincularse: código propio rechazado, código válido una sola vez', async () => {
    const { result } = renderHook(() => useTeam(createMockProjectsService({ latencyMs: 0 })), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.joinTeam('A1B2C3D4E5')
    })
    expect(result.current.joinError).toBe('Ese código es de tu propio equipo.')
    await act(async () => {
      await result.current.joinTeam('demo-externo')
    })
    expect(result.current.membership?.installerName).toMatch(/Equipo Andes/)
  })
})
