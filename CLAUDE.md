# CLAUDE.md — Contexto persistente del proyecto

## Qué es
Repo de laboratorios de la Maestría (Escuela Colombiana de Ingeniería). Contiene:
- **EcoTech Inventory** (lab 1): scaffolding por capas, dominio `products`.
- **EcoTrack** (lab actual, "Spec-to-Code"): Dashboard de Emisiones en Tiempo Real, construido como dominio nuevo
  sobre la misma arquitectura. Spec en `docs/SPEC.md`, decisiones en `ARCHITECTURE.md`, bitácora en `docs/BITACORA_PROMPTS.md`.
- `mentorlink/` es otro lab (infra Supabase) y está en `.gitignore`. No tocarlo.

## Cómo trabajamos
- Hablar en español, tono casual. El usuario (Sebastian) es el Arquitecto de IA.
- SDD: plano antes que código. Prompts con estructura ROL / CONTEXTO / TAREA / RESTRICCIONES / FORMATO DE SALIDA,
  guardados en `docs/prompts/0N-<nombre>.md`.
- Por iteración: redactar prompt → esperar OK → ejecutar → revisar contra SPEC y checklist → registrar en la bitácora
  (problemas **reales**, con salida de comandos; nunca inventados) → commit Conventional Commits + tag `iter-N` → parar y reportar.
- Nunca `git push`, no crear remotos, no borrar fuera de alcance sin preguntar. Si algo es ambiguo, una sola pregunta concreta.

## Stack y comandos
Vite 8 · React 19 · TypeScript 7 strict · Tailwind CSS v4 (`@tailwindcss/vite`) · supabase-js 2 · Supabase CLI 2.122.1 (devDep)
· Vitest 5 + Testing Library · Playwright 1.64 · oxlint (+ jsx-a11y).

```
npm run dev | typecheck | lint | test | build
npm run db:start | db:status | db:lint | db:reset | db:types   # requieren Docker
npm run evidence                                                # capturas + verificación Realtime (Playwright)
npm run analyze                                                 # reporte del bundle (ANALYZE=despues)
node scripts/measure-performance.mjs <dist-a> <dist-b>          # FCP/LCP con 3G + CPU 4×
```

## Reglas de arquitectura (las hace cumplir oxlint)
- `pages → components`; `pages → hooks/context → services → services/supabase`. `types/` y `utils/` no importan a nadie.
- Solo `src/services/**` importa `@supabase/supabase-js`. Los tipos del SDK se traducen a dominio en services (`User` → `AuthUser`).
- `components/**` no importa hooks, services ni context: solo props + JSX.
- `getSupabase()` es ASÍNCRONO (SDK con import() dinámico). El mock no va en el barrel de services.
- `App.tsx` importa sub-barrels (`./components/layout`): el barrel raíz arrastra el dashboard al chunk inicial.
- Los tests corren en modo mock forzado (`test.env` en vite.config.ts): nunca tocan red ni Supabase.
- Barrels: importar desde `'../hooks'`, nunca archivos internos. Cada carpeta tiene README + index.ts.
- Servicios mapean snake_case (BD) → camelCase (dominio).

## Supabase
- Migraciones con `npx supabase migration new <nombre>`; una migración aplicada **no se edita**.
- RLS `to authenticated` con `(select auth.uid())`; `revoke all` + grants por columna; `security definer` con `set search_path = ''`.
- Solo anon key en el frontend (de `npx supabase status`). Nunca service_role/secret.
- Sesión anónima habilitada (`enable_anonymous_sign_ins = true`) solo para la demo.
- `supabase migration new` lee SQL de stdin si está canalizado: ejecutarlo con `< /dev/null` o se queda colgado.

## Estado
Lab "Spec-to-Code" cerrado (tags `fase-0`…`iter-4`, `docs/ENTREGA.md`).
Lab 5 "Auditoría y optimización" cerrado (tag `lab5`): informe en `docs/AUDITORIA_LAB5.md`, entrega en `docs/ENTREGA_LAB5.md`,
prompts 05–07, evidencias en `docs/evidencias/lab5/`.

## Definición de terminado
typecheck/lint/test/build verdes · capas respetadas · barrels y READMEs al día · feedback de loading/error/vacío/éxito
· responsive y accesible · RLS verificado con dos usuarios · sin secretos en git, `.env.example` completo.
