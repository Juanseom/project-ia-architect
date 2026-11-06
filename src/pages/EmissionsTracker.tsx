import {
  EmissionForm,
  EmissionList,
  EmissionsEmpty,
  EmissionsError,
  EmissionsLoading,
  EmissionsSummary,
  LiveIndicator,
} from '../components'
import { useEmissionForm, useEmissions } from '../hooks'

/** Contenedor del dashboard: une useEmissions + useEmissionForm (lógica) con los componentes de emissions/ (UI). */
export function EmissionsTracker() {
  const { state, summary, canSubmit, isSubmitting, submitError, addEmission, reload, realtime } = useEmissions()
  const form = useEmissionForm({ onSubmit: addEmission })

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Dashboard de emisiones</h1>
          <p className="text-ink-500">Huella de carbono de tu empresa, actualizada en tiempo real.</p>
        </div>
        <LiveIndicator status={realtime} />
      </header>

      <EmissionsSummary totals={summary} loading={state.status === 'loading'} />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="list-title" aria-busy={state.status === 'loading'}>
          <h2 id="list-title" className="mb-4 text-lg font-semibold">Mediciones</h2>
          {state.status === 'loading' && <EmissionsLoading />}
          {state.status === 'error' && <EmissionsError message={state.error} onRetry={reload} />}
          {state.status === 'empty' && <EmissionsEmpty onCreate={form.focusFirstField} />}
          {state.status === 'success' && <EmissionList emissions={state.emissions} />}
        </section>

        <EmissionForm
          values={form.values}
          errors={form.errors}
          onFieldChange={form.setField}
          onSubmit={form.submit}
          isSubmitting={isSubmitting}
          disabled={!canSubmit}
          submitError={submitError}
          successMessage={form.successMessage}
          focusRequest={form.focusRequest}
        />
      </div>
    </div>
  )
}
