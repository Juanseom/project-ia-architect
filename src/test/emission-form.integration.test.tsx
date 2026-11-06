import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useEmissionForm } from '../hooks'
import type { NewEmission } from '../types'
import { VALIDATION_MESSAGES as M } from '../utils'
import { EmissionForm } from '../components'

// Arnés: el mismo cableado que hace EmissionsTracker (hook de formulario + componente presentacional).
function Harness({ onSave, submitError = null, isSubmitting = false }: {
  onSave: (value: NewEmission) => Promise<boolean>
  submitError?: string | null
  isSubmitting?: boolean
}) {
  const form = useEmissionForm({ onSubmit: onSave })
  return (
    <EmissionForm
      values={form.values}
      errors={form.errors}
      onFieldChange={form.setField}
      onSubmit={form.submit}
      isSubmitting={isSubmitting}
      disabled={false}
      submitError={submitError}
      successMessage={form.successMessage}
      focusRequest={form.focusRequest}
    />
  )
}

const fields = () => ({
  source: screen.getByLabelText('Fuente de emisión'),
  category: screen.getByLabelText('Categoría'),
  co2: screen.getByLabelText('CO₂ producido (kg)'),
  submit: screen.getByRole('button', { name: 'Agregar medición' }),
})

describe('EmissionForm + useEmissionForm', () => {
  it('al enviar vacío marca los 3 campos, enlaza los mensajes y enfoca el primero', async () => {
    const onSave = vi.fn(async () => true)
    render(<Harness onSave={onSave} />)
    const f = fields()

    await userEvent.click(f.submit)

    expect(onSave).not.toHaveBeenCalled()
    for (const [input, message] of [[f.source, M.sourceRequired], [f.category, M.categoryRequired], [f.co2, M.co2Required]] as const) {
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAccessibleDescription(expect.stringContaining(message))
    }
    expect(f.source).toHaveFocus()
  })

  it('enfoca el primer campo inválido aunque no sea el primero del formulario', async () => {
    render(<Harness onSave={vi.fn(async () => true)} />)
    const f = fields()
    await userEvent.type(f.source, 'Caldera')
    await userEvent.type(f.co2, '0')
    await userEvent.click(f.submit)

    expect(f.source).toHaveAttribute('aria-invalid', 'false')
    expect(f.category).toHaveFocus()
    expect(f.co2).toHaveAccessibleDescription(expect.stringContaining(M.co2Positive))
  })

  it('no muestra errores al salir de un campo (evita que el botón se desplace bajo el cursor)', async () => {
    render(<Harness onSave={vi.fn(async () => true)} />)
    const f = fields()
    await userEvent.type(f.source, 'A')
    await userEvent.tab()
    expect(screen.queryByText(M.sourceTooShort)).not.toBeInTheDocument()
    expect(f.source).toHaveAttribute('aria-invalid', 'false')
  })

  it('tras un intento de envío, los errores se corrigen en vivo al escribir', async () => {
    render(<Harness onSave={vi.fn(async () => true)} />)
    const f = fields()
    await userEvent.type(f.source, 'A')
    await userEvent.click(f.submit)
    expect(screen.getByText(M.sourceTooShort)).toBeInTheDocument()

    await userEvent.type(f.source, 'B')
    expect(screen.queryByText(M.sourceTooShort)).not.toBeInTheDocument()
  })

  it('un envío inválido DESPUÉS de uno exitoso vuelve a validar todo y enfoca el primer inválido', async () => {
    render(<Harness onSave={vi.fn(async () => true)} />)
    const f = fields()
    await userEvent.type(f.source, 'Primera fuente')
    await userEvent.selectOptions(f.category, 'energia')
    await userEvent.type(f.co2, '5')
    await userEvent.click(f.submit)

    await userEvent.type(f.source, 'A')
    await userEvent.type(f.co2, '0')
    await userEvent.click(f.submit)
    expect(screen.getAllByRole('textbox').concat(f.category).filter((el) => el.getAttribute('aria-invalid') === 'true')).toHaveLength(3)
    expect(f.source).toHaveFocus()
  })

  it('envía valores válidos, anuncia el éxito por aria-live, limpia y vuelve al primer campo', async () => {
    const onSave = vi.fn(async () => true)
    render(<Harness onSave={onSave} />)
    const f = fields()
    await userEvent.type(f.source, '  Caldera de vapor ')
    await userEvent.selectOptions(f.category, 'energia')
    await userEvent.type(f.co2, '845,3')
    await userEvent.click(f.submit)

    expect(onSave).toHaveBeenCalledWith({ source: 'Caldera de vapor', category: 'energia', co2Kg: 845.3 })
    const live = screen.getByRole('status')
    expect(live).toHaveAttribute('aria-live', 'polite')
    expect(live).toHaveTextContent('Medición "Caldera de vapor" (Energía) agregada.')
    expect(f.source).toHaveValue('')
    expect(f.source).toHaveFocus()
  })

  it('si el guardado falla conserva lo escrito; el error del servidor usa role="alert"', async () => {
    const { rerender } = render(<Harness onSave={vi.fn(async () => false)} />)
    const f = fields()
    await userEvent.type(f.source, 'Caldera')
    await userEvent.selectOptions(f.category, 'residuos')
    await userEvent.type(f.co2, '3')
    await userEvent.click(f.submit)
    expect(f.source).toHaveValue('Caldera')

    rerender(<Harness onSave={vi.fn(async () => false)} submitError="No hay conexión con el servidor de datos." />)
    expect(screen.getByRole('alert')).toHaveTextContent('No hay conexión')
  })

  it('mientras envía el botón queda aria-disabled y no dispara un segundo envío', async () => {
    const onSave = vi.fn(async () => true)
    render(<Harness onSave={onSave} isSubmitting />)
    const button = screen.getByRole('button', { name: 'Guardando…' })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(button)
    expect(onSave).not.toHaveBeenCalled()
  })
})
