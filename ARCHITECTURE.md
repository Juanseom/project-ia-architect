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
