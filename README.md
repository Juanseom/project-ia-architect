# EcoTrack · Dashboard de Emisiones en Tiempo Real

Plataforma de monitoreo de huella de carbono — React 19 + TypeScript (Vite) + Tailwind CSS v4 + Supabase.
Construida sobre la arquitectura por capas de **EcoTech Inventory** (lab anterior), que se conserva como dominio `inventory`.

> Las instrucciones completas de ejecución se cierran en la Iteración 4.

## Puesta en marcha (local)

```bash
npm install
npm run db:start          # Supabase local (requiere Docker)
cp .env.example .env      # pega la URL y la anon key que muestra `npm run db:status`
npm run dev
```

Modo demo sin base de datos: `VITE_USE_MOCK=true` en `.env`.

## Calidad

```bash
npm run typecheck && npm run lint && npm test && npm run build
npm run db:lint
```

## Documentación

- [docs/SPEC.md](docs/SPEC.md): especificación funcional y criterios de aceptación.
- [ARCHITECTURE.md](ARCHITECTURE.md): capas, flujo y decisiones.
- [docs/BITACORA_PROMPTS.md](docs/BITACORA_PROMPTS.md): ciclo Spec-to-Code iteración por iteración.
- [docs/PROMPT_MAESTRO.md](docs/PROMPT_MAESTRO.md): prompt del lab EcoTech que generó la arquitectura.
- Cada carpeta de `src/` tiene su propio `README.md` con sus reglas.
