import { describe, expect, it } from 'vitest'
import { createMockEmissionsService } from './emissions.mock'
import { EMISSIONS_PAGE_SIZE } from '../types'
import { AppError } from './errors'

describe('createMockEmissionsService', () => {
  it('lista de la más reciente a la más antigua', async () => {
    const service = createMockEmissionsService({ latencyMs: 0 })
    const list = await service.list()
    const dates = list.map((e) => e.measuredAt)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  it('crea con trim y redondeo a 2 decimales, y lo devuelve primero', async () => {
    const service = createMockEmissionsService({ latencyMs: 0, seed: [] })
    const created = await service.create({ source: '  Caldera  ', category: 'energia', co2Kg: 10.456 })
    expect(created).toMatchObject({ source: 'Caldera', category: 'energia', co2Kg: 10.46 })
    expect((await service.list())[0]?.id).toBe(created.id)
  })

  it('aplica las mismas reglas que el CHECK de la BD', async () => {
    const service = createMockEmissionsService({ latencyMs: 0 })
    await expect(service.create({ source: 'A', category: 'energia', co2Kg: 5 })).rejects.toBeInstanceOf(AppError)
    await expect(service.create({ source: 'Caldera', category: 'energia', co2Kg: 0 })).rejects.toMatchObject({ kind: 'validation' })
    await expect(service.create({ source: 'Caldera', category: 'energia', co2Kg: Number.NaN })).rejects.toMatchObject({ kind: 'validation' })
  })

  it('pagina la lista (EMISSIONS_PAGE_SIZE) pero el resumen cuenta todas las filas', async () => {
    const seed = Array.from({ length: 70 }, (_, i) => ({
      id: `s${i}`, source: `Fuente ${i}`, category: 'residuos' as const, co2Kg: 1, measuredAt: new Date(2026, 0, 1, 0, i).toISOString(),
    }))
    const service = createMockEmissionsService({ latencyMs: 0, seed })
    expect(await service.list()).toHaveLength(EMISSIONS_PAGE_SIZE)
    expect(await service.summary()).toMatchObject({ totalKg: 70, count: 70 })
  })
})

