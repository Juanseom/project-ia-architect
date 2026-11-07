import { useMemo } from 'react'
import { ProjectBoard, ProjectForm, ProjectsLoading, ProjectsSummaryPanel, StatusFilter } from '../components/projects'
import { EmissionsError } from '../components/emissions'
import { Button } from '../components/ui'
import { useProjectForm, useProjects, useTeam } from '../hooks'
import { navigate } from '../router'
import { PROJECT_STATUSES } from '../types'

/** Ruta /proyectos (EcoFlow, perezosa): dashboard por estado + creación de proyectos. */
export function ProjectsPage() {
  const projects = useProjects()
  const team = useTeam()
  const form = useProjectForm(projects.createProject)
  const visibleStatuses = useMemo(() => (projects.filter === 'todos' ? PROJECT_STATUSES : [projects.filter]), [projects.filter])
  const { state } = projects

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">EcoFlow · Energía solar</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Proyectos de instalación</h1>
          <p className="text-ink-500">
            {team.membership
              ? `Coordinas tu espacio y además ves lo asignado a ${team.membership.installerName}.`
              : 'Coordina instalaciones y sigue su avance por estado.'}
          </p>
        </div>
        <StatusFilter value={projects.filter} onChange={projects.setFilter} />
      </header>

      <ProjectsSummaryPanel summary={projects.summary} loading={state.status === 'loading'} />

      {projects.actionError !== null && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{projects.actionError}</p>}

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-labelledby="board-title" aria-busy={state.status === 'loading'} className="min-w-0">
          <h2 id="board-title" className="mb-4 text-lg font-semibold">Tablero</h2>
          {state.status === 'loading' && <ProjectsLoading />}
          {state.status === 'error' && <EmissionsError message={state.error} onRetry={projects.reload} />}
          {state.status === 'empty' && (
            <div className="rounded-xl border border-dashed border-ink-500/40 bg-white px-6 py-10 text-center">
              <p className="text-lg font-semibold">Aún no hay proyectos</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">Crea el primero con el formulario o arma tu equipo e instaladores.</p>
              <Button variant="secondary" className="mt-4" onClick={() => navigate('/equipo')}>Ir a Equipo</Button>
            </div>
          )}
          {state.status === 'success' && (
            <ProjectBoard board={projects.board} pendingIds={projects.pendingIds} onChangeStatus={projects.changeStatus} visibleStatuses={visibleStatuses} />
          )}
        </section>

        <ProjectForm
          values={form.values}
          errors={form.errors}
          installers={team.installers}
          materials={team.materials}
          onFieldChange={form.setField}
          onAddMaterial={form.addMaterialRow}
          onUpdateMaterial={form.updateMaterialRow}
          onRemoveMaterial={form.removeMaterialRow}
          onSubmit={form.submit}
          isSubmitting={projects.isCreating}
          submitError={projects.createError}
          successMessage={form.successMessage}
          focusRequest={form.focusRequest}
        />
      </div>
    </div>
  )
}
