// Dominio EcoFlow (proyectos de instalación solar). La UI solo conoce estos tipos; el servicio traduce
// desde las tablas proyectos / instaladores / materiales / proyecto_materiales.

export const PROJECT_STATUSES = ['pendiente', 'en_progreso', 'completado'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const INSTALLER_SPECIALTIES = ['general', 'electrica', 'estructural', 'mantenimiento'] as const
export type InstallerSpecialty = (typeof INSTALLER_SPECIALTIES)[number]

export const MATERIAL_UNITS = ['unidad', 'metro', 'kg', 'juego'] as const
export type MaterialUnit = (typeof MATERIAL_UNITS)[number]

export interface Installer {
  id: string
  name: string
  specialty: InstallerSpecialty
  /** Código de un solo uso para que el instalador vincule su usuario. */
  inviteCode: string
  linked: boolean
}

export interface Material {
  id: string
  name: string
  unit: MaterialUnit
  unitCost: number
}

export interface ProjectMaterial {
  materialId: string
  name: string
  unit: MaterialUnit
  quantity: number
}

export interface Project {
  id: string
  name: string
  client: string
  location: string
  capacityKw: number
  status: ProjectStatus
  /** Fechas ISO 'YYYY-MM-DD' (columnas date). */
  startDate: string
  endDate: string
  installer: { id: string; name: string } | null
  materials: ProjectMaterial[]
  /** true si el usuario actual es el coordinador; false si lo ve como instalador asignado. */
  managedByMe: boolean
  updatedAt: string
}

export interface NewProject {
  name: string
  client: string
  location: string
  capacityKw: number
  startDate: string
  endDate: string
  installerId: string | null
  materials: { materialId: string; quantity: number }[]
}

export interface NewInstaller {
  name: string
  specialty: InstallerSpecialty
}

export interface NewMaterial {
  name: string
  unit: MaterialUnit
  unitCost: number
}

/** Equipo al que pertenece el usuario como instalador (o null si no está vinculado). */
export interface TeamMembership {
  installerId: string
  installerName: string
}

export interface ProjectsSummary {
  byStatus: Record<ProjectStatus, { count: number; capacityKw: number }>
  total: { count: number; capacityKw: number }
}

// ---- Formulario de proyecto (valores crudos de los inputs)
export interface ProjectMaterialRow {
  /** Clave estable para la lista (no es el id del material). */
  key: string
  materialId: string
  quantity: string
}

export interface ProjectFormValues {
  name: string
  client: string
  location: string
  capacityKw: string
  startDate: string
  endDate: string
  installerId: string
  materials: ProjectMaterialRow[]
}

export type ProjectField = 'name' | 'client' | 'location' | 'capacityKw' | 'startDate' | 'endDate' | 'materials'
export const PROJECT_FIELDS: readonly ProjectField[] = ['name', 'client', 'location', 'capacityKw', 'startDate', 'endDate', 'materials']
export type ProjectFieldErrors = Partial<Record<ProjectField, string>>

export type ProjectValidationResult = { ok: true; value: NewProject } | { ok: false; errors: ProjectFieldErrors }

/** Pedido de foco hacia un campo del formulario de proyecto (el token permite repetir el mismo campo). */
export interface ProjectFocusRequest {
  field: ProjectField
  token: number
}

export type ProjectsState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'empty' }
  | { status: 'success'; projects: readonly Project[] }

export type ProjectStatusFilter = ProjectStatus | 'todos'
