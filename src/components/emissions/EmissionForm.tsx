import type { FormEvent } from 'react'
import { EMISSION_CATEGORIES, type EmissionFormValues } from '../../types'
import { formatCategory } from '../../utils'
import { Button } from '../ui'

export interface EmissionFormProps {
  values: EmissionFormValues
  onChange: <K extends keyof EmissionFormValues>(field: K, value: EmissionFormValues[K]) => void
  onSubmit: () => void
  isSubmitting: boolean
  /** Error del último envío, ya traducido. */
  submitError?: string | null
}

/** Formulario controlado: no guarda estado propio; valores y eventos vienen por props. */
export function EmissionForm({ values, onChange, onSubmit, isSubmitting, submitError = null }: EmissionFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-ink-500/15 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Nueva medición</h2>

      <div>
        <label htmlFor="emission-source" className="block text-sm font-medium text-ink-700">Fuente</label>
        <input
          id="emission-source"
          type="text"
          value={values.source}
          onChange={(e) => onChange('source', e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink-500/30 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="emission-category" className="block text-sm font-medium text-ink-700">Categoría</label>
        <select
          id="emission-category"
          value={values.category}
          onChange={(e) => onChange('category', e.target.value as EmissionFormValues['category'])}
          className="mt-1 w-full rounded-lg border border-ink-500/30 bg-white px-3 py-2"
        >
          <option value="">Selecciona…</option>
          {EMISSION_CATEGORIES.map((category) => (
            <option key={category} value={category}>{formatCategory(category)}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="emission-co2" className="block text-sm font-medium text-ink-700">CO₂ (kg)</label>
        <input
          id="emission-co2"
          type="number"
          step="0.01"
          value={values.co2Kg}
          onChange={(e) => onChange('co2Kg', e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink-500/30 px-3 py-2"
        />
      </div>

      {submitError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{submitError}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Guardando…' : 'Agregar medición'}
      </Button>
    </form>
  )
}
