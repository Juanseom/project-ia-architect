import { useCallback, useEffect, useMemo, useState } from 'react'
import { getErrorMessage, projectsService, type ProjectsService } from '../services'
import type { NewProject, Project, ProjectStatus, ProjectStatusFilter, ProjectsState, ProjectsSummary } from '../types'
import { useAuth } from './useAuth'

export interface UseProjectsResult {
  state: ProjectsState
  /** Conteo y kW por estado calculados en la BD (null mientras carga o con error). */
  summary: ProjectsSummary | null
  filter: ProjectStatusFilter
  setFilter: (filter: ProjectStatusFilter) => void
  /** Proyectos del filtro actual agrupados por estado (columnas del tablero). */
  board: Record<ProjectStatus, readonly Project[]>
  /** Ids con un cambio de estado en curso (deshabilita sus botones). */
  pendingIds: ReadonlySet<string>
  actionError: string | null
  changeStatus: (projectId: string, status: ProjectStatus) => Promise<void>
  isCreating: boolean
  createError: string | null
  createProject: (input: NewProject) => Promise<boolean>
  reload: () => void
}

interface LoadResult {
  key: string
  projects: readonly Project[]
  summary: ProjectsSummary | null
  error: string | null
}

const EMPTY_BOARD: Record<ProjectStatus, readonly Project[]> = { pendiente: [], en_progreso: [], completado: [] }

/** Lógica del dashboard de EcoFlow. El servicio se inyecta para probarlo con el mock. */
export function useProjects(service: ProjectsService = projectsService): UseProjectsResult {
  const auth = useAuth()
  const userId = auth.status === 'ready' ? auth.user.id : null
  const [reloadToken, setReloadToken] = useState(0)
  const [result, setResult] = useState<LoadResult | null>(null)
  const [filter, setFilter] = useState<ProjectStatusFilter>('todos')
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set())
  const [actionError, setActionError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const requestKey = userId === null ? null : `${userId}:${reloadToken}`

  useEffect(() => {
    if (requestKey === null || userId === null) return
    let active = true
    Promise.all([service.listProjects(userId), service.summary()])
      .then(([projects, summary]) => {
        if (active) setResult({ key: requestKey, projects, summary, error: null })
      })
      .catch((e: unknown) => {
        if (active) setResult({ key: requestKey, projects: [], summary: null, error: getErrorMessage(e) })
      })
    return () => {
      active = false
    }
  }, [service, requestKey, userId])

  const reload = useCallback(() => setReloadToken((n) => n + 1), [])

  const changeStatus = useCallback(
    async (projectId: string, status: ProjectStatus) => {
      setActionError(null)
      setPendingIds((prev) => new Set(prev).add(projectId))
      try {
        const finalStatus = await service.changeStatus(projectId, status)
        // El estado final lo decide la BD; el resumen se vuelve a pedir (agregado en el servidor).
        const summary = await service.summary()
        setResult(
          (prev) =>
            prev && {
              ...prev,
              summary,
              projects: prev.projects.map((p) => (p.id === projectId ? { ...p, status: finalStatus } : p)),
            },
        )
      } catch (e: unknown) {
        setActionError(getErrorMessage(e))
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev)
          next.delete(projectId)
          return next
        })
      }
    },
    [service],
  )

  const createProject = useCallback(
    async (input: NewProject): Promise<boolean> => {
      setIsCreating(true)
      setCreateError(null)
      try {
        await service.createProject(input)
        // Se recarga para traer el proyecto con sus relaciones (instalador y materiales) ya resueltas por la BD.
        setReloadToken((n) => n + 1)
        return true
      } catch (e: unknown) {
        setCreateError(getErrorMessage(e))
        return false
      } finally {
        setIsCreating(false)
      }
    },
    [service],
  )

  const current = result !== null && result.key === requestKey ? result : null
  const authError = auth.status === 'error' ? auth.error : null

  const state = useMemo<ProjectsState>(() => {
    if (authError !== null) return { status: 'error', error: authError }
    if (current === null) return { status: 'loading' }
    if (current.error !== null) return { status: 'error', error: current.error }
    if (current.projects.length === 0) return { status: 'empty' }
    return { status: 'success', projects: current.projects }
  }, [authError, current])

  // Agrupación por estado memoizada: solo cambia con los datos o el filtro (no con el formulario).
  const board = useMemo(() => {
    if (state.status !== 'success') return EMPTY_BOARD
    const grouped: Record<ProjectStatus, Project[]> = { pendiente: [], en_progreso: [], completado: [] }
    for (const project of state.projects) {
      if (filter === 'todos' || filter === project.status) grouped[project.status].push(project)
    }
    return grouped
  }, [state, filter])

  return {
    state,
    summary: state.status === 'success' || state.status === 'empty' ? (current?.summary ?? null) : null,
    filter,
    setFilter,
    board,
    pendingIds,
    actionError,
    changeStatus,
    isCreating,
    createError,
    createProject,
    reload,
  }
}
