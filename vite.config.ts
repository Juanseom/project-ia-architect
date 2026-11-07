import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { preloadLazyChunks } from './tooling/vite-performance.ts'
import { contentSecurityPolicy, noClientSecrets } from './tooling/vite-security.ts'

// ANALYZE=<nombre> npm run build → reporte del bundle (treemap HTML + datos JSON) en docs/evidencias/lab5/.
const analyze = process.env.ANALYZE
const analyzePlugins = analyze
  ? [
      visualizer({ filename: `docs/evidencias/lab5/bundle-${analyze}.html`, template: 'treemap', gzipSize: true, brotliSize: true }),
      visualizer({ filename: `docs/evidencias/lab5/bundle-${analyze}.json`, template: 'raw-data', gzipSize: true }),
    ]
  : []

// https://vite.dev/config/ · https://tailwindcss.com/docs/installation/using-vite · https://vitest.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const supabaseUrl = env.VITE_USE_MOCK === 'true' ? undefined : env.VITE_SUPABASE_URL

  return {
    plugins: [
      react(),
      tailwindcss(),
      noClientSecrets(),
      contentSecurityPolicy(supabaseUrl),
      // Sin precargas: la ruta '/' ya va en el chunk inicial y precargar vendor-supabase (54 kB) se midió y
      // empeoró el LCP un 20,7% (compite por ancho de banda con React). El plugin queda para rutas futuras.
      preloadLazyChunks([]),
      ...analyzePlugins,
    ],
    build: {
      rolldownOptions: {
        output: {
          // Chunks de vendor separados del código de la app: un cambio en la app no invalida
          // la caché del navegador para React ni para el SDK de Supabase (que cambian poco).
          codeSplitting: {
            groups: [
              { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 20 },
              { name: 'vendor-supabase', test: /node_modules[\\/](@supabase|iceberg-js)[\\/]/, priority: 10 },
            ],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      // Los tests nunca tocan la red: Vitest carga el .env del proyecto y, sin esto, un test de App abría
      // sesiones y un WebSocket contra el Supabase local (detectado en el Lab 5). En modo mock no hay cliente Supabase.
      env: { VITE_USE_MOCK: 'true', VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '', TZ: 'America/Bogota' },
    },
  }
})
