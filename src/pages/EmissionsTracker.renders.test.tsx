import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { UseEmissionsResult } from '../hooks'
import type { Emission } from '../types'
import { summarizeEmissions } from '../utils'

// Contador de renders de tarjetas: formatMeasuredAt solo lo llama EmissionCard.
const spy = vi.hoisted(() => ({ cardRenders: 0 }))
vi.mock('../utils', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../utils')>()
  return {
    ...mod,
    formatMeasuredAt: (iso: string) => {
      spy.cardRenders++
      return mod.formatMeasuredAt(iso)
    },
  }
})

const DATA: Emission[] = Array.from({ length: 20 }, (_, i) => ({
  id: String(i),
  source: `Fuente ${i}`,
  category: 'energia',
  co2Kg: i + 1,
  measuredAt: '2026-11-05T00:00:00Z',
}))

// useEmissions real devuelve referencias estables mientras no cambien los datos; el mock lo imita.
const RESULT: UseEmissionsResult = {
  state: { status: 'success', emissions: DATA },
  summary: summarizeEmissions(DATA),
  canSubmit: true,
  isSubmitting: false,
  submitError: null,
  addEmission: async () => true,
  reload: () => {},
}
vi.mock('../hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks')>()),
  useEmissions: () => RESULT,
}))

const { EmissionsTracker } = await import('./EmissionsTracker')

describe('EmissionsTracker — re-renders', () => {
  it('escribir en el formulario no re-renderiza las 20 tarjetas (React.memo + referencias estables)', async () => {
    render(<EmissionsTracker />)
    expect(spy.cardRenders).toBe(20)

    await userEvent.type(screen.getByLabelText('Fuente de emisión'), 'Caldera 01')

    // Iteración 2 (sin memo): 200 renders de tarjetas para estos mismos 10 caracteres.
    expect(spy.cardRenders - 20).toBe(0)
  })
})
