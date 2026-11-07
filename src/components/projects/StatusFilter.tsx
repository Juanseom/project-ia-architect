import { PROJECT_STATUSES, type ProjectStatusFilter } from '../../types'
import { PROJECT_STATUS_LABELS } from '../../utils'

export interface StatusFilterProps {
  value: ProjectStatusFilter
  onChange: (value: ProjectStatusFilter) => void
}

const OPTIONS: { value: ProjectStatusFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  ...PROJECT_STATUSES.map((status) => ({ value: status, label: PROJECT_STATUS_LABELS[status] })),
]

/** Filtro por estado como grupo de botones conmutables (aria-pressed). */
export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">Filtrar por estado</legend>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${
            value === option.value ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-500/30 bg-white text-ink-700 hover:bg-brand-50'
          }`}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  )
}
