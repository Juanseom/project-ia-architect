import { useCallback, useState } from 'react'
import {
  EMISSION_FIELDS,
  type EmissionField,
  type EmissionFieldErrors,
  type EmissionFormValues,
  type FocusRequest,
  type NewEmission,
} from '../types'
import { formatCategory, isEmissionCategory, validateEmission } from '../utils'

const EMPTY_FORM: EmissionFormValues = { source: '', category: '', co2Kg: '' }

export interface UseEmissionFormOptions {
  /** Guarda la medición; resuelve true si se guardó. */
  onSubmit: (value: NewEmission) => Promise<boolean>
}

export interface UseEmissionFormResult {
  values: EmissionFormValues
  /** Errores visibles (solo de campos tocados o tras intentar enviar). */
  errors: EmissionFieldErrors
  successMessage: string | null
  focusRequest: FocusRequest | null
  setField: (field: EmissionField, raw: string) => void
  touchField: (field: EmissionField) => void
  submit: () => Promise<void>
  /** Lleva el foco al primer campo (CTA del estado vacío). */
  focusFirstField: () => void
}

/** Estado y validación del formulario de mediciones. La UI solo muestra lo que este hook decide. */
export function useEmissionForm({ onSubmit }: UseEmissionFormOptions): UseEmissionFormResult {
  const [values, setValues] = useState<EmissionFormValues>(EMPTY_FORM)
  const [touched, setTouched] = useState<Partial<Record<EmissionField, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)

  const setField = useCallback((field: EmissionField, raw: string) => {
    setSuccessMessage(null)
    setValues((prev) => {
      if (field === 'category') return { ...prev, category: isEmissionCategory(raw) ? raw : '' }
      return { ...prev, [field]: raw }
    })
  }, [])

  const touchField = useCallback((field: EmissionField) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }))
  }, [])

  const requestFocus = useCallback((field: EmissionField) => {
    setFocusRequest((prev) => ({ field, token: (prev?.token ?? 0) + 1 }))
  }, [])

  const submit = useCallback(async () => {
    setSubmitted(true)
    const result = validateEmission(values)
    if (!result.ok) {
      const firstInvalid = EMISSION_FIELDS.find((field) => result.errors[field] !== undefined)
      if (firstInvalid) requestFocus(firstInvalid)
      return
    }
    const saved = await onSubmit(result.value)
    if (saved) {
      setValues(EMPTY_FORM)
      setTouched({})
      setSubmitted(false)
      setSuccessMessage(`Medición "${result.value.source}" (${formatCategory(result.value.category)}) agregada.`)
      requestFocus('source')
    }
  }, [values, onSubmit, requestFocus])

  const focusFirstField = useCallback(() => requestFocus('source'), [requestFocus])

  // Errores derivados de los valores actuales: se corrigen en vivo mientras el usuario escribe.
  const validation = validateEmission(values)
  const allErrors = validation.ok ? {} : validation.errors
  const errors: EmissionFieldErrors = {}
  for (const field of EMISSION_FIELDS) {
    const message = allErrors[field]
    if (message !== undefined && (submitted || touched[field])) errors[field] = message
  }

  return { values, errors, successMessage, focusRequest, setField, touchField, submit, focusFirstField }
}
