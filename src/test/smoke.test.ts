import { describe, expect, it } from 'vitest'
import { formatKgCO2 } from '../utils'

// Prueba de humo de la Fase 0: confirma que Vitest + jsdom están bien configurados.
describe('entorno de pruebas', () => {
  it('ejecuta en jsdom', () => {
    expect(typeof document).toBe('object')
  })

  it('importa utilidades del proyecto', () => {
    expect(formatKgCO2(1.5)).toBe('1.50 kg CO₂e')
  })
})
