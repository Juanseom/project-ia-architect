import { useState } from 'react'
import {
  EmissionForm,
  EmissionList,
  EmissionsEmpty,
  EmissionsError,
  EmissionsLoading,
  EmissionsSummary,
} from '../components'
import { useEmissions } from '../hooks'
import type { EmissionFormValues } from '../types'
import { summarizeEmissions } from '../utils'

const EMPTY_FORM: EmissionFormValues = { source: '', category: '', co2Kg: '' }

/** Contenedor del dashboard: une useEmissions (lógica) con los componentes de emissions/ (UI). */
export function EmissionsTracker() {
  const { emissions, loading, error, isSubmitting, submitError, addEmission, reload } = useEmissions()
  const [form, setForm] = useState<EmissionFormValues>(EMPTY_FORM)

  const handleChange = <K extends keyof EmissionFormValues>(field: K, value: EmissionFormValues[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (form.category === '') return
    const saved = await addEmission({ source: form.source, category: form.category, co2Kg: Number(form.co2Kg) })
    if (saved) setForm(EMPTY_FORM)
  }

  const { totalKg, byCategory } = summarizeEmissions(emissions)

  let content
  if (loading) content = <EmissionsLoading />
  else if (error) content = <EmissionsError message={error} onRetry={reload} />
  else if (emissions.length === 0) content = <EmissionsEmpty />
  else content = <EmissionList emissions={emissions} />

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Dashboard de emisiones</h1>
        <p className="text-ink-500">Mediciones de CO₂ de tu empresa</p>
      </header>

      <EmissionsSummary totalKg={totalKg} byCategory={byCategory} />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <h2 className="mb-4 text-lg font-semibold">Mediciones</h2>
          {content}
        </div>
        <EmissionForm
          values={form}
          onChange={handleChange}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitError={submitError}
        />
      </div>
    </section>
  )
}
