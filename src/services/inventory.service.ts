import type { NewProduct, Product, ProductCategory } from '../types'
import { getSupabase, type Database } from './supabase'

type ProductRow = Database['public']['Tables']['products']['Row']

const PRODUCT_CATEGORIES: readonly ProductCategory[] = ['reciclado', 'reutilizable', 'biodegradable', 'otro']

// En SQL la categoría es `text + check`, así que los tipos generados la ven como string.
// El guard valida en lugar de forzar un cast.
const isProductCategory = (value: string): value is ProductCategory =>
  (PRODUCT_CATEGORIES as readonly string[]).includes(value)

// Mapper: traduce snake_case de la BD al modelo de dominio.
const toProduct = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  sku: row.sku,
  category: isProductCategory(row.category) ? row.category : 'otro',
  stock: row.stock,
  carbonFootprintKg: row.carbon_footprint_kg,
  createdAt: row.created_at,
})

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await getSupabase()
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data.map(toProduct)
}

export async function createProduct(input: NewProduct): Promise<Product> {
  const { data, error } = await getSupabase()
    .from('products')
    .insert({
      name: input.name,
      sku: input.sku,
      category: input.category,
      stock: input.stock,
      carbon_footprint_kg: input.carbonFootprintKg,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return toProduct(data)
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await getSupabase().from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
