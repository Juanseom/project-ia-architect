import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProjectForm } from '../components'
import { useProjectForm } from '../hooks'
import type { Installer, Material, NewProject } from '../types'
import { PROJECT_MESSAGES as M } from '../utils'

const INSTALLERS: Installer[] = [{ id: 'inst-1', name: 'Ana Solar', specialty: 'electrica', inviteCode: 'X', linked: true }]
const MATERIALS: Material[] = [{ id: 'mat-1', name: 'Panel 550 W', unit: 'unidad', unitCost: 1 }]

function Harness({ onSave }: { onSave: (p: NewProject) => Promise<boolean> }) {
  const form = useProjectForm(onSave)
  return (
    <ProjectForm values={form.values} errors={form.errors} installers={INSTALLERS} materials={MATERIALS}
      onFieldChange={form.setField} onAddMaterial={form.addMaterialRow} onUpdateMaterial={form.updateMaterialRow}
      onRemoveMaterial={form.removeMaterialRow} onSubmit={form.submit} isSubmitting={false} submitError={null}
      successMessage={form.successMessage} focusRequest={form.focusRequest} />
  )
}

describe('ProjectForm + useProjectForm', () => {
  it('no envía datos inválidos: marca campos, enlaza mensajes y enfoca el primero', async () => {
    const onSave = vi.fn(async () => true)
    render(<Harness onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }))
    expect(onSave).not.toHaveBeenCalled()
    const name = screen.getByLabelText('Nombre del proyecto *')
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAccessibleDescription(M.nameLength)
    expect(screen.getByLabelText('Capacidad (kW) *')).toHaveAccessibleDescription(expect.stringContaining(M.capacityRequired))
    expect(name).toHaveFocus()
  })

  it('fecha fin anterior al inicio y material repetido se detectan antes de enviar', async () => {
    const onSave = vi.fn(async () => true)
    render(<Harness onSave={onSave} />)
    await userEvent.type(screen.getByLabelText('Nombre del proyecto *'), 'Granja Norte')
    await userEvent.type(screen.getByLabelText('Cliente *'), 'Hacienda')
    await userEvent.type(screen.getByLabelText('Ubicación *'), 'Tunja')
    await userEvent.type(screen.getByLabelText('Capacidad (kW) *'), '120,5')
    await userEvent.type(screen.getByLabelText('Inicio *'), '2026-11-20')
    await userEvent.type(screen.getByLabelText('Fin estimado *'), '2026-11-10')
    await userEvent.click(screen.getByRole('button', { name: '+ Agregar material' }))
    await userEvent.click(screen.getByRole('button', { name: '+ Agregar material' }))
    const group = screen.getByRole('group', { name: 'Materiales' })
    for (const [i, select] of within(group).getAllByRole('combobox').entries()) {
      await userEvent.selectOptions(select, 'mat-1')
      await userEvent.type(screen.getByLabelText(`Cantidad del material ${i + 1}`), '10')
    }
    await userEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText(M.endBeforeStart)).toBeInTheDocument()
    expect(screen.getByText(M.materialDuplicate)).toBeInTheDocument()
    expect(screen.getByLabelText('Fin estimado *')).toHaveFocus()
  })

  it('envía un proyecto válido, anuncia el éxito y limpia el formulario', async () => {
    const onSave = vi.fn(async () => true)
    render(<Harness onSave={onSave} />)
    await userEvent.type(screen.getByLabelText('Nombre del proyecto *'), 'Granja Norte')
    await userEvent.type(screen.getByLabelText('Cliente *'), 'Hacienda')
    await userEvent.type(screen.getByLabelText('Ubicación *'), 'Tunja')
    await userEvent.type(screen.getByLabelText('Capacidad (kW) *'), '120,5')
    await userEvent.type(screen.getByLabelText('Inicio *'), '2026-11-10')
    await userEvent.type(screen.getByLabelText('Fin estimado *'), '2026-12-20')
    await userEvent.selectOptions(screen.getByLabelText('Instalador asignado'), 'inst-1')
    await userEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }))
    expect(onSave).toHaveBeenCalledWith({ name: 'Granja Norte', client: 'Hacienda', location: 'Tunja', capacityKw: 120.5, startDate: '2026-11-10', endDate: '2026-12-20', installerId: 'inst-1', materials: [] })
    expect(screen.getByRole('status')).toHaveTextContent('Proyecto "Granja Norte" creado en estado Pendiente.')
    expect(screen.getByLabelText('Nombre del proyecto *')).toHaveValue('')
  })
})
