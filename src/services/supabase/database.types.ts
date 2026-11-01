// Generar/actualizar con: npx supabase gen types typescript --project-id <id> > src/services/supabase/database.types.ts
export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          owner_id: string
          name: string
          sku: string
          category: 'reciclado' | 'reutilizable' | 'biodegradable' | 'otro'
          stock: number
          carbon_footprint_kg: number
          created_at: string
        }
        Insert: {
          id?: string
          owner_id?: string
          name: string
          sku: string
          category: 'reciclado' | 'reutilizable' | 'biodegradable' | 'otro'
          stock?: number
          carbon_footprint_kg?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
