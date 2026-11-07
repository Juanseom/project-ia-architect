import { env } from '../config'
import {
  type Installer,
  type Material,
  type NewInstaller,
  type NewMaterial,
  type NewProject,
  type Project,
  type ProjectStatus,
  type ProjectsSummary,
  type TeamMembership,
} from '../types'
import { summarizeProjects } from '../utils'
import { AppError, toAppError } from './errors'
import { getSupabase, type Database } from './supabase'

/** Contrato del dominio EcoFlow. Hooks y tests dependen de esto, no de Supabase. */
export interface ProjectsService {
  /** Proyectos visibles para el usuario (RLS: los que coordina + los que tiene asignados como instalador). */
  listProjects(userId: string): Promise<Project[]>
  /** Conteo y kW por estado, agregados en la BD (vista proyectos_resumen). */
  summary(): Promise<ProjectsSummary>
  /** Crea proyecto + materiales de forma atómica (RPC crear_proyecto, security invoker). Devuelve el id. */
  createProject(input: NewProject): Promise<string>
  /** Cambia el estado vía RPC (la BD valida actor y transición). Devuelve el estado final. */
  changeStatus(projectId: string, status: ProjectStatus): Promise<ProjectStatus>
  /** Equipo del coordinador actual. */
  listInstallers(userId: string): Promise<Installer[]>
  createInstaller(input: NewInstaller): Promise<Installer>
  /** Catálogo de materiales del coordinador actual. */
  listMaterials(userId: string): Promise<Material[]>
  createMaterial(input: NewMaterial): Promise<Material>
  /** Ficha de instalador vinculada al usuario actual (si es instalador de algún equipo). */
  membership(userId: string): Promise<TeamMembership | null>
  /** Canjea un código de invitación (RPC vincular_instalador). */
  joinTeam(code: string): Promise<TeamMembership>
}

type Tables = Database['public']['Tables']
type InstallerRow = Pick<Tables['instaladores']['Row'], 'id' | 'nombre' | 'especialidad' | 'codigo_invitacion' | 'user_id'>
type MaterialRow = Pick<Tables['materiales']['Row'], 'id' | 'nombre' | 'unidad' | 'costo_unitario'>

const INSTALLER_COLUMNS = 'id, nombre, especialidad, codigo_invitacion, user_id'
const MATERIAL_COLUMNS = 'id, nombre, unidad, costo_unitario'
// Embeds de PostgREST por las FK compuestas; coordinador_id solo se usa para calcular managedByMe.
const PROJECT_COLUMNS = `id, coordinador_id, nombre, cliente, ubicacion, capacidad_kw, estado, fecha_inicio, fecha_fin_estimada, updated_at,
  instalador:instaladores!proyectos_instalador_fkey(id, nombre),
  proyecto_materiales(cantidad, material:materiales!proyecto_materiales_material_fkey(id, nombre, unidad))`

const toInstaller = (row: InstallerRow): Installer => ({
  id: row.id,
  name: row.nombre,
  specialty: row.especialidad,
  inviteCode: row.codigo_invitacion,
  linked: row.user_id !== null,
})

const toMaterial = (row: MaterialRow): Material => ({
  id: row.id,
  name: row.nombre,
  unit: row.unidad,
  unitCost: Number(row.costo_unitario),
})

async function client() {
  try {
    return await getSupabase()
  } catch (error) {
    throw new AppError('config', error instanceof Error ? error.message : String(error), { cause: error })
  }
}

