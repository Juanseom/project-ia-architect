import type { FormEvent } from 'react'
import { INSTALLER_SPECIALTIES } from '../../types'
import { SPECIALTY_LABELS } from '../../utils'
import { Button } from '../ui'

export interface InstallerFormProps {
  onAdd: (name: string, specialty: string) => Promise<boolean>
  saving: boolean
  error: string | null
}

/** Alta de instalador (formulario no controlado: lee FormData al enviar y se limpia si se guardó). */
export function InstallerForm({ onAdd, saving, error }: InstallerFormProps) {
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    if (await onAdd(String(data.get('name') ?? ''), String(data.get('specialty') ?? ''))) form.reset()
  }
  return (
    <form onSubmit={handleSubmit} aria-labelledby="installer-form-title" className="space-y-3 rounded-xl border border-ink-500/15 bg-white p-4">
      <h3 id="installer-form-title" className="font-semibold">Agregar instalador</h3>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div>
          <label htmlFor="installer-name" className="block text-sm font-medium text-ink-700">Nombre</label>
          <input id="installer-name" name="name" required minLength={2} maxLength={80} autoComplete="off"
            aria-describedby={error ? 'installer-error' : undefined}
            className="mt-1 block min-h-11 w-full rounded-lg border border-ink-500/40 px-3 py-2" />
        </div>
        <div>
          <label htmlFor="installer-specialty" className="block text-sm font-medium text-ink-700">Especialidad</label>
          <select id="installer-specialty" name="specialty" defaultValue="general" className="mt-1 block min-h-11 w-full rounded-lg border border-ink-500/40 bg-white px-3 py-2">
            {INSTALLER_SPECIALTIES.map((s) => <option key={s} value={s}>{SPECIALTY_LABELS[s]}</option>)}
          </select>
        </div>
      </div>
      {error !== null && <p id="installer-error" role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Agregar y generar código'}</Button>
    </form>
  )
}
