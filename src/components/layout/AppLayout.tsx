import type { ReactNode } from 'react'

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="layout">
      <header className="layout__header">EcoTech Solutions · Inventario sostenible</header>
      <main className="layout__main">{children}</main>
    </div>
  )
}