export const supabaseProjectsService: ProjectsService = {
  async listProjects(userId) {
    const { data, error } = await (await client())
      .from('proyectos')
      .select(PROJECT_COLUMNS)
      .order('updated_at', { ascending: false })
      .limit(200)
    if (error) throw toAppError(error)
    return data.map((row) => ({
      id: row.id,
      name: row.nombre,
      client: row.cliente,
      location: row.ubicacion,
      capacityKw: Number(row.capacidad_kw),
      status: row.estado,
      startDate: row.fecha_inicio,
      endDate: row.fecha_fin_estimada,
      installer: row.instalador ? { id: row.instalador.id, name: row.instalador.nombre } : null,
      materials: row.proyecto_materiales.flatMap((pm) =>
        pm.material ? [{ materialId: pm.material.id, name: pm.material.nombre, unit: pm.material.unidad, quantity: Number(pm.cantidad) }] : [],
      ),
      managedByMe: row.coordinador_id === userId,
      updatedAt: row.updated_at,
    }))
  },

  async summary() {
    const { data, error } = await (await client()).from('proyectos_resumen').select('estado, proyectos, capacidad_kw')
    if (error) throw toAppError(error)
    return summarizeProjects(
      data.map((row) => ({ status: row.estado, count: row.proyectos ?? 0, capacityKw: Number(row.capacidad_kw ?? 0) })),
    )
  },

  async createProject(input) {
    const { data, error } = await (await client()).rpc('crear_proyecto', {
      p_nombre: input.name,
      p_cliente: input.client,
      p_ubicacion: input.location,
      p_capacidad_kw: input.capacityKw,
      p_fecha_inicio: input.startDate,
      p_fecha_fin_estimada: input.endDate,
      ...(input.installerId === null ? {} : { p_instalador_id: input.installerId }),
      p_materiales: input.materials.map((m) => ({ material_id: m.materialId, cantidad: m.quantity })),
    })
    if (error) throw toAppError(error)
    return data.id
  },

  async changeStatus(projectId, status) {
    const { data, error } = await (await client()).rpc('cambiar_estado_proyecto', { p_proyecto_id: projectId, p_estado: status })
    if (error) throw toAppError(error)
    return data.estado
  },

  async listInstallers(userId) {
    const { data, error } = await (await client())
      .from('instaladores')
      .select(INSTALLER_COLUMNS)
      .eq('coordinador_id', userId)
      .order('nombre')
    if (error) throw toAppError(error)
    return data.map(toInstaller)
  },

  async createInstaller(input) {
    const { data, error } = await (await client())
      .from('instaladores')
      .insert({ nombre: input.name.trim(), especialidad: input.specialty })
      .select(INSTALLER_COLUMNS)
      .single()
    if (error) throw toAppError(error)
    return toInstaller(data)
  },

  async listMaterials(userId) {
    const { data, error } = await (await client())
      .from('materiales')
      .select(MATERIAL_COLUMNS)
      .eq('coordinador_id', userId)
      .order('nombre')
    if (error) throw toAppError(error)
    return data.map(toMaterial)
  },

  async createMaterial(input) {
    const { data, error } = await (await client())
      .from('materiales')
      .insert({ nombre: input.name.trim(), unidad: input.unit, costo_unitario: input.unitCost })
      .select(MATERIAL_COLUMNS)
      .single()
    if (error) throw toAppError(error)
    return toMaterial(data)
  },

  async membership(userId) {
    const { data, error } = await (await client()).from('instaladores').select('id, nombre').eq('user_id', userId).maybeSingle()
    if (error) throw toAppError(error)
    return data ? { installerId: data.id, installerName: data.nombre } : null
  },

  async joinTeam(code) {
    const { data, error } = await (await client()).rpc('vincular_instalador', { p_codigo: code })
    if (error) throw toAppError(error)
    return { installerId: data.id, installerName: data.nombre }
  },
}

// Mock solo en modo demo, cargado con import() (no viaja en el bundle de producción; lección del Lab 5).
let implPromise: Promise<ProjectsService> | null = null
const impl = (): Promise<ProjectsService> =>
  (implPromise ??= env.useMock
    ? import('./projects.mock').then((m) => m.createMockProjectsService())
    : Promise.resolve(supabaseProjectsService))

/** Servicio que usa la app: Supabase o mock según VITE_USE_MOCK. */
export const projectsService: ProjectsService = {
  listProjects: async (userId) => (await impl()).listProjects(userId),
  summary: async () => (await impl()).summary(),
  createProject: async (input) => (await impl()).createProject(input),
  changeStatus: async (id, status) => (await impl()).changeStatus(id, status),
  listInstallers: async (userId) => (await impl()).listInstallers(userId),
  createInstaller: async (input) => (await impl()).createInstaller(input),
  listMaterials: async (userId) => (await impl()).listMaterials(userId),
  createMaterial: async (input) => (await impl()).createMaterial(input),
  membership: async (userId) => (await impl()).membership(userId),
  joinTeam: async (code) => (await impl()).joinTeam(code),
}
