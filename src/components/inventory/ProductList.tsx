import type { Product } from '../../types'
import { formatKgCO2, isLowStock } from '../../utils'
import { Button } from '../ui'

interface ProductListProps {
  products: Product[]
  onDelete: (id: string) => void
}

// Componente presentacional: recibe datos por props y emite eventos. Sin fetch, sin Supabase.
export function ProductList({ products, onDelete }: ProductListProps) {
  if (products.length === 0) return <p>No hay productos registrados.</p>

  return (
    <ul className="product-list">
      {products.map((p) => (
        <li key={p.id} className={isLowStock(p.stock) ? 'is-low-stock' : undefined}>
          <strong>{p.name}</strong> · {p.sku} · {p.category} · stock {p.stock} · {formatKgCO2(p.carbonFootprintKg)}
          <Button variant="danger" onClick={() => onDelete(p.id)}>Eliminar</Button>
        </li>
      ))}
    </ul>
  )
}
