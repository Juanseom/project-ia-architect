import { describe, expect, it } from 'vitest'
import { parseEmissionRow } from './emissions.service'

describe('parseEmissionRow (payload de Realtime)', () => {
  const row = { id: 'x', owner_id: 'u', fuente: 'Caldera', categoria: 'energia', co2_kg: 12.5, medido_en: '2026-11-06T00:00:00+00:00' }

  it('mapea snake_case → dominio y descarta owner_id', () => {
    expect(parseEmissionRow(row)).toEqual({ id: 'x', source: 'Caldera', category: 'energia', co2Kg: 12.5, measuredAt: '2026-11-06T00:00:00+00:00' })
  })

  it('acepta co2_kg serializado como texto', () => {
    expect(parseEmissionRow({ ...row, co2_kg: '12.50' })?.co2Kg).toBe(12.5)
  })

  it.each([null, 'texto', { ...row, categoria: 'agua' }, { ...row, co2_kg: 'abc' }, { ...row, id: 1 }, {}])('rechaza payloads inválidos (%#)', (value) => {
    expect(parseEmissionRow(value)).toBeNull()
  })
})
