import type { Material } from '../../types'
import { formatCop, UNIT_LABELS } from '../../utils'

export interface MaterialListProps {
  materials: readonly Material[]
}

/** Catálogo de materiales del coordinador. */
export function MaterialList({ materials }: MaterialListProps) {
  if (materials.length === 0) {
    return <p className="rounded-xl border border-dashed border-ink-500/30 p-4 text-sm text-ink-500">El catálogo está vacío.</p>
  }
  return (
    <table className="w-full overflow-hidden rounded-xl border border-ink-500/15 bg-white text-left text-sm">
      <caption className="sr-only">Catálogo de materiales</caption>
      <thead className="bg-ink-500/5 text-ink-700">
        <tr>
          <th scope="col" className="px-4 py-2 font-semibold">Material</th>
          <th scope="col" className="px-4 py-2 font-semibold">Unidad</th>
          <th scope="col" className="px-4 py-2 text-right font-semibold">Costo unitario</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-500/10">
        {materials.map((m) => (
          <tr key={m.id}>
            <td className="px-4 py-2">{m.name}</td>
            <td className="px-4 py-2">{UNIT_LABELS[m.unit]}</td>
            <td className="px-4 py-2 text-right tabular-nums">{formatCop(m.unitCost)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
