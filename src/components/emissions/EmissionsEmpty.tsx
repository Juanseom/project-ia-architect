import { Button } from '../ui'

export interface EmissionsEmptyProps {
  /** Lleva al usuario al formulario. */
  onCreate: () => void
}

/** Estado vacío con llamada a la acción. */
export function EmissionsEmpty({ onCreate }: EmissionsEmptyProps) {
  return (
    <div className="rounded-xl border border-dashed border-ink-500/40 bg-white px-6 py-10 text-center">
      <p className="text-lg font-semibold">Aún no hay mediciones</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
        Registra la primera fuente de emisión para empezar a ver el total y el desglose por categoría.
      </p>
      <Button onClick={onCreate} className="mt-4">Registrar primera medición</Button>
    </div>
  )
}
