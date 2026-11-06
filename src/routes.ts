import { lazy, type ComponentType } from 'react'
import { EmissionsTracker } from './pages/EmissionsTracker'

/**
 * Tabla de rutas.
 * - '/' (aterrizaje) se importa de forma directa: medido en el Lab 5, hacerla perezosa no mejoró el LCP
 *   (1080 → 1116 ms) porque agrega un paso de descarga+ejecución antes del contenido principal; directa: 832 ms.
 * - Las rutas secundarias usan React.lazy: su código (página, hook, componentes) es un chunk aparte que
 *   solo se descarga al visitarlas. Se importa el archivo de la página, no el barrel de pages/.
 */
export const routes: Record<string, ComponentType> = {
  '/': EmissionsTracker,
  '/inventario': lazy(() => import('./pages/InventoryPage').then((m) => ({ default: m.InventoryPage }))),
}

export const NotFoundRoute = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

/** Enlaces de la navegación principal. */
export const NAV_LINKS = [
  { href: '/', label: 'Emisiones' },
  { href: '/inventario', label: 'Inventario' },
] as const
