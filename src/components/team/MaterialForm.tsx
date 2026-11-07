import type { FormEvent } from 'react'
import { MATERIAL_UNITS } from '../../types'
import { UNIT_LABELS } from '../../utils'
import { Button } from '../ui'

export interface MaterialFormProps {
  onAdd: (name: string, unit: string, unitCost: string) => Promise<boolean>
  saving: boolean
  error: string | null
}

/** Alta de material en el catálogo. */
export function MaterialForm({ onAdd, saving, error }: MaterialFormProps) {
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    if (await onAdd(String(data.get('name') ?? ''), String(data.get('unit') ?? ''), String(data.get('cost') ?? ''))) form.reset()
  }
  return (
    <form onSubmit={handleSubmit} aria-labelledby="material-form-title" className="space-y-3 rounded-xl border border-ink-500/15 bg-white p-4">
      <h3 id="material-form-title" className="font-semibold">Agregar material</h3>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_10rem]">
        <div>
          <label htmlFor="material-name" className="block text-sm font-medium text-ink-700">Nombre</label>
          <input id="material-name" name="name" required minLength={2} maxLength={80} autoComplete="off"
            className="mt-1 block min-h-11 w-full rounded-lg border border-ink-500/40 px-3 py-2" />
        </div>
        <div>
          <label htmlFor="material-unit" className="block text-sm font-medium text-ink-700">Unidad</label>
          <select id="material-unit" name="unit" defaultValue="unidad" className="mt-1 block min-h-11 w-full rounded-lg border border-ink-500/40 bg-white px-3 py-2">
            {MATERIAL_UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="material-cost" className="block text-sm font-medium text-ink-700">Costo (COP)</label>
          <input id="material-cost" name="cost" inputMode="decimal" defaultValue="0" autoComplete="off"
            className="mt-1 block min-h-11 w-full rounded-lg border border-ink-500/40 px-3 py-2" />
        </div>
      </div>
      {error !== null && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Agregar material'}</Button>
    </form>
  )
}
