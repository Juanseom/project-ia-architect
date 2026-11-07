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
  // EcoFlow (proyecto final): dominio nuevo, cada ruta en su propio chunk.
  '/proyectos': lazy(() => import('./pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage }))),
  '/equipo': lazy(() => import('./pages/TeamPage').then((m) => ({ default: m.TeamPage }))),
}

export const NotFoundRoute = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

const ECOTRACK = { name: 'EcoTrack', tagline: 'Monitoreo de huella de carbono' }
const ECOFLOW = { name: 'EcoFlow', tagline: 'Gestión de proyectos de energía solar' }

/** Marca del módulo según la ruta (misma plataforma y arquitectura, dominios distintos). */
export const brandFor = (pathname: string) => (pathname === '/proyectos' || pathname === '/equipo' ? ECOFLOW : ECOTRACK)

/** Enlaces de la navegación principal. */
export const NAV_LINKS = [
  { href: '/', label: 'Emisiones' },
  { href: '/proyectos', label: 'Proyectos' },
  { href: '/equipo', label: 'Equipo' },
  { href: '/inventario', label: 'Inventario' },
] as const
