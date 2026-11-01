// Modelo de dominio: lo que la UI conoce. Independiente del esquema SQL.
export type ProductCategory = 'reciclado' | 'reutilizable' | 'biodegradable' | 'otro'

export interface Product {
  id: string
  name: string
  sku: string
  category: ProductCategory
  stock: number
  carbonFootprintKg: number
  createdAt: string
}

export type NewProduct = Omit<Product, 'id' | 'createdAt'>
