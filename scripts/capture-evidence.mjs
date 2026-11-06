// Genera las capturas de evidencia del EcoTrack Dashboard y verifica Realtime + aislamiento por RLS.
//
// Requisitos: Supabase local arriba (npm run db:start) y la app en modo Supabase (npm run dev, VITE_USE_MOCK=false).
// Uso:        npm run evidence            (o: node scripts/capture-evidence.mjs http://localhost:5173)
// Salida:     docs/evidencias/final/*.png y docs/evidencias/final/capture-log.txt
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, devices } from 'playwright'

const BASE_URL = process.argv[2] ?? 'http://localhost:5173'
const OUT = 'docs/evidencias/final'
const log = []
const say = (line) => {
  console.log(line)
  log.push(line)
}

const SAMPLE = [
  ['Flota de camiones de reparto', 'transporte', '1250,5'],
  ['Planta de producción principal', 'energia', '3420'],
  ['Residuos orgánicos de cafetería', 'residuos', '310,25'],
  ['Vuelos corporativos', 'transporte', '2780,75'],
]

const listReady = (page) => page.locator('section[aria-labelledby="list-title"][aria-busy="false"]').waitFor()
const cards = (page) => page.locator('section[aria-labelledby="list-title"] article')

async function addMeasurement(page, [source, category, co2]) {
  await page.getByLabel('Fuente de emisión').fill(source)
  await page.getByLabel('Categoría').selectOption(category)
  await page.getByLabel('CO₂ producido (kg)').fill(co2)
  await page.getByRole('button', { name: 'Agregar medición' }).click()
  await page.getByRole('status').filter({ hasText: `"${source}"` }).waitFor()
}

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
const consoleErrors = []

// 1. Usuario A: sesión anónima nueva, estado vacío y carga de datos de ejemplo por la UI.
const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-CO' })
const tab1 = await ctxA.newPage()
tab1.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
await tab1.goto(BASE_URL)
await listReady(tab1)
await tab1.getByText('Aún no hay mediciones').waitFor()
await tab1.screenshot({ path: `${OUT}/01-estado-vacio.png` })
say('01 estado vacío: OK (sesión anónima nueva, 0 mediciones)')

for (const sample of SAMPLE) await addMeasurement(tab1, sample)
say(`02 inserciones por la UI: ${await cards(tab1).count()} tarjetas`)

// 2. Error de validación (foco en el primer campo inválido).
await tab1.getByLabel('Fuente de emisión').fill('A')
await tab1.getByLabel('CO₂ producido (kg)').fill('0')
await tab1.getByRole('button', { name: 'Agregar medición' }).click()
await tab1.locator('#emission-category[aria-invalid="true"]').waitFor()
const focused = await tab1.evaluate(() => document.activeElement?.id)
await tab1.screenshot({ path: `${OUT}/03-error-validacion.png` })
say(`03 validación: foco en "${focused}", campos con aria-invalid=true: ${await tab1.locator('[aria-invalid="true"]').count()}`)
await tab1.getByLabel('Fuente de emisión').fill('')
await tab1.getByLabel('CO₂ producido (kg)').fill('')
await tab1.reload()
await listReady(tab1)
await tab1.getByText('En vivo').waitFor()
await tab1.screenshot({ path: `${OUT}/04-escritorio.png` })
say('04 escritorio 1440px con indicador "En vivo": OK')

// 3. Tiempo real: segunda pestaña de la MISMA sesión inserta; la primera lo recibe sin recargar.
const tab2 = await ctxA.newPage()
await tab2.goto(BASE_URL)
await listReady(tab2)
await tab2.getByText('En vivo').waitFor()

// Usuario B (otra sesión anónima) para comprobar que Realtime respeta RLS.
const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const tabB = await ctxB.newPage()
await tabB.goto(BASE_URL)
await listReady(tabB)
await tabB.getByText('En vivo').waitFor()

const before = await cards(tab1).count()
const t0 = Date.now()
await addMeasurement(tab2, ['Generador diésel (pestaña 2)', 'energia', '845,3'])
await tab1.getByText('Generador diésel (pestaña 2)').waitFor({ timeout: 10_000 })
const latency = Date.now() - t0
await tab1.screenshot({ path: `${OUT}/05-tiempo-real-pestana-1.png` })
say(`05 tiempo real: la pestaña 1 pasó de ${before} a ${await cards(tab1).count()} tarjetas sin recargar (~${latency} ms tras enviar en la pestaña 2)`)
say(`   deduplicación: la pestaña 2 (que insertó y recibió su propio eco) muestra ${await cards(tab2).filter({ hasText: 'Generador diésel (pestaña 2)' }).count()} tarjeta con esa fuente`)

await tabB.waitForTimeout(2_000)
say(`06 aislamiento RLS en Realtime: el usuario B ve ${await cards(tabB).count()} tarjetas (esperado 0)`)

// 4. Carga lenta simulada: skeleton + aria-busy.
const ctxSlow = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: await ctxA.storageState() })
const slow = await ctxSlow.newPage()
await slow.route('**/rest/v1/emisiones**', async (route) => {
  await new Promise((resolve) => setTimeout(resolve, 2_500))
  await route.continue()
})
await slow.goto(BASE_URL)
await slow.locator('section[aria-labelledby="list-title"][aria-busy="true"]').waitFor()
await slow.screenshot({ path: `${OUT}/07-cargando-skeleton.png` })
say('07 carga lenta simulada (2,5 s): skeleton con aria-busy="true"')
await ctxSlow.close()

// 5. Móvil y tablet con emulación real de dispositivo, misma sesión (con datos).
for (const [name, device] of [['08-movil-iphone13', devices['iPhone 13']], ['09-tablet-ipad-mini', devices['iPad Mini']]]) {
  const ctx = await browser.newContext({ ...device, storageState: await ctxA.storageState() })
  const page = await ctx.newPage()
  await page.goto(BASE_URL)
  await listReady(page)
  const m = await page.evaluate(() => ({
    vw: innerWidth,
    scroll: document.documentElement.scrollWidth,
    cols: getComputedStyle(document.querySelector('section[aria-labelledby="list-title"] ul')).gridTemplateColumns.split(' ').length,
  }))
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  say(`${name.slice(0, 2)} ${name.slice(3)}: viewport ${m.vw}px, ${m.cols} columna(s), ${m.scroll > m.vw ? 'CON' : 'sin'} scroll horizontal`)
  await ctx.close()
}

say(`consola: ${consoleErrors.length ? consoleErrors.join(' | ') : 'sin errores'}`)
await writeFile(`${OUT}/capture-log.txt`, `${log.join('\n')}\n`)
await browser.close()
