// Única puerta de entrada a las variables de entorno. Falla rápido si falta alguna.
function required(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  if (!value) throw new Error(`Falta la variable de entorno ${name}. Revisa .env.example`)
  return value
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL'),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY'),
} as const
