import { useState } from 'react'
import {
  Button,
  EmissionForm,
  EmissionList,
  EmissionsEmpty,
  EmissionsError,
  EmissionsLoading,
  EmissionsSummary,
} from '../components'
import type { Emission, EmissionCategory, EmissionFormValues } from '../types'

// ITERACIÓN 1 (estructura): datos de ejemplo locales y un selector de vista para revisar
// cada estado de la UI. En la Iteración 2 todo esto lo reemplaza useEmissions().
const SAMPLE_EMISSIONS: Emission[] = [
  { id: '1', source: 'Flota de camiones', category: 'transporte', co2Kg: 1250.5, measuredAt: '2026-11-04T14:30:00Z' },
  { id: '2', source: 'Planta principal', category: 'energia', co2Kg: 3420, measuredAt: '2026-11-03T09:00:00Z' },
  { id: '3', source: 'Relleno sanitario', category: 'residuos', co2Kg: 310.25, measuredAt: '2026-11-02T18:15:00Z' },
]

type View = 'list' | 'loading' | 'empty' | 'error'
const VIEWS: View[] = ['list', 'loading', 'empty', 'error']

const EMPTY_FORM: EmissionFormValues = { source: '', category: '', co2Kg: '' }

export function EmissionsTracker() {
  const [view, setView] = useState<View>('list')
  const [emissions, setEmissions] = useState<Emission[]>(SAMPLE_EMISSIONS)
  const [form, setForm] = useState<EmissionFormValues>(EMPTY_FORM)

  const handleChange = <K extends keyof EmissionFormValues>(field: K, value: EmissionFormValues[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    if (form.category === '') return
    const created: Emission = {
      id: crypto.randomUUID(),
      source: form.source,
      category: form.category,
      co2Kg: Number(form.co2Kg),
      measuredAt: new Date().toISOString(),
    }
    setEmissions((prev) => [created, ...prev])
    setForm(EMPTY_FORM)
  }

  const visible = view === 'empty' ? [] : emissions
  const totalKg = visible.reduce((sum, e) => sum + e.co2Kg, 0)
  const byCategory: Record<EmissionCategory, number> = { transporte: 0, energia: 0, residuos: 0 }
  for (const e of visible) byCategory[e.category] += e.co2Kg

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Dashboard de emisiones</h1>
          <p className="text-ink-500">Mediciones de CO₂ de tu empresa</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {VIEWS.map((v) => (
            <Button key={v} variant={v === view ? 'primary' : 'secondary'} onClick={() => setView(v)}>
              {v}
            </Button>
          ))}
        </div>
      </header>

      <EmissionsSummary totalKg={totalKg} byCategory={byCategory} />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <h2 className="mb-4 text-lg font-semibold">Mediciones</h2>
          {view === 'loading' && <EmissionsLoading />}
          {view === 'error' && (
            <EmissionsError message="Error de ejemplo al cargar." onRetry={() => setView('list')} />
          )}
          {(view === 'list' || view === 'empty') &&
            (visible.length === 0 ? <EmissionsEmpty /> : <EmissionList emissions={visible} />)}
        </div>
        <EmissionForm values={form} onChange={handleChange} onSubmit={handleSubmit} isSubmitting={false} />
      </div>
    </section>
  )
}
