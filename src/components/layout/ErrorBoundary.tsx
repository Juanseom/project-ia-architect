import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '../ui'

export interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  failed: boolean
}

/**
 * Captura errores de render y, sobre todo, fallos al descargar un chunk de React.lazy (red caída o un deploy
 * nuevo que borró el chunk anterior). Sin esto la app quedaría en blanco.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de render:', error, info.componentStack)
  }

  override render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
        <p className="font-semibold">No se pudo cargar esta sección</p>
        <p className="mt-1 text-sm">Puede ser un problema de conexión o una versión nueva de la app.</p>
        <Button variant="secondary" className="mt-4" onClick={() => window.location.reload()}>Recargar</Button>
      </div>
    )
  }
}
