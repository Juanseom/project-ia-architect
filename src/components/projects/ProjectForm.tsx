import { memo, useEffect, useRef, type FormEvent } from 'react'
import type {
  Installer,
  Material,
  ProjectField,
  ProjectFieldErrors,
  ProjectFocusRequest,
  ProjectFormValues,
  ProjectMaterialRow,
} from '../../types'
import { SPECIALTY_LABELS, UNIT_LABELS } from '../../utils'
import { Button } from '../ui'

type TextField = Exclude<keyof ProjectFormValues, 'materials'>

export interface ProjectFormProps {
  values: ProjectFormValues
  errors: ProjectFieldErrors
  installers: readonly Installer[]
  materials: readonly Material[]
  onFieldChange: (field: TextField, raw: string) => void
  onAddMaterial: () => void
  onUpdateMaterial: (key: string, patch: Partial<Omit<ProjectMaterialRow, 'key'>>) => void
  onRemoveMaterial: (key: string) => void
  onSubmit: () => void
  isSubmitting: boolean
  submitError: string | null
  successMessage: string | null
  focusRequest: ProjectFocusRequest | null
}

const ID: Record<ProjectField, string> = {
  name: 'project-name',
  client: 'project-client',
  location: 'project-location',
  capacityKw: 'project-capacity',
  startDate: 'project-start',
  endDate: 'project-end',
  materials: 'project-materials',
}
const errId = (field: ProjectField) => `${ID[field]}-error`
const inputClass = (invalid: boolean) =>
  `mt-1 block min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600 ${
    invalid ? 'border-red-700' : 'border-ink-500/40'
  }`

function FieldError({ field, message }: { field: ProjectField; message: string | undefined }) {
  if (message === undefined) return null
  return <p id={errId(field)} className="mt-1 text-sm text-red-700">{message}</p>
}

