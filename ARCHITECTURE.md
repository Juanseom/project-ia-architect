# Especificación de Arquitectura — EcoTech Inventory

## 1. Problema

El equipo de EcoTech es junior y tiende a escribir `supabase.from(...)` dentro de los componentes. Esto mezcla UI, reglas de negocio y acceso a datos en el mismo archivo: cualquier cambio en la base de datos rompe pantallas, la lógica se duplica y nada se puede probar de forma aislada. Siguiendo SDD, primero definimos este plano y después generamos el código; la estructura de carpetas es la especificación que impide repetir ese error.

## 2. Decisión: arquitectura por capas con dependencias en un solo sentido

```
pages  →  components (UI)
  ↓
hooks / context (lógica)  →  services (datos)  →  services/supabase (cliente)
            types/ y utils/: transversales, no dependen de nadie
```

| Capa | Responsabilidad | Prohibido |
|---|---|---|
| `components/` | JSX presentacional (`ui/`, `layout/`, `inventory/`) | importar servicios o Supabase |
| `pages/` | Contenedores: unen un hook con componentes | lógica de negocio |
| `hooks/` | Lógica de negocio: estado, carga, errores, mutaciones | devolver JSX |
| `context/` | Estado global (sesión de Supabase Auth) | datos de una sola pantalla |
| `services/` | Única puerta a datos externos; funciones async puras | React (`useState`, JSX) |
| `types/` | Modelos de dominio (`Product`) | lógica |
| `utils/`, `config/` | Funciones puras y variables de entorno tipadas | efectos secundarios |

Cada carpeta tiene un `README.md` con sus reglas y un `index.ts` (barrel) que define su API pública: el resto del código importa `from '../hooks'`, nunca archivos internos.

## 3. Relación con Supabase (capa de servicios)

- **`services/supabase/client.ts`** crea una única instancia `createClient<Database>()`. Es el único archivo que importa `@supabase/supabase-js` para crear el cliente.
- **`services/supabase/database.types.ts`** se genera con `supabase gen types`, así TypeScript detecta en compilación si una columna cambia o no existe.
- **`services/inventory.service.ts`** expone `getProducts`, `createProduct`, `deleteProduct` y traduce filas `snake_case` al modelo de dominio `Product` (camelCase). La UI nunca ve el esquema SQL.
- **`config/env.ts`** valida `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` al arrancar. Solo se usa la *anon key*; la seguridad real la da **Row Level Security**.
- **`supabase/migrations/`** versiona el SQL: la tabla `products` tiene RLS activado con políticas `auth.uid() = owner_id` para select/insert/update/delete, de modo que cada usuario solo accede a su inventario aunque la anon key sea pública.

Flujo real: `InventoryPage` → `useProducts()` → `inventoryService.getProducts()` → `supabase.from('products')`.

## 4. Cómo el plano evita deuda técnica

1. **Cambio aislado:** si mañana se migra de Supabase a otra API, solo cambia `services/`; hooks y componentes siguen igual.
2. **Testeable:** los componentes se prueban con props falsas y los hooks con un servicio simulado, sin base de datos.
3. **Escalable:** un dominio nuevo (proveedores) se añade como `types/supplier.ts` + `supplier.service.ts` + `useSuppliers.ts` + `components/suppliers/`, sin tocar lo existente.
4. **Revisable:** la regla "¿este componente importa `services`?" es fácil de comprobar en un code review, y los README guían a los juniors sin depender de un senior.
5. **Bundle controlado:** un único cliente Supabase y barrels por capa evitan duplicar dependencias.

---

# Extensión — EcoTrack · Dashboard de Emisiones en Tiempo Real

El laboratorio "Spec-to-Code" reutiliza este mismo plano. Emisiones entra como **dominio nuevo**
siguiendo la regla de escalabilidad del punto 4.3: se agregan archivos, no se reescriben los de inventario.
La especificación funcional y los criterios de aceptación están en [docs/SPEC.md](docs/SPEC.md).

## 5. Archivos del dominio emisiones

```
src/types/emission.ts                 Emission, EmissionCategory, NewEmission
src/utils/formatters.ts               etiquetas con tilde ("Energía") y formato kg CO₂e
src/services/emissions.service.ts     interfaz EmissionsService + impl. Supabase + impl. mock
src/hooks/useEmissions.ts             carga, inserción, errores y Realtime
src/components/emissions/             EmissionCard, EmissionList, EmissionForm, EmissionsSummary, estados
src/pages/EmissionsTracker.tsx        contenedor: único consumidor de useEmissions
supabase/migrations/<ts>_crear_emisiones.sql
```

Flujo: `EmissionsTracker` → `useEmissions()` → `emissionsService` → `supabase.from('emisiones')`.
Realtime: `useEmissions` se suscribe a INSERTs mediante una función del servicio, que devuelve la
función de limpieza; el hook nunca ve el canal de Supabase.

## 6. Decisiones (ADR resumidos)

| # | Decisión | Motivo |
|---|---|---|
| D1 | `EmissionsTracker` vive en `pages/` y es el único que llama a `useEmissions`. | Es un contenedor, como `InventoryPage`; los componentes quedan presentacionales y testeables. |
| D2 | `EmissionsService` es una interfaz con implementaciones Supabase y mock, elegida con `VITE_USE_MOCK`. | Demuestra el "cambio aislado" (4.1), permite demo sin BD y probar el hook sin red. |
| D3 | La migración revoca todos los privilegios por defecto y concede `select` + `insert (fuente, categoria, co2_kg)`. | Supabase da `ALL` a `anon`/`authenticated` en `public`; sin el revoke el grant por columnas no protege `owner_id`. |
| D4 | RLS `to authenticated` con `(select auth.uid())`; sin políticas de update/delete. | Lección de MentorLink: autorizar con lo que controla el servidor, no el cliente. |
| D5 | Sesión anónima de Supabase (`enable_anonymous_sign_ins = true`). | RLS real por usuario sin fricción de login en la demo. **En producción** requiere CAPTCHA/Turnstile o login real para evitar abuso. |
| D6 | Reglas de capas verificadas por `oxlint` (`no-restricted-imports` con overrides por carpeta). | La regla "¿este componente importa services?" deja de depender de la revisión manual. |
| D7 | Tailwind CSS v4 con `@tailwindcss/vite` y tokens en `@theme`. | Método vigente para Vite; sin `tailwind.config.js`. |
| D8 | Supabase CLI fijado en la línea `v2.stable` (2.122.1). | Es la versión probada en MentorLink; la 3.0.0 salió como mayor reciente y no aporta nada al lab. |
| D9 | Vitest 5 + Testing Library + jsdom. | Comparte la configuración de Vite; prueba hooks y componentes sin navegador real. |

## 7. Deuda técnica conocida (heredada de EcoTech)

- `0001_create_products.sql` usa `auth.uid()` sin envolver en `select` y políticas sin `to authenticated`.
  No se edita (regla: una migración aplicada no se modifica); se corregiría con una migración nueva.
- `database.types.ts` estaba escrito a mano; desde la Iteración 2 se genera con `npm run db:types`.
