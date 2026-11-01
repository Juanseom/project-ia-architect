import { createClient } from '@supabase/supabase-js'
import { env } from '../../config'
import type { Database } from './database.types'

// Singleton: la única instancia del cliente en toda la app.
export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey)
