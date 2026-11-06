import { describe, expect, it } from 'vitest'
import { isEmissionCategory, parseCo2, validateEmission, VALIDATION_MESSAGES as M } from './validation'

describe('validateEmission', () => {
  it('acepta valores válidos, recorta la fuente y acepta coma decimal', () => {
    expect(validateEmission({ source: '  Caldera  ', category: 'energia', co2Kg: '845,3' })).toEqual({
      ok: true,
      value: { source: 'Caldera', category: 'energia', co2Kg: 845.3 },
    })
  })

  it('reporta un error por cada campo vacío', () => {
    expect(validateEmission({ source: '   ', category: '', co2Kg: '' })).toEqual({
      ok: false,
      errors: { source: M.sourceRequired, category: M.categoryRequired, co2Kg: M.co2Required },
    })
  })

  it.each([
    ['A', M.sourceTooShort],
    ['x'.repeat(101), M.sourceTooLong],
  ])('valida la longitud de la fuente (%#)', (source, message) => {
    const result = validateEmission({ source, category: 'energia', co2Kg: '10' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.source).toBe(message)
  })

  it.each([
    ['0', M.co2Positive],
    ['-5', M.co2Format],
    ['1.234', M.co2Format],
    ['abc', M.co2Format],
    ['1.000.000', M.co2Format],
    ['10000000000', M.co2TooLarge],
  ])('valida el CO₂ "%s"', (co2Kg, message) => {
    const result = validateEmission({ source: 'Caldera', category: 'energia', co2Kg })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors).toEqual({ co2Kg: message })
  })
})

describe('parseCo2 / isEmissionCategory', () => {
  it('convierte coma y punto decimal', () => {
    expect(parseCo2('12,5')).toBe(12.5)
    expect(parseCo2('12.50')).toBe(12.5)
    expect(parseCo2('')).toBeNull()
  })

  it('solo acepta categorías del ENUM', () => {
    expect(isEmissionCategory('energia')).toBe(true)
    expect(isEmissionCategory('agua')).toBe(false)
    expect(isEmissionCategory('')).toBe(false)
  })
})
