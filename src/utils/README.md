# utils/

Funciones **puras** y sin efectos (formateo, cálculos, validaciones).
`formatters.ts` (etiquetas y formatos) y `emissions.ts` (`summarizeEmissions`: total y desglose en centésimas).
Sin React, sin Supabase: deben poder testearse con un simple `expect(fn(x)).toBe(y)`.
