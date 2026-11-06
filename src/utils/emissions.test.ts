import { describe, expect, it } from 'vitest'
import type { Emission } from '../types'
import { summarizeEmissions } from './emissions'

const make = (id: string, category: Emission['category'], co2Kg: number): Emission => ({
  id,
  source: `Fuente ${id}`,
  category,
  co2Kg,
  measuredAt: '2026-11-05T00:00:00Z',
})

describe('summarizeEmissions', () => {
  it('devuelve ceros para una lista vacía', () => {
    expect(summarizeEmissions([])).toEqual({ totalKg: 0, byCategory: { transporte: 0, energia: 0, residuos: 0 } })
  })

  it('suma el total y desglosa por categoría', () => {
    const result = summarizeEmissions([make('1', 'transporte', 100.5), make('2', 'energia', 200), make('3', 'transporte', 50.25)])
    expect(result.byCategory).toEqual({ transporte: 150.75, energia: 200, residuos: 0 })
    expect(result.totalKg).toBe(350.75)
  })

  it('evita errores de coma flotante (0.1 + 0.2)', () => {
    expect(summarizeEmissions([make('1', 'residuos', 0.1), make('2', 'residuos', 0.2)]).totalKg).toBe(0.3)
  })
})
