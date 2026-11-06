import type { EmissionCategory } from '../../types'

// Color de apoyo por categoría (el texto de la categoría siempre acompaña: no se comunica solo con color).
// Texto -800 sobre fondo -100: contraste medido entre 6.41:1 y 7.71:1 (AA ≥ 4.5).
export const CATEGORY_BADGE_CLASSES: Record<EmissionCategory, string> = {
  transporte: 'bg-sky-100 text-sky-800',
  energia: 'bg-amber-100 text-amber-800',
  residuos: 'bg-violet-100 text-violet-800',
}
