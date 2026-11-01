import { ProductList } from '../components'
import { useProducts } from '../hooks'

// Página contenedora: conecta un hook (lógica) con componentes (UI).
export function InventoryPage() {
  const { data, loading, error, removeProduct } = useProducts()

  if (loading) return <p>Cargando inventario…</p>
  if (error) return <p role="alert">Error: {error}</p>

  return (
    <section>
      <h1>Inventario</h1>
      <ProductList products={data} onDelete={removeProduct} />
    </section>
  )
}
