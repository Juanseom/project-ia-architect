import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../App'
import { navigate } from '../router'

// Los tests corren en modo mock (vite.config.ts → test.env): sin red ni Supabase.
afterEach(() => {
  act(() => navigate('/'))
})

describe('Enrutamiento con React.lazy + Suspense', () => {
  it('la ruta inicial se renderiza sin esperar un chunk (es eager)', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard de emisiones' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Emisiones' })).toHaveAttribute('aria-current', 'page')
  })

  it('navega a /inventario sin recargar: carga el chunk perezoso y marca el enlace actual', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('link', { name: 'Inventario' }))
    expect(window.location.pathname).toBe('/inventario')
    expect(await screen.findByRole('heading', { level: 1, name: 'Inventario sostenible' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inventario' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Emisiones' })).not.toHaveAttribute('aria-current')
  })

  it('una ruta desconocida carga la página 404 perezosa y permite volver', async () => {
    render(<App />)
    act(() => navigate('/no-existe'))
    expect(await screen.findByRole('heading', { name: 'Esta página no existe' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ir al dashboard' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard de emisiones' })).toBeInTheDocument()
  })

  it('el botón atrás del navegador (popstate) vuelve a la ruta anterior', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('link', { name: 'Inventario' }))
    await screen.findByRole('heading', { name: 'Inventario sostenible' })
    await act(async () => {
      window.history.back()
      await new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }))
    })
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard de emisiones' })).toBeInTheDocument()
  })

  it('EcoFlow: /proyectos carga su chunk perezoso con el tablero (modo mock)', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('link', { name: 'Proyectos' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Proyectos de instalación' })).toBeInTheDocument()
    expect(await screen.findByText('Granja Solar Norte', {}, { timeout: 3000 })).toBeInTheDocument()
  })
})

