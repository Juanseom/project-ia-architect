import type { Product } from '../../types'
import { formatKgCO2, isLowStock } from '../../utils'
import { Button, Card } from '../ui'

export interface ProductListProps {
  products: readonly Product[]
  onDelete: (id: string) => void
}

const CATEGORY_LABELS: Record<Product['category'], string> = {
  reciclado: 'Reciclado',
  reutilizable: 'Reutilizable',
  biodegradable: 'Biodegradable',
  otro: 'Otro',
}

/** Componente presentacional: recibe datos por props y emite eventos. Sin fetch, sin Supabase. */
export function ProductList({ products, onDelete }: ProductListProps) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((p) => (
        <li key={p.id}>
          <Card className="flex h-full flex-col gap-2">
            <p className="text-xs font-semibold text-brand-700">{CATEGORY_LABELS[p.category]} · SKU {p.sku}</p>
            <h3 className="text-base font-semibold break-words">{p.name}</h3>
            <p className="text-sm text-ink-700">
              Stock: <span className={isLowStock(p.stock) ? 'font-semibold text-red-700' : ''}>{p.stock}</span>
              {isLowStock(p.stock) && <span className="sr-only"> (bajo)</span>} · {formatKgCO2(p.carbonFootprintKg)}
            </p>
            <Button variant="secondary" className="mt-auto self-start" onClick={() => onDelete(p.id)} aria-label={`Eliminar ${p.name}`}>
              Eliminar
            </Button>
          </Card>
        </li>
      ))}
    </ul>
  )
}
