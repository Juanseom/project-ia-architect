import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage, projectsService, type ProjectsService } from '../services'
import {
  INSTALLER_SPECIALTIES,
  MATERIAL_UNITS,
  type Installer,
  type InstallerSpecialty,
  type Material,
  type MaterialUnit,
  type TeamMembership,
} from '../types'
import { parseDecimal } from '../utils'
import { useAuth } from './useAuth'

export interface UseTeamResult {
  loading: boolean
  error: string | null
  installers: readonly Installer[]
  materials: readonly Material[]
  /** Equipo al que pertenece el usuario como instalador (null si no está vinculado). */
  membership: TeamMembership | null
  savingInstaller: boolean
  installerError: string | null
  addInstaller: (name: string, specialty: string) => Promise<boolean>
  savingMaterial: boolean
  materialError: string | null
  addMaterial: (name: string, unit: string, unitCost: string) => Promise<boolean>
  joining: boolean
  joinError: string | null
  joinTeam: (code: string) => Promise<boolean>
}

interface TeamData {
  key: string
  installers: readonly Installer[]
  materials: readonly Material[]
  membership: TeamMembership | null
  error: string | null
}

const isSpecialty = (v: string): v is InstallerSpecialty => (INSTALLER_SPECIALTIES as readonly string[]).includes(v)
const isUnit = (v: string): v is MaterialUnit => (MATERIAL_UNITS as readonly string[]).includes(v)
const CODE_PATTERN = /^[A-Z0-9-]{6,20}$/

/** Equipo del coordinador (instaladores + catálogo) y vinculación como instalador. */
export function useTeam(service: ProjectsService = projectsService): UseTeamResult {
  const auth = useAuth()
  const userId = auth.status === 'ready' ? auth.user.id : null
  const [data, setData] = useState<TeamData | null>(null)
  const [savingInstaller, setSavingInstaller] = useState(false)
  const [installerError, setInstallerError] = useState<string | null>(null)
  const [savingMaterial, setSavingMaterial] = useState(false)
  const [materialError, setMaterialError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    if (userId === null) return
    let active = true
    Promise.all([service.listInstallers(userId), service.listMaterials(userId), service.membership(userId)])
      .then(([installers, materials, membership]) => {
        if (active) setData({ key: userId, installers, materials, membership, error: null })
      })
      .catch((e: unknown) => {
        if (active) setData({ key: userId, installers: [], materials: [], membership: null, error: getErrorMessage(e) })
      })
    return () => {
      active = false
    }
  }, [service, userId])

  const addInstaller = useCallback(
    async (name: string, specialty: string) => {
      setInstallerError(null)
      const clean = name.trim()
      if (clean.length < 2 || clean.length > 80 || !isSpecialty(specialty)) {
        setInstallerError('El nombre debe tener entre 2 y 80 caracteres y una especialidad válida.')
        return false
      }
      setSavingInstaller(true)
      try {
        const created = await service.createInstaller({ name: clean, specialty })
        setData((prev) => prev && { ...prev, installers: [...prev.installers, created].sort((a, b) => a.name.localeCompare(b.name)) })
        return true
      } catch (e: unknown) {
        setInstallerError(getErrorMessage(e))
        return false
      } finally {
        setSavingInstaller(false)
      }
    },
    [service],
  )

  const addMaterial = useCallback(
    async (name: string, unit: string, unitCost: string) => {
      setMaterialError(null)
      const clean = name.trim()
      const cost = parseDecimal(unitCost)
      if (clean.length < 2 || clean.length > 80 || !isUnit(unit) || cost === null) {
        setMaterialError('Nombre de 2 a 80 caracteres, unidad válida y costo ≥ 0 con máximo 2 decimales.')
        return false
      }
      setSavingMaterial(true)
      try {
        const created = await service.createMaterial({ name: clean, unit, unitCost: cost })
        setData((prev) => prev && { ...prev, materials: [...prev.materials, created].sort((a, b) => a.name.localeCompare(b.name)) })
        return true
      } catch (e: unknown) {
        setMaterialError(getErrorMessage(e))
        return false
      } finally {
        setSavingMaterial(false)
      }
    },
    [service],
  )

  const joinTeam = useCallback(
    async (code: string) => {
      setJoinError(null)
      const clean = code.trim().toUpperCase()
      if (!CODE_PATTERN.test(clean)) {
        setJoinError('El código tiene entre 6 y 20 letras o números.')
        return false
      }
      setJoining(true)
      try {
        const membership = await service.joinTeam(clean)
        setData((prev) => prev && { ...prev, membership })
        return true
      } catch (e: unknown) {
        setJoinError(getErrorMessage(e))
        return false
      } finally {
        setJoining(false)
      }
    },
    [service],
  )

  const current = data !== null && data.key === userId ? data : null
  return {
    loading: auth.status === 'loading' || (userId !== null && current === null),
    error: auth.status === 'error' ? auth.error : (current?.error ?? null),
    installers: current?.installers ?? [],
    materials: current?.materials ?? [],
    membership: current?.membership ?? null,
    savingInstaller,
    installerError,
    addInstaller,
    savingMaterial,
    materialError,
    addMaterial,
    joining,
    joinError,
    joinTeam,
  }
}
