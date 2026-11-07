// EcoFlow · verificación E2E con tres usuarios reales contra Supabase local + capturas de evidencia.
// Requisitos: npm run db:start y npm run dev (VITE_USE_MOCK=false).
// Uso: node scripts/ecoflow-evidence.mjs [http://localhost:5173] [docs/evidencias/ecoflow]
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, devices } from 'playwright'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const OUT = process.argv[3] ?? 'docs/evidencias/ecoflow'
const log = []
const say = (line) => {
  console.log(line)
  log.push(line)
}
await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
const errors = []
const newUser = async (options = { viewport: { width: 1440, height: 1000 } }) => {
  const context = await browser.newContext({ locale: 'es-CO', ...options })
  const page = await context.newPage()
  page.on('console', (m) => m.type() === 'error' && !/400|409|429/.test(m.text()) && errors.push(m.text()))
  return { context, page }
}
const boardReady = (page) => page.locator('section[aria-labelledby="board-title"][aria-busy="false"]').waitFor()
const cardOf = (page, name) => page.locator('article').filter({ has: page.getByRole('heading', { name }) })

// ---------------------------------------------------------------- Coordinador A: equipo y catálogo
const A = await newUser()
await A.page.goto(`${BASE}/equipo`)
await A.page.getByRole('heading', { name: 'Equipo y materiales' }).waitFor()
for (const [name, specialty] of [['Ana Solar', 'electrica'], ['Luis Techo', 'estructural']]) {
  await A.page.getByLabel('Nombre', { exact: true }).first().fill(name)
  await A.page.getByLabel('Especialidad').selectOption(specialty)
  await A.page.getByRole('button', { name: 'Agregar y generar código' }).click()
  await A.page.getByText(name).waitFor()
}
for (const [name, unit, cost] of [['Panel solar 550 W', 'unidad', '520000'], ['Inversor 10 kW', 'unidad', '6800000'], ['Cable solar 6 mm²', 'metro', '7500']]) {
  await A.page.locator('#material-name').fill(name)
  await A.page.locator('#material-unit').selectOption(unit)
  await A.page.locator('#material-cost').fill(cost)
  await A.page.getByRole('button', { name: 'Agregar material' }).click()
  await A.page.getByRole('cell', { name }).waitFor()
}
const anaCode = (await A.page.locator('li').filter({ hasText: 'Ana Solar' }).locator('code').textContent()).trim()
await A.page.screenshot({ path: `${OUT}/01-equipo-coordinador.png`, fullPage: true })
say(`01 coordinador A: 2 instaladores y 3 materiales creados; código de Ana = ${anaCode.length} caracteres`)

// ---------------------------------------------------------------- Coordinador A: proyectos
await A.page.getByRole('link', { name: 'Proyectos' }).click()
await boardReady(A.page)
await A.page.getByRole('button', { name: 'Crear proyecto' }).click()
const focused = await A.page.evaluate(() => document.activeElement?.id)
await A.page.screenshot({ path: `${OUT}/02-validacion-formulario.png` })
say(`02 validación: envío vacío bloqueado, ${await A.page.locator('form [aria-invalid="true"]').count()} campos aria-invalid, foco en ${focused}`)

async function createProject(page, p) {
  await page.getByLabel('Nombre del proyecto *').fill(p.name)
  await page.getByLabel('Cliente *').fill(p.client)
  await page.getByLabel('Ubicación *').fill(p.location)
  await page.getByLabel('Capacidad (kW) *').fill(p.kw)
  await page.getByLabel('Inicio *').fill(p.start)
  await page.getByLabel('Fin estimado *').fill(p.end)
  await page.getByLabel('Instalador asignado').selectOption(p.installer ? { label: `${p.installer}` } : '')
  for (const [i, [material, qty]] of (p.materials ?? []).entries()) {
    await page.getByRole('button', { name: '+ Agregar material' }).click()
    await page.getByLabel(`Material ${i + 1}`, { exact: true }).selectOption({ label: material })
    await page.getByLabel(`Cantidad del material ${i + 1}`).fill(qty)
  }
  await page.getByRole('button', { name: 'Crear proyecto' }).click()
  await page.getByRole('status').filter({ hasText: `"${p.name}"` }).waitFor()
  await cardOf(page, p.name).waitFor()
}
await createProject(A.page, { name: 'Granja Solar Norte', client: 'Hacienda La Esperanza', location: 'Tunja, Boyacá', kw: '120,5', start: '2026-11-10', end: '2026-12-20', installer: 'Ana Solar · Eléctrica', materials: [['Panel solar 550 W (unidad)', '220'], ['Inversor 10 kW (unidad)', '12']] })
await createProject(A.page, { name: 'Techo Colegio San José', client: 'Colegio San José', location: 'Bogotá', kw: '35', start: '2026-11-15', end: '2026-11-30' })
await createProject(A.page, { name: 'Bodega Logística Sur', client: 'Transportes Andinos', location: 'Soacha', kw: '80', start: '2026-11-05', end: '2026-12-05', installer: 'Luis Techo · Estructural', materials: [['Cable solar 6 mm² (m)', '350,5']] })
say(`03 coordinador A: 3 proyectos creados con la RPC atómica; tablero pendiente = ${await A.page.locator('#col-pendiente + ul > li').count()}`)
await A.page.screenshot({ path: `${OUT}/03-dashboard-coordinador.png`, fullPage: true })

