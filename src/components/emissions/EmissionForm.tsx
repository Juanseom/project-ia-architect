import { memo, useEffect, useRef, type FormEvent } from 'react'
import {
  EMISSION_CATEGORIES,
  type EmissionField,
  type EmissionFieldErrors,
  type EmissionFormValues,
  type FocusRequest,
} from '../../types'
import { EMISSION_RULES, formatCategory } from '../../utils'
import { Button } from '../ui'

export interface EmissionFormProps {
  values: EmissionFormValues
  errors: EmissionFieldErrors
  onFieldChange: (field: EmissionField, raw: string) => void
  onFieldBlur: (field: EmissionField) => void
  onSubmit: () => void
  isSubmitting: boolean
  /** Deshabilita todo el formulario (sin sesión). */
  disabled: boolean
  submitError: string | null
  successMessage: string | null
  focusRequest: FocusRequest | null
}

const IDS: Record<EmissionField, string> = {
  source: 'emission-source',
  category: 'emission-category',
  co2Kg: 'emission-co2',
}
const errorId = (field: EmissionField) => `${IDS[field]}-error`

const inputClass = (invalid: boolean) =>
  `mt-1 block min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600 disabled:bg-ink-500/10 ${
    invalid ? 'border-red-700' : 'border-ink-500/40'
  }`

/** Mensaje de error de un campo, enlazado por aria-describedby. */
function FieldError({ field, message }: { field: EmissionField; message: string | undefined }) {
  if (message === undefined) return null
  return (
    <p id={errorId(field)} className="mt-1 text-sm text-red-700">
      {message}
    </p>
  )
}

/**
 * Formulario controlado y accesible. No valida: muestra los errores que recibe y emite eventos.
 * El único efecto es de UI: mover el foco al campo que pide el contenedor (primer inválido, o el primero tras guardar).
 */
export const EmissionForm = memo(function EmissionForm({
  values,
  errors,
  onFieldChange,
  onFieldBlur,
  onSubmit,
  isSubmitting,
  disabled,
  submitError,
  successMessage,
  focusRequest,
}: EmissionFormProps) {
  const refs = {
    source: useRef<HTMLInputElement>(null),
    category: useRef<HTMLSelectElement>(null),
    co2Kg: useRef<HTMLInputElement>(null),
  }
  const { source: sourceRef, category: categoryRef, co2Kg: co2Ref } = refs

  useEffect(() => {
    if (focusRequest === null) return
    const target = { source: sourceRef, category: categoryRef, co2Kg: co2Ref }[focusRequest.field]
    target.current?.focus()
  }, [focusRequest, sourceRef, categoryRef, co2Ref])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isSubmitting) onSubmit()
  }

  const describedBy = (field: EmissionField, extra?: string) =>
    [errors[field] !== undefined ? errorId(field) : null, extra].filter(Boolean).join(' ') || undefined

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="emission-form-title"
      aria-busy={isSubmitting}
      className="space-y-4 rounded-xl border border-ink-500/15 bg-white p-5 shadow-sm lg:sticky lg:top-6"
    >
      <h2 id="emission-form-title" className="text-lg font-semibold">Nueva medición</h2>
      <p className="text-sm text-ink-500">Todos los campos son obligatorios.</p>

      <fieldset disabled={disabled} className="space-y-4">
        <div>
          <label htmlFor={IDS.source} className="block text-sm font-medium text-ink-700">Fuente de emisión</label>
          <input
            ref={sourceRef}
            id={IDS.source}
            name="source"
            type="text"
            autoComplete="off"
            maxLength={EMISSION_RULES.sourceMax}
            value={values.source}
            onChange={(e) => onFieldChange('source', e.target.value)}
            onBlur={() => onFieldBlur('source')}
            aria-required="true"
            aria-invalid={errors.source !== undefined}
            aria-describedby={describedBy('source', 'emission-source-hint')}
            className={inputClass(errors.source !== undefined)}
          />
          <p id="emission-source-hint" className="mt-1 text-xs text-ink-500">Ej. Flota de camiones, Caldera principal.</p>
          <FieldError field="source" message={errors.source} />
        </div>

        <div>
          <label htmlFor={IDS.category} className="block text-sm font-medium text-ink-700">Categoría</label>
          <select
            ref={categoryRef}
            id={IDS.category}
            name="category"
            value={values.category}
            onChange={(e) => onFieldChange('category', e.target.value)}
            onBlur={() => onFieldBlur('category')}
            aria-required="true"
            aria-invalid={errors.category !== undefined}
            aria-describedby={describedBy('category')}
            className={inputClass(errors.category !== undefined)}
          >
            <option value="">Selecciona una categoría…</option>
            {EMISSION_CATEGORIES.map((category) => (
              <option key={category} value={category}>{formatCategory(category)}</option>
            ))}
          </select>
          <FieldError field="category" message={errors.category} />
        </div>

        <div>
          <label htmlFor={IDS.co2Kg} className="block text-sm font-medium text-ink-700">CO₂ producido (kg)</label>
          <input
            ref={co2Ref}
            id={IDS.co2Kg}
            name="co2Kg"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={values.co2Kg}
            onChange={(e) => onFieldChange('co2Kg', e.target.value)}
            onBlur={() => onFieldBlur('co2Kg')}
            aria-required="true"
            aria-invalid={errors.co2Kg !== undefined}
            aria-describedby={describedBy('co2Kg', 'emission-co2-hint')}
            className={inputClass(errors.co2Kg !== undefined)}
          />
          <p id="emission-co2-hint" className="mt-1 text-xs text-ink-500">Mayor que 0, hasta 2 decimales (ej. 845,30).</p>
          <FieldError field="co2Kg" message={errors.co2Kg} />
        </div>

        {submitError !== null && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{submitError}</p>
        )}

        {/* aria-disabled (no disabled) mientras envía: el botón conserva el foco y el lector de pantalla no se pierde. */}
        <Button type="submit" className="w-full aria-disabled:cursor-wait aria-disabled:opacity-60" aria-disabled={isSubmitting}>
          {isSubmitting && (
            <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" />
          )}
          {isSubmitting ? 'Guardando…' : 'Agregar medición'}
        </Button>
      </fieldset>

      {disabled && <p className="text-sm text-ink-500">Conectando tu sesión… el formulario se habilita en un momento.</p>}

      {/* Región viva siempre presente (<output> = role status + aria-live polite): se anuncia al cambiar su contenido. */}
      <output aria-live="polite" className="block text-sm font-medium text-brand-700 empty:hidden">
        {successMessage}
      </output>
    </form>
  )
})
