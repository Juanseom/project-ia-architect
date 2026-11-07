import type {
  Installer,
  Material,
  NewProject,
  Project,
  ProjectStatus,
  TeamMembership,
} from '../types'
import { allowedTransitions, summarizeProjects } from '../utils'
import { AppError, ERROR_MESSAGES } from './errors'
import type { ProjectsService } from './projects.service'

/**
 * EcoFlow en memoria (modo demo y tests). Replica las reglas de la BD: transiciones de la RPC,
 * códigos de invitación de un solo uso e integridad "mismo equipo" de las FK compuestas.
 * Incluye un equipo externo para poder probar la vista de instalador con el código DEMO-EXTERNO.
 */
export interface MockProjectsOptions {
  latencyMs?: number
  /** Sin datos semilla (útil en tests). */
  empty?: boolean
}

const EXTERNAL_CODE = 'DEMO-EXTERNO'

export function createMockProjectsService({ latencyMs = 500, empty = false }: MockProjectsOptions = {}): ProjectsService {
  const wait = () => new Promise<void>((resolve) => setTimeout(resolve, latencyMs))
  let seq = 0
  const id = (prefix: string) => `${prefix}-${++seq}`

  let installers: Installer[] = empty
    ? []
    : [
        { id: 'inst-ana', name: 'Ana Solar', specialty: 'electrica', inviteCode: 'A1B2C3D4E5', linked: true },
        { id: 'inst-luis', name: 'Luis Techo', specialty: 'estructural', inviteCode: 'F6A7B8C9D0', linked: false },
      ]
  let materials: Material[] = empty
    ? []
    : [
        { id: 'mat-panel', name: 'Panel solar 550 W', unit: 'unidad', unitCost: 520000 },
        { id: 'mat-inversor', name: 'Inversor 10 kW', unit: 'unidad', unitCost: 6800000 },
        { id: 'mat-cable', name: 'Cable solar 6 mm²', unit: 'metro', unitCost: 7500 },
      ]
  type StoredProject = Omit<Project, 'managedByMe'> & { external: boolean }
  let projects: StoredProject[] = empty
    ? []
    : [
        {
          id: 'proj-1', name: 'Granja Solar Norte', client: 'Hacienda La Esperanza', location: 'Tunja, Boyacá', capacityKw: 120.5,
          status: 'en_progreso', startDate: '2026-11-03', endDate: '2026-12-20', installer: { id: 'inst-ana', name: 'Ana Solar' },
          materials: [{ materialId: 'mat-panel', name: 'Panel solar 550 W', unit: 'unidad', quantity: 220 }], updatedAt: '2026-11-05T10:00:00Z', external: false,
        },
        {
          id: 'proj-2', name: 'Techo Colegio San José', client: 'Colegio San José', location: 'Bogotá', capacityKw: 35,
          status: 'pendiente', startDate: '2026-11-15', endDate: '2026-11-30', installer: null, materials: [], updatedAt: '2026-11-04T10:00:00Z', external: false,
        },
        {
          id: 'proj-3', name: 'Bodega Logística Sur', client: 'Transportes Andinos', location: 'Soacha', capacityKw: 80,
          status: 'completado', startDate: '2026-09-01', endDate: '2026-10-15', installer: { id: 'inst-luis', name: 'Luis Techo' },
          materials: [{ materialId: 'mat-inversor', name: 'Inversor 10 kW', unit: 'unidad', quantity: 8 }], updatedAt: '2026-10-15T10:00:00Z', external: false,
        },
      ]
  let membership: TeamMembership | null = null
  let externalCodeUsed = false

  const visible = () => projects.filter((p) => !p.external || membership !== null)

  return {
    async listProjects() {
      await wait()
      return visible().map(({ external, ...p }) => ({ ...p, managedByMe: !external }))
    },

    async summary() {
      await wait()
      return summarizeProjects(visible().map((p) => ({ status: p.status, count: 1, capacityKw: p.capacityKw })))
    },

    async createProject(input: NewProject) {
      await wait()
      const installer = input.installerId === null ? null : installers.find((i) => i.id === input.installerId)
      if (installer === undefined) throw new AppError('validation', ERROR_MESSAGES.invalidReference)
      const projectMaterials = input.materials.map((m) => {
        const material = materials.find((x) => x.id === m.materialId)
        if (!material) throw new AppError('validation', ERROR_MESSAGES.invalidReference)
        return { materialId: material.id, name: material.name, unit: material.unit, quantity: m.quantity }
      })
      const newId = id('proj')
      projects = [
        {
          id: newId, name: input.name, client: input.client, location: input.location, capacityKw: input.capacityKw,
          status: 'pendiente', startDate: input.startDate, endDate: input.endDate,
          installer: installer ? { id: installer.id, name: installer.name } : null,
          materials: projectMaterials, updatedAt: new Date().toISOString(), external: false,
        },
        ...projects,
      ]
      return newId
    },

    async changeStatus(projectId: string, status: ProjectStatus) {
      await wait()
      const project = visible().find((p) => p.id === projectId)
      if (!project) throw new AppError('notFound', ERROR_MESSAGES.notFound)
      if (project.status === status) return status
      if (status === 'en_progreso' && project.status === 'pendiente' && project.installer === null) {
        throw new AppError('validation', 'Asigna un instalador antes de iniciar el proyecto.')
      }
      if (!allowedTransitions(project.status, !project.external, project.installer !== null).includes(status)) {
        throw new AppError('validation', `Transición no permitida: ${project.status} → ${status}.`)
      }
      projects = projects.map((p) => (p.id === projectId ? { ...p, status, updatedAt: new Date().toISOString() } : p))
      return status
    },

    async listInstallers() {
      await wait()
      return installers
    },

    async createInstaller(input) {
      await wait()
      const created: Installer = { id: id('inst'), name: input.name.trim(), specialty: input.specialty, inviteCode: Math.random().toString(16).slice(2, 12).toUpperCase(), linked: false }
      installers = [...installers, created].sort((a, b) => a.name.localeCompare(b.name))
      return created
    },

    async listMaterials() {
      await wait()
      return materials
    },

    async createMaterial(input) {
      await wait()
      if (materials.some((m) => m.name.toLowerCase() === input.name.trim().toLowerCase())) throw new AppError('conflict', ERROR_MESSAGES.duplicate)
      const created: Material = { id: id('mat'), name: input.name.trim(), unit: input.unit, unitCost: input.unitCost }
      materials = [...materials, created].sort((a, b) => a.name.localeCompare(b.name))
      return created
    },

    async membership() {
      await wait()
      return membership
    },

    async joinTeam(code: string) {
      await wait()
      if (membership !== null) throw new AppError('validation', 'Tu usuario ya está vinculado a un equipo.')
      if (installers.some((i) => i.inviteCode === code.trim().toUpperCase())) throw new AppError('validation', 'Ese código es de tu propio equipo.')
      if (code.trim().toUpperCase() !== EXTERNAL_CODE || externalCodeUsed) throw new AppError('validation', 'Código inválido o ya utilizado.')
      externalCodeUsed = true
      membership = { installerId: 'inst-externo', installerName: 'Instalador demo (Equipo Andes)' }
      projects = [
        {
          id: 'proj-ext', name: 'Parque Solar Andes', client: 'Equipo Andes', location: 'Villa de Leyva', capacityKw: 250, status: 'pendiente',
          startDate: '2026-11-20', endDate: '2027-01-30', installer: { id: 'inst-externo', name: membership.installerName }, materials: [],
          updatedAt: new Date().toISOString(), external: true,
        },
        ...projects,
      ]
      return membership
    },
  }
}
