import type { Installer } from '../../types'
import { SPECIALTY_LABELS } from '../../utils'

export interface InstallerListProps {
  installers: readonly Installer[]
}

/** Equipo del coordinador con el código de invitación de un solo uso de cada instalador. */
export function InstallerList({ installers }: InstallerListProps) {
  if (installers.length === 0) {
    return <p className="rounded-xl border border-dashed border-ink-500/30 p-4 text-sm text-ink-500">Aún no tienes instaladores en tu equipo.</p>
  }
  return (
    <ul className="divide-y divide-ink-500/10 rounded-xl border border-ink-500/15 bg-white">
      {installers.map((i) => (
        <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-semibold">{i.name}</p>
            <p className="text-sm text-ink-500">{SPECIALTY_LABELS[i.specialty]}</p>
          </div>
          {i.linked ? (
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-900">Vinculado</span>
          ) : (
            <p className="text-sm">
              <span className="text-ink-500">Código de invitación: </span>
              <code className="rounded bg-ink-500/10 px-2 py-1 font-mono font-semibold tracking-wider select-all">{i.inviteCode}</code>
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
