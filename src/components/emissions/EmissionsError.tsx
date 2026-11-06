import { Button } from '../ui'

export interface EmissionsErrorProps {
  message: string
  onRetry: () => void
}

/** Estado de error: se anuncia de inmediato (role="alert") y ofrece reintentar. */
export function EmissionsError({ message, onRetry }: EmissionsErrorProps) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
      <p className="font-semibold">No se pudieron cargar las mediciones</p>
      <p className="mt-1 text-sm">{message}</p>
      <Button variant="secondary" onClick={onRetry} className="mt-3">Reintentar</Button>
    </div>
  )
}
