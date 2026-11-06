import { Button } from '../components/ui'
import { navigate } from '../router'

/** Ruta desconocida. Se carga perezosamente: casi nadie la visita, así que no pesa en el bundle inicial. */
export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-title" className="mx-auto max-w-md py-16 text-center">
      <p className="text-sm font-semibold text-brand-700">Error 404</p>
      <h1 id="not-found-title" className="mt-2 text-2xl font-bold">Esta página no existe</h1>
      <p className="mt-2 text-ink-500">Revisa la dirección o vuelve al dashboard de emisiones.</p>
      <Button className="mt-6" onClick={() => navigate('/')}>Ir al dashboard</Button>
    </section>
  )
}
