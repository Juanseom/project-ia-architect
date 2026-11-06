import type { ReactNode } from 'react'

export interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-500/15 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <span className="grid size-9 place-items-center rounded-lg bg-brand-600 font-bold text-white">E</span>
          <div>
            <p className="font-semibold text-ink-900">EcoTrack</p>
            <p className="text-xs text-ink-500">Monitoreo de huella de carbono</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
