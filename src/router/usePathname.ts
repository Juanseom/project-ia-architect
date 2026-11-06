import { useSyncExternalStore } from 'react'
import { getPathname, subscribe } from './router'

/** Ruta actual; re-renderiza al navegar (pushState) o con atrás/adelante (popstate). */
export function usePathname(): string {
  return useSyncExternalStore(subscribe, getPathname, () => '/')
}
