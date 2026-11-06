# utils/

Funciones **puras** y sin efectos (formateo, cálculos, validaciones).
`formatters.ts` (etiquetas y formato es-CO), `emissions.ts` (`summarizeEmissions`) y `validation.ts` (`validateEmission`, `isEmissionCategory`: mismas reglas que el CHECK de la BD).
Sin React, sin Supabase: deben poder testearse con un simple `expect(fn(x)).toBe(y)`.
