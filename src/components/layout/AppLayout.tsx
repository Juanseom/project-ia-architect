import type { MouseEvent, ReactNode } from 'react'

export interface NavItem {
  href: string
  label: string
}

export interface AppLayoutProps {
  children: ReactNode
  nav: readonly NavItem[]
  currentPath: string
  /** Navegación del lado del cliente (sin recargar). */
  onNavigate: (href: string) => void
}

export function AppLayout({ children, nav, currentPath, onNavigate }: AppLayoutProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    // Ctrl/Cmd/Shift-clic o botón central: comportamiento normal del navegador (nueva pestaña, etc.).
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onNavigate(href)
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-500/15 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-lg bg-brand-600 font-bold text-white">E</span>
            <div>
              <p className="font-semibold text-ink-900">EcoTrack</p>
              <p className="text-xs text-ink-500">Monitoreo de huella de carbono</p>
            </div>
          </div>
          <nav aria-label="Principal">
            <ul className="flex gap-1">
              {nav.map((item) => {
                const current = item.href === currentPath
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={(e) => handleClick(e, item.href)}
                      aria-current={current ? 'page' : undefined}
                      className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition-colors ${
                        current ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-brand-50'
                      }`}
                    >
                      {item.label}
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