/** Formulario controlado y accesible para crear proyectos. No valida: muestra los errores que recibe. */
export const ProjectForm = memo(function ProjectForm(props: ProjectFormProps) {
  const { values, errors, installers, materials, onFieldChange, onSubmit, isSubmitting, submitError, successMessage, focusRequest } = props
  const formRef = useRef<HTMLFormElement>(null)

  // Único efecto de UI: enfocar el campo que pide el contenedor (primer inválido o el primero tras guardar).
  useEffect(() => {
    if (focusRequest === null) return
    const el = formRef.current?.querySelector<HTMLElement>(`#${ID[focusRequest.field]}`)
    el?.focus()
  }, [focusRequest])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isSubmitting) onSubmit()
  }

  const a11y = (field: ProjectField, hint?: string) => ({
    id: ID[field],
    'aria-invalid': errors[field] !== undefined,
    'aria-describedby': [errors[field] !== undefined ? errId(field) : null, hint].filter(Boolean).join(' ') || undefined,
    className: inputClass(errors[field] !== undefined),
  })

  const text = (field: TextField & ProjectField, label: string, hint?: string) => (
    <div>
      <label htmlFor={ID[field]} className="block text-sm font-medium text-ink-700">{label}</label>
      <input type="text" autoComplete="off" value={values[field]} onChange={(e) => onFieldChange(field, e.target.value)} aria-required="true" {...a11y(field, hint)} />
      <FieldError field={field} message={errors[field]} />
    </div>
  )

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate aria-labelledby="project-form-title" aria-busy={isSubmitting}
      className="space-y-4 rounded-xl border border-ink-500/15 bg-white p-5 shadow-sm">
      <h2 id="project-form-title" className="text-lg font-semibold">Nuevo proyecto</h2>
      <p className="text-sm text-ink-500">Se crea en estado Pendiente. Los campos marcados son obligatorios.</p>

      {text('name', 'Nombre del proyecto *')}
      {text('client', 'Cliente *')}
      {text('location', 'Ubicación *', 'project-location-hint')}
      <p id="project-location-hint" className="-mt-3 text-xs text-ink-500">Ciudad o dirección de la instalación.</p>

      <div>
        <label htmlFor={ID.capacityKw} className="block text-sm font-medium text-ink-700">Capacidad (kW) *</label>
        <input type="text" inputMode="decimal" autoComplete="off" value={values.capacityKw}
          onChange={(e) => onFieldChange('capacityKw', e.target.value)} aria-required="true" {...a11y('capacityKw', 'project-capacity-hint')} />
        <p id="project-capacity-hint" className="mt-1 text-xs text-ink-500">Mayor que 0, hasta 2 decimales (ej. 120,5).</p>
        <FieldError field="capacityKw" message={errors.capacityKw} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={ID.startDate} className="block text-sm font-medium text-ink-700">Inicio *</label>
          <input type="date" value={values.startDate} onChange={(e) => onFieldChange('startDate', e.target.value)} aria-required="true" {...a11y('startDate')} />
          <FieldError field="startDate" message={errors.startDate} />
        </div>
        <div>
          <label htmlFor={ID.endDate} className="block text-sm font-medium text-ink-700">Fin estimado *</label>
          <input type="date" min={values.startDate || undefined} value={values.endDate} onChange={(e) => onFieldChange('endDate', e.target.value)} aria-required="true" {...a11y('endDate')} />
          <FieldError field="endDate" message={errors.endDate} />
        </div>
      </div>

      <div>
        <label htmlFor="project-installer" className="block text-sm font-medium text-ink-700">Instalador asignado</label>
        <select id="project-installer" value={values.installerId} onChange={(e) => onFieldChange('installerId', e.target.value)} className={inputClass(false)}>
          <option value="">Sin asignar (no se podrá iniciar)</option>
          {installers.map((i) => (
            <option key={i.id} value={i.id}>{i.name} · {SPECIALTY_LABELS[i.specialty]}</option>
          ))}
        </select>
      </div>

      <fieldset id={ID.materials} tabIndex={-1} aria-describedby={errors.materials !== undefined ? errId('materials') : undefined} className="space-y-2">
        <legend className="text-sm font-medium text-ink-700">Materiales</legend>
        {materials.length === 0 && <p className="text-xs text-ink-500">Agrega materiales al catálogo en la sección Equipo.</p>}
        {values.materials.map((row, index) => (
          <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-end gap-2">
            <div>
              <label htmlFor={`${row.key}-material`} className="sr-only">Material {index + 1}</label>
              <select id={`${row.key}-material`} value={row.materialId} onChange={(e) => props.onUpdateMaterial(row.key, { materialId: e.target.value })} className={inputClass(false)}>
                <option value="">Material…</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({UNIT_LABELS[m.unit]})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${row.key}-qty`} className="sr-only">Cantidad del material {index + 1}</label>
              <input id={`${row.key}-qty`} type="text" inputMode="decimal" placeholder="Cant." value={row.quantity}
                onChange={(e) => props.onUpdateMaterial(row.key, { quantity: e.target.value })} className={inputClass(false)} />
            </div>
            <Button variant="secondary" onClick={() => props.onRemoveMaterial(row.key)} aria-label={`Quitar material ${index + 1}`}>✕</Button>
          </div>
        ))}
        <Button variant="secondary" onClick={props.onAddMaterial} disabled={materials.length === 0}>+ Agregar material</Button>
        <FieldError field="materials" message={errors.materials} />
      </fieldset>

      {submitError !== null && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{submitError}</p>}

      <Button type="submit" className="w-full aria-disabled:cursor-wait aria-disabled:opacity-60" aria-disabled={isSubmitting}>
        {isSubmitting ? 'Creando…' : 'Crear proyecto'}
      </Button>
      <output aria-live="polite" className="block text-sm font-medium text-brand-700 empty:hidden">{successMessage}</output>
    </form>
  )
})
