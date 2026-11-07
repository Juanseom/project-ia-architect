import { describe, expect, it } from 'vitest'
import type { ProjectFormValues, ProjectStatus } from '../types'
import { allowedTransitions, formatProjectDate, PROJECT_MESSAGES as M, parseDecimal, summarizeProjects, validateProject } from './projects'

const valid: ProjectFormValues = {
  name: '  Granja Solar Norte ', client: 'Hacienda La Esperanza', location: 'Tunja', capacityKw: '120,5',
  startDate: '2026-11-10', endDate: '2026-12-20', installerId: 'inst-1',
  materials: [{ key: 'k1', materialId: 'mat-1', quantity: '220' }],
}

describe('validateProject (mismas reglas que los CHECK de la BD)', () => {
  it('acepta un proyecto válido, recorta textos y convierte números', () => {
    expect(validateProject(valid)).toEqual({
      ok: true,
      value: { name: 'Granja Solar Norte', client: 'Hacienda La Esperanza', location: 'Tunja', capacityKw: 120.5,
        startDate: '2026-11-10', endDate: '2026-12-20', installerId: 'inst-1', materials: [{ materialId: 'mat-1', quantity: 220 }] },
    })
  })

  it('sin instalador manda null (proyecto sin asignar)', () => {
    const r = validateProject({ ...valid, installerId: '' })
    expect(r.ok && r.value.installerId).toBeNull()
  })

  it.each<[Partial<ProjectFormValues>, keyof typeof M]>([
    [{ name: 'ab' }, 'nameLength'],
    [{ client: 'x' }, 'clientLength'],
    [{ location: ' ' }, 'locationLength'],
    [{ capacityKw: '' }, 'capacityRequired'],
    [{ capacityKw: '12.345' }, 'capacityFormat'],
    [{ capacityKw: '0' }, 'capacityRange'],
    [{ capacityKw: '100000,01' }, 'capacityRange'],
    [{ startDate: '' }, 'startRequired'],
    [{ endDate: '2026-02-30' }, 'endRequired'],
    [{ endDate: '2026-11-09' }, 'endBeforeStart'],
  ])('rechaza %o', (patch, message) => {
    const r = validateProject({ ...valid, ...patch })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.values(r.errors)).toContain(M[message])
  })

  it('valida las filas de materiales: incompletas y duplicadas', () => {
    const incomplete = validateProject({ ...valid, materials: [{ key: 'a', materialId: '', quantity: '3' }] })
    expect(!incomplete.ok && incomplete.errors.materials).toBe(M.materialIncomplete)
    const dup = validateProject({ ...valid, materials: [{ key: 'a', materialId: 'm', quantity: '1' }, { key: 'b', materialId: 'm', quantity: '2' }] })
    expect(!dup.ok && dup.errors.materials).toBe(M.materialDuplicate)
  })
})

describe('allowedTransitions (espejo de la RPC cambiar_estado_proyecto)', () => {
  const cases: [ProjectStatus, boolean, boolean, ProjectStatus[]][] = [
    ['pendiente', true, true, ['en_progreso']],
    ['pendiente', true, false, []], // sin instalador no se puede iniciar
    ['en_progreso', false, true, ['completado', 'pendiente']],
    ['completado', true, true, ['en_progreso']], // el coordinador reabre
    ['completado', false, true, []], // el instalador no
  ]
  it.each(cases)('%s (coordinador=%s, instalador=%s) → %o', (status, coord, hasInstaller, expected) => {
    expect(allowedTransitions(status, coord, hasInstaller)).toEqual(expected)
  })
})

describe('resumen y formatos', () => {
  it('summarizeProjects suma por estado y en total sin errores de coma flotante', () => {
    const s = summarizeProjects([{ status: 'pendiente', count: 1, capacityKw: 0.1 }, { status: 'pendiente', count: 2, capacityKw: 0.2 }, { status: 'completado', count: 1, capacityKw: 80 }])
    expect(s.byStatus.pendiente).toEqual({ count: 3, capacityKw: 0.3 })
    expect(s.total).toEqual({ count: 4, capacityKw: 80.3 })
  })

  it('formatProjectDate no corre la fecha un día por la zona horaria', () => {
    expect(formatProjectDate('2026-11-01')).toBe('1 nov 2026') // y no '31 oct' (los tests corren en America/Bogota)
  })

  it('parseDecimal acepta coma y punto con hasta 2 decimales', () => {
    expect(parseDecimal('120,5')).toBe(120.5)
    expect(parseDecimal('1.2.3')).toBeNull()
  })
})