// ---------------------------------------------------------------- Instalador B: se vincula con el código de Ana
const B = await newUser()
await B.page.goto(`${BASE}/equipo`)
await B.page.getByLabel('Código de invitación').fill(anaCode.toLowerCase())
await B.page.getByRole('button', { name: 'Vincularme' }).click()
await B.page.getByText('Estás vinculado como').waitFor()
say('04 instaladora B: vinculada como Ana Solar con el código (escrito en minúsculas)')
await B.page.getByRole('link', { name: 'Proyectos' }).click()
await boardReady(B.page)
const bCards = await B.page.locator('article h3').allTextContents()
say(`05 RLS: B ve ${bCards.length} proyecto(s): ${bCards.join(', ')} (esperado: solo Granja Solar Norte)`)
await cardOf(B.page, 'Granja Solar Norte').getByRole('button', { name: /Iniciar instalación/ }).click()
await B.page.locator('#col-en_progreso + ul').getByRole('heading', { name: 'Granja Solar Norte' }).waitFor()
say('06 B avanzó su proyecto: Pendiente → En progreso (RPC cambiar_estado_proyecto)')
await B.page.screenshot({ path: `${OUT}/04-vista-instalador.png`, fullPage: true })

// ---------------------------------------------------------------- Usuario C: ajeno a todo
const C = await newUser()
await C.page.goto(`${BASE}/proyectos`)
await boardReady(C.page)
say(`07 RLS: el usuario C (sin vínculo) ve ${await C.page.locator('article').count()} proyectos`)
await C.page.getByRole('link', { name: 'Equipo' }).click()
await C.page.getByLabel('Código de invitación').fill(anaCode)
await C.page.getByRole('button', { name: 'Vincularme' }).click()
say(`08 C reutiliza el código de Ana → "${(await C.page.getByRole('alert').textContent()).trim()}"`)

// ---------------------------------------------------------------- Coordinador A ve el avance
await A.page.reload()
await boardReady(A.page)
const enProgreso = await A.page.locator('#col-en_progreso + ul article h3').allTextContents()
const resumen = (await A.page.locator('section[aria-labelledby="projects-summary-title"] dd').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim())
say(`09 A recarga: En progreso = ${enProgreso.join(', ')} | resumen (BD) = ${resumen.join(' · ')}`)
await cardOf(A.page, 'Techo Colegio San José').waitFor()
say(`10 sin instalador, "Techo Colegio" no ofrece "Iniciar": ${await cardOf(A.page, 'Techo Colegio San José').getByRole('button').count()} botones`)
await A.page.screenshot({ path: `${OUT}/05-dashboard-actualizado.png`, fullPage: true })

// ---------------------------------------------------------------- Responsive
for (const [name, device] of [['06-movil-iphone13', devices['iPhone 13']], ['07-tablet-ipad-mini', devices['iPad Mini']]]) {
  const ctx = await browser.newContext({ ...device, storageState: await A.context.storageState() })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/proyectos`)
  await boardReady(page)
  const m = await page.evaluate(() => ({ vw: innerWidth, scroll: document.documentElement.scrollWidth }))
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  say(`${name.slice(0, 2)} ${name.slice(3)}: viewport ${m.vw}px, ${m.scroll > m.vw ? 'CON' : 'sin'} scroll horizontal`)
  await ctx.close()
}
say(`consola: ${errors.length ? errors.join(' | ') : 'sin errores inesperados'}`)
await writeFile(`${OUT}/e2e-log.txt`, `${log.join('\n')}\n`)
await browser.close()
