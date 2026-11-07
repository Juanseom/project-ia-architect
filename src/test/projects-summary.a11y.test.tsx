import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ProjectsSummaryPanel } from '../components'
import { summarizeProjects } from '../utils'

it('cada estado se lee como "N proyectos, X kW" (no números pegados)', () => {
  render(<ProjectsSummaryPanel loading={false} summary={summarizeProjects([{ status: 'pendiente', count: 2, capacityKw: 115 }, { status: 'en_progreso', count: 1, capacityKw: 120.5 }])} />)
  const pendiente = screen.getByText('Pendiente').nextElementSibling
  expect(pendiente?.textContent?.replace(/\s+/g, ' ').trim()).toBe('2 proyectos, 115 kW')
  expect(screen.getByText('En progreso').nextElementSibling?.textContent?.replace(/\s+/g, ' ').trim()).toBe('1 proyecto, 120,5 kW')
})
