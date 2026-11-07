import { useCallback, useState } from 'react'
import {
  PROJECT_FIELDS,
  type NewProject,
  type ProjectField,
  type ProjectFieldErrors,
  type ProjectFocusRequest,
  type ProjectFormValues,
  type ProjectMaterialRow,
} from '../types'
import { validateProject } from '../utils'

type TextField = Exclude<keyof ProjectFormValues, 'materials'>

export interface UseProjectFormResult {
  values: ProjectFormValues
  /** Errores visibles tras el primer intento de envío; luego se corrigen en vivo. */
  errors: ProjectFieldErrors
  focusRequest: ProjectFocusRequest | null
  successMessage: string | null
  setField: (field: TextField, raw: string) => void
  addMaterialRow: () => void
  updateMaterialRow: (key: string, patch: Partial<Omit<ProjectMaterialRow, 'key'>>) => void
  removeMaterialRow: (key: string) => void
  submit: () => Promise<void>
}

const emptyForm = (): ProjectFormValues => ({
  name: '',
  client: '',
  location: '',
  capacityKw: '',
  startDate: '',
  endDate: '',
  installerId: '',
  materials: [],
})
const NO_ERRORS: ProjectFieldErrors = {}

let rowSeq = 0

/** Estado y validación del formulario de proyecto (mismas reglas que la BD, antes de enviar). */
export function useProjectForm(onSubmit: (input: NewProject) => Promise<boolean>): UseProjectFormResult {
  const [values, setValues] = useState<ProjectFormValues>(emptyForm)
  const [submitted, setSubmitted] = useState(false)
  const [focusRequest, setFocusRequest] = useState<ProjectFocusRequest | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const requestFocus = useCallback((field: ProjectField) => {
    setFocusRequest((prev) => ({ field, token: (prev?.token ?? 0) + 1 }))
  }, [])

  const setField = useCallback((field: TextField, raw: string) => {
    setSuccessMessage(null)
    setValues((prev) => ({ ...prev, [field]: raw }))
  }, [])

  const addMaterialRow = useCallback(() => {
    setValues((prev) => ({ ...prev, materials: [...prev.materials, { key: `fila-${++rowSeq}`, materialId: '', quantity: '' }] }))
  }, [])

  const updateMaterialRow = useCallback((key: string, patch: Partial<Omit<ProjectMaterialRow, 'key'>>) => {
    setValues((prev) => ({ ...prev, materials: prev.materials.map((row) => (row.key === key ? { ...row, ...patch } : row)) }))
  }, [])

  const removeMaterialRow = useCallback((key: string) => {
    setValues((prev) => ({ ...prev, materials: prev.materials.filter((row) => row.key !== key) }))
  }, [])

  const submit = useCallback(async () => {
    setSubmitted(true)
    const result = validateProject(values)
    if (!result.ok) {
      const firstInvalid = PROJECT_FIELDS.find((field) => result.errors[field] !== undefined)
      if (firstInvalid) requestFocus(firstInvalid)
      return
    }
    if (await onSubmit(result.value)) {
      setValues(emptyForm())
      setSubmitted(false)
      setSuccessMessage(`Proyecto "${result.value.name}" creado en estado Pendiente.`)
      requestFocus('name')
    }
  }, [values, onSubmit, requestFocus])

  const validation = validateProject(values)
  const errors = submitted && !validation.ok ? validation.errors : NO_ERRORS

  return { values, errors, focusRequest, successMessage, setField, addMaterialRow, updateMaterialRow, removeMaterialRow, submit }
}
