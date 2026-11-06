// Contraste WCAG 2.1 de los pares de color usados en la UI (OKLCH → sRGB lineal → luminancia relativa).
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
const oklch = (L, C, H) => {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map((c) => Math.min(1, Math.max(0, c)))
}
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b
const ratio = (x, y) => { const [a, b] = [lum(x), lum(y)].sort((p, q) => q - p); return (a + 0.05) / (b + 0.05) }
const C = {
  white: hex('#ffffff'), surface: hex('#f7faf8'), ink500: hex('#4b5563'), ink700: hex('#374151'), ink900: hex('#111827'),
  brand600: hex('#047857'), brand700: hex('#065f46'), brand900: hex('#064e3b'), brand100: hex('#d1fae5'),
  red50: oklch(0.971, 0.013, 17.38), red700: oklch(0.505, 0.213, 27.518), red800: oklch(0.444, 0.177, 26.899),
  sky100: oklch(0.951, 0.026, 236.824), sky800: oklch(0.443, 0.11, 240.79), amber100: oklch(0.962, 0.059, 95.617), amber800: oklch(0.473, 0.137, 46.201),
  violet100: oklch(0.943, 0.029, 294.588), violet800: oklch(0.432, 0.232, 292.759),
}
const pairs = [
  ['texto ink-900 / surface', 'ink900', 'surface'], ['texto secundario ink-500 / blanco', 'ink500', 'white'], ['texto secundario ink-500 / surface', 'ink500', 'surface'],
  ['label ink-700 / blanco', 'ink700', 'white'], ['botón blanco / brand-600', 'white', 'brand600'], ['éxito brand-700 / blanco', 'brand700', 'white'],
  ['total blanco / brand-900', 'white', 'brand900'], ['etiqueta total brand-100 / brand-900', 'brand100', 'brand900'],
  ['error campo red-700 / blanco', 'red700', 'white'], ['alerta red-800 / red-50', 'red800', 'red50'],
  ['badge sky-800 / sky-100', 'sky800', 'sky100'], ['badge amber-800 / amber-100', 'amber800', 'amber100'], ['badge violet-800 / violet-100', 'violet800', 'violet100'],
  ['foco brand-600 / surface (no texto, ≥3)', 'brand600', 'surface'],
]
let fail = 0
for (const [name, f, b] of pairs) { const r = ratio(C[f], C[b]); const min = name.includes('≥3') ? 3 : 4.5; if (r < min) fail++; console.log(`${r >= min ? 'OK ' : 'FAIL'} ${r.toFixed(2)}:1  ${name}`) }
console.log(fail ? `${fail} pares no cumplen AA` : 'Todos los pares cumplen WCAG AA')
