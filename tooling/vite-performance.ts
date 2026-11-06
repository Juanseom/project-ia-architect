import type { Plugin } from 'vite'

/**
 * Agrega <link rel="modulepreload"> para chunks perezosos que la ruta inicial SIEMPRE necesita
 * (la página de inicio y el SDK de Supabase). Siguen fuera del JS que bloquea el primer render, pero el
 * navegador los descarga en paralelo desde el HTML en lugar de esperar a que el JS principal los pida
 * (cascada medida en el Lab 5: se pedían a los ~770 ms).
 */
export function preloadLazyChunks(chunkNames: readonly string[]): Plugin {
  return {
    name: 'ecotrack:preload-lazy-chunks',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return []
        return Object.values(ctx.bundle)
          .filter((file) => file.type === 'chunk' && chunkNames.includes(file.name))
          .map((file) => ({
            tag: 'link',
            attrs: { rel: 'modulepreload', crossorigin: true, href: `/${file.fileName}` },
            injectTo: 'head' as const,
          }))
      },
    },
  }
}
