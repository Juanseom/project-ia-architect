import { EmissionsError, EmissionsLoading } from '../components/emissions'
import { InstallerForm, InstallerList, JoinTeamForm, MaterialForm, MaterialList } from '../components/team'
import { useTeam } from '../hooks'

/** Ruta /equipo (EcoFlow, perezosa): instaladores, catálogo de materiales y vinculación como instalador. */
export function TeamPage() {
  const team = useTeam()

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-brand-700">EcoFlow · Energía solar</p>
        <h1 className="text-2xl font-bold sm:text-3xl">Equipo y materiales</h1>
        <p className="text-ink-500">Cada instalador recibe un código de un solo uso; al canjearlo solo verá los proyectos que le asignes.</p>
      </header>

      {team.loading && <EmissionsLoading count={3} />}
      {!team.loading && team.error !== null && <EmissionsError message={team.error} onRetry={() => window.location.reload()} />}
      {!team.loading && team.error === null && (
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <section aria-labelledby="installers-title" className="space-y-4">
            <h2 id="installers-title" className="text-lg font-semibold">Instaladores ({team.installers.length})</h2>
            <InstallerList installers={team.installers} />
            <InstallerForm onAdd={team.addInstaller} saving={team.savingInstaller} error={team.installerError} />
          </section>
          <div className="space-y-8">
            <section aria-labelledby="materials-title" className="space-y-4">
              <h2 id="materials-title" className="text-lg font-semibold">Catálogo de materiales ({team.materials.length})</h2>
              <MaterialList materials={team.materials} />
              <MaterialForm onAdd={team.addMaterial} saving={team.savingMaterial} error={team.materialError} />
            </section>
            <section aria-labelledby="join-section-title" className="space-y-4">
              <h2 id="join-section-title" className="text-lg font-semibold">¿Eres instalador de otro equipo?</h2>
              <JoinTeamForm membership={team.membership} onJoin={team.joinTeam} joining={team.joining} error={team.joinError} />
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
