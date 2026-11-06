import type { HTMLAttributes } from 'react'

export type CardProps = HTMLAttributes<HTMLElement>

/** Contenedor visual genérico (borde, fondo, sombra). No conoce el dominio. */
export function Card({ className = '', ...props }: CardProps) {
  return (
    <article
      className={`rounded-xl border border-ink-500/15 bg-white p-5 shadow-sm ${className}`.trim()}
      {...props}
    />
  )
}
