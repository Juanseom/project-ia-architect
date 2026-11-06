// Compara la carga inicial de dos builds (antes/después) con red y CPU limitadas, como un móvil de gama media.
// Uso: node scripts/measure-performance.mjs <dist-antes> <dist-despues> [corridas=7]
// Requiere Supabase local arriba (la app crea una sesión anónima y carga datos reales).
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { gzipSync } from 'node:zlib'
import { chromium } from 'playwright'

const [dirBefore, dirAfter, runsArg] = process.argv.slice(2)
const RUNS = Number(runsArg ?? 7)
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }

// Servidor estático con gzip (como Netlify/Vercel/Nginx) y fallback SPA a index.html.
function serve(root, port) {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')
    let file = join(root, path)
    let body
    try {
      body = await readFile(file)
    } catch {
      file = join(root, 'index.html')
      body = await readFile(file)
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Content-Encoding': 'gzip' })
    res.end(gzipSync(body))
  })
  return new Promise((resolve) => server.listen(port, () => resolve(server)))
}

// Perfil "3G rápida" de Lighthouse aprox.: 150 ms RTT, 1,6 Mbps de bajada, CPU 4× más lenta.
const NETWORK = { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 }

async function measure(browser, url) {
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', NETWORK)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  await page.goto(url)
  await page.locator('section[aria-labelledby="list-title"][aria-busy="false"]').waitFor({ timeout: 60_000 })
  const dataReady = await page.evaluate(() => performance.now())
  const metrics = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const js = performance
            .getEntriesByType('resource')
            .filter((r) => r.name.endsWith('.js'))
            .map((r) => ({ name: r.name.split('/').pop(), kb: r.transferSize / 1024, start: r.startTime, end: r.responseEnd }))
          resolve({ fcp, lcp: entries.at(-1)?.startTime ?? null, js })
        }).observe({ type: 'largest-contentful-paint', buffered: true })
      }),
  )
  await context.close()
  return { ...metrics, dataReady }
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const servers = [await serve(dirBefore, 4301), await serve(dirAfter, 4302)]
const browser = await chromium.launch()
const results = { antes: [], despues: [] }
for (let i = 0; i < RUNS; i++) {
  // Alterna el orden para no favorecer a ninguna versión con cachés del sistema.
  for (const [name, port] of i % 2 ? [['despues', 4302], ['antes', 4301]] : [['antes', 4301], ['despues', 4302]]) {
    results[name].push(await measure(browser, `http://localhost:${port}/`))
  }
}
await browser.close()
servers.forEach((s) => s.close())

const ms = (v) => `${Math.round(v)} ms`
console.log(`Perfil: 3G rápida (150 ms RTT, 1,6 Mbps) + CPU 4×, viewport 412×915, ${RUNS} corridas, mediana\n`)
console.log('Métrica                         Antes       Después     Cambio')
for (const [label, key] of [['FCP (primer contenido)', 'fcp'], ['LCP (mayor contenido)', 'lcp'], ['Datos visibles (sesión+API)', 'dataReady']]) {
  const a = median(results.antes.map((r) => r[key]))
  const d = median(results.despues.map((r) => r[key]))
  console.log(`${label.padEnd(31)} ${ms(a).padEnd(11)} ${ms(d).padEnd(11)} ${(((d - a) / a) * 100).toFixed(1)}%`)
}
for (const name of ['antes', 'despues']) {
  const last = results[name].at(-1)
  console.log(`\nJS descargado (${name}, transferido con gzip):`)
  for (const r of last.js) console.log(`  ${r.name.padEnd(36)} ${r.kb.toFixed(1).padStart(6)} kB  pedido en ${ms(r.start)}`)
  console.log(`  TOTAL ${last.js.reduce((s, r) => s + r.kb, 0).toFixed(1)} kB`)
}
