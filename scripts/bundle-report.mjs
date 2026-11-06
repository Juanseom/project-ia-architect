// Resume un reporte raw-data de rollup-plugin-visualizer: peso por paquete y por chunk.
// Uso: node scripts/bundle-report.mjs docs/evidencias/lab5/bundle-antes.json
import { readFileSync } from 'node:fs'

const file = process.argv[2]
const data = JSON.parse(readFileSync(file, 'utf8'))
const kb = (n) => `${(n / 1024).toFixed(1)} kB`

const pkgOf = (id) => {
  const m = id.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/)
  if (m) return m[1]
  if (id.includes('/src/')) return `src/${id.split('/src/')[1].split('/')[0]}`
  return id.replace(/^\0/, '')
}

const byPkg = new Map()
const byChunk = new Map()
for (const meta of Object.values(data.nodeMetas)) {
  for (const [chunk, partUid] of Object.entries(meta.moduleParts)) {
    const part = data.nodeParts[partUid]
    if (!part || !chunk.endsWith('.js')) continue
    const pkg = pkgOf(meta.id)
    const p = byPkg.get(pkg) ?? { raw: 0, gzip: 0, chunks: new Set() }
    p.raw += part.renderedLength
    p.gzip += part.gzipLength
    p.chunks.add(chunk.replace(/^assets\//, ''))
    byPkg.set(pkg, p)
    const c = byChunk.get(chunk) ?? { raw: 0, gzip: 0 }
    c.raw += part.renderedLength
    c.gzip += part.gzipLength
    byChunk.set(chunk, c)
  }
}

const total = [...byPkg.values()].reduce((s, p) => s + p.raw, 0)
console.log(`Reporte: ${file}`)
console.log('\nPor paquete (código renderizado antes de minificar, % del total):')
for (const [pkg, p] of [...byPkg].sort((a, b) => b[1].raw - a[1].raw).slice(0, 14)) {
  console.log(`  ${pkg.padEnd(28)} ${kb(p.raw).padStart(9)}  ${((p.raw / total) * 100).toFixed(1).padStart(5)}%   chunk: ${[...p.chunks].join(', ')}`)
}
console.log('\nPor chunk:')
for (const [chunk, c] of [...byChunk].sort((a, b) => b[1].raw - a[1].raw)) {
  console.log(`  ${chunk.padEnd(40)} ${kb(c.raw).padStart(9)}`)
}
