/** Estado vacío: aún no hay mediciones registradas. */
export function EmissionsEmpty() {
  return (
    <div className="rounded-xl border border-dashed border-ink-500/30 bg-white p-8 text-center">
      <p className="font-semibold">Aún no hay mediciones</p>
      <p className="mt-1 text-sm text-ink-500">Registra la primera con el formulario.</p>
    </div>
  )
}
