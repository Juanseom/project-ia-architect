# test/

Configuración compartida de Vitest (`setup.ts`: matchers de jest-dom + cleanup).
Las pruebas viven junto al código que prueban (`useEmissions.test.ts`, `EmissionForm.test.tsx`).
Los hooks se prueban con el servicio **mock**, sin base de datos.
