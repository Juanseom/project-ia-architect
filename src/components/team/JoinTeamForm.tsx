import type { FormEvent } from 'react'
import type { TeamMembership } from '../../types'
import { Button } from '../ui'

export interface JoinTeamFormProps {
  membership: TeamMembership | null
  onJoin: (code: string) => Promise<boolean>
  joining: boolean
  error: string | null
}

/** Vincula el usuario actual como instalador de otro equipo con un código de un solo uso. */
export function JoinTeamForm({ membership, onJoin, joining, error }: JoinTeamFormProps) {
  if (membership !== null) {
    return (
      <p className="rounded-xl border border-brand-600/30 bg-brand-50 p-4 text-sm text-brand-900">
        Estás vinculado como <strong>{membership.installerName}</strong>. En Proyectos verás los que tienes asignados.
      </p>
    )
  }
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onJoin(String(new FormData(event.currentTarget).get('code') ?? ''))
  }
  return (
    <form onSubmit={handleSubmit} aria-labelledby="join-title" className="space-y-3 rounded-xl border border-ink-500/15 bg-white p-4">
      <h3 id="join-title" className="font-semibold">Unirme como instalador</h3>
      <p className="text-sm text-ink-500">Pide a tu coordinador el código de invitación (es de un solo uso).</p>
      <div>
        <label htmlFor="join-code" className="block text-sm font-medium text-ink-700">Código de invitación</label>
        <input id="join-code" name="code" required autoComplete="off" spellCheck={false}
          aria-describedby={error ? 'join-error' : undefined} aria-invalid={error !== null}
          className="mt-1 block min-h-11 w-full rounded-lg border border-ink-500/40 px-3 py-2 font-mono uppercase tracking-wider" />
      </div>
      {error !== null && <p id="join-error" role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={joining}>{joining ? 'Verificando…' : 'Vincularme'}</Button>
    </form>
  )
}
