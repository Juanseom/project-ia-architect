// Router mínimo sobre la History API (sin dependencias: react-router agregaría peso al bundle inicial,
// justo lo que el Lab 5 busca reducir). Suficiente para las rutas de esta app.

const listeners = new Set<() => void>()

export const getPathname = (): string => window.location.pathname

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  window.addEventListener('popstate', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('popstate', listener)
  }
}

/** Navega sin recargar la página y notifica a los suscriptores. */
export function navigate(to: string): void {
  if (to === getPathname()) return
  window.history.pushState(null, '', to)
  listeners.forEach((listener) => listener())
}
