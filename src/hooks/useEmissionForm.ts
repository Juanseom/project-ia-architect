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
const NO_ERRORS: EmissionFieldErrors = {}

export interface UseEmissionFormOptions {
  /** Guarda la medición; resuelve true si se guardó. */
  onSubmit: (value: NewEmission) => Promise<boolean>
}

export interface UseEmissionFormResult {
  values: EmissionFormValues
  /** Errores visibles: aparecen al intentar enviar y desde ahí se actualizan en vivo. */
  errors: EmissionFieldErrors
  successMessage: string | null
  focusRequest: FocusRequest | null
  setField: (field: EmissionField, raw: string) => void
  submit: () => Promise<void>
  /** Lleva el foco al primer campo (CTA del estado vacío). */
  focusFirstField: () => void
}

/** Estado y validación del formulario de mediciones. La UI solo muestra lo que este hook decide. */
export function useEmissionForm({ onSubmit }: UseEmissionFormOptions): UseEmissionFormResult {
  const [values, setValues] = useState<EmissionFormValues>(EMPTY_FORM)
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
      setSubmitted(false)
      setSuccessMessage(`Medición "${result.value.source}" (${formatCategory(result.value.category)}) agregada.`)
      requestFocus('source')
    }
  }, [values, onSubmit, requestFocus])

  const focusFirstField = useCallback(() => requestFocus('source'), [requestFocus])

  // Errores derivados de los valores actuales, visibles solo tras un intento de envío.
  // NO se muestran al salir de un campo (blur): el mensaje que aparece en el blur desplaza el botón
  // "Agregar medición" entre mousedown y mouseup y el click se pierde (bug medido en la iteración 4).
  const validation = validateEmission(values)
  const errors: EmissionFieldErrors = submitted && !validation.ok ? validation.errors : NO_ERRORS

  return { values, errors, successMessage, focusRequest, setField, submit, focusFirstField }
}
