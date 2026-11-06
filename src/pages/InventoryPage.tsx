import { EmissionsLoading } from '../components/emissions'
import { ProductList } from '../components/inventory'
import { useProducts } from '../hooks'

/** Ruta /inventario (dominio EcoTech). Se carga con React.lazy: su código solo se descarga si se visita. */
export function InventoryPage() {
  const { products, loading, error, actionError, reload, removeProduct } = useProducts()

  return (
    <section aria-labelledby="inventory-title" aria-busy={loading} className="space-y-6">
      <header>
        <h1 id="inventory-title" className="text-2xl font-bold sm:text-3xl">Inventario sostenible</h1>
        <p className="text-ink-500">Productos de tu empresa con su huella de carbono (módulo EcoTech).</p>
      </header>
      {actionError !== null && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{actionError}</p>}
      {loading && <EmissionsLoading count={3} />}
      {!loading && error !== null && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
          <p className="font-semibold">No se pudo cargar el inventario</p>
          <p className="mt-1 text-sm">{error}</p>
          <button type="button" onClick={reload} className="mt-3 text-sm font-semibold underline">Reintentar</button>
        </div>
      )}
      {!loading && error === null && products.length === 0 && (
        <p className="rounded-xl border border-dashed border-ink-500/40 bg-white p-8 text-center text-ink-500">
          Aún no hay productos en tu inventario.
        </p>
      )}
      {!loading && error === null && products.length > 0 && <ProductList products={products} onDelete={removeProduct} />}
    </section>
  )
}
