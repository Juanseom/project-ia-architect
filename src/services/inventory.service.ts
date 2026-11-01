import type { NewProduct, Product } from '../types'
import { supabase, type Database } from './supabase'

type ProductRow = Database['public']['Tables']['products']['Row']

// Mapper: traduce snake_case de la BD al modelo de dominio.
const toProduct = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  sku: row.sku,
  category: row.category,
  stock: row.stock,
  carbonFootprintKg: row.carbon_footprint_kg,
  createdAt: row.created_at,
})

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data.map(toProduct)
}

export async function createProduct(input: NewProduct): Promise<Product> {
  const { data, error } = await supabase
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
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
