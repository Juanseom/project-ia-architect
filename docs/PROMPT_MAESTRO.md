# Prompt Maestro

Prompt usado con Claude para generar la arquitectura de carpetas del proyecto.

```text
# ROL
Actúa como un Arquitecto de Software IA senior, experto en React 19, TypeScript estricto,
Vite y Supabase, con experiencia liderando equipos junior.

# CONTEXTO
La startup "EcoTech Solutions" va a construir una app de gestión de inventario sostenible
(productos, stock, categoría ecológica y huella de carbono). El equipo es junior y suele
mezclar lógica de negocio y llamadas a la base de datos dentro de los componentes, lo que
causa errores constantes. Estamos aplicando Desarrollo Guiado por Especificaciones (SDD):
primero el plano, después el código.

# TAREA
Diseña la estructura de carpetas inicial (scaffolding) de `src/` para este proyecto.

# RESTRICCIONES TÉCNICAS (obligatorias)
1. Stack: React + TypeScript (modo strict) creado con Vite. Sin frameworks extra.
2. Separación de preocupaciones en capas independientes:
   - UI: `components/` (presentacionales: solo props y JSX) y `pages/` (contenedores).
   - Lógica: `hooks/` (custom hooks con la lógica de negocio) y `context/` (estado global, ej. sesión).
   - Servicios: `services/` como ÚNICA capa que accede a datos externos.
   - Tipos: `types/` con los modelos de dominio compartidos.
3. Una subcarpeta específica para Supabase (`services/supabase/`) con el cliente singleton
   y los tipos generados de la base de datos. Ningún componente ni hook puede importar
   `@supabase/supabase-js` directamente.
4. Flujo de dependencias unidireccional: pages → components / hooks → services → supabase.
   `types/` y `utils/` pueden ser importados por cualquier capa, pero no importan a nadie.
5. Variables de entorno tipadas en `config/` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`);
   nunca la service_role key en el frontend.
6. Una carpeta `supabase/migrations/` en la raíz con el SQL y las políticas RLS.
7. Debe escalar: añadir un dominio nuevo (ej. proveedores) no debe obligar a tocar otros.
8. Cada carpeta principal lleva un `README.md` (qué va y qué está prohibido) y un
   `index.ts` (barrel) que define su API pública.

# FORMATO DE SALIDA
Responde exactamente con estas 4 secciones, en español:
1. **Árbol de directorios** en un bloque de código, estilo comando `tree`, con un comentario
   corto junto a cada carpeta.
2. **Comando de terminal** único (bash/zsh, `mkdir -p` con brace expansion) para crear
   todas las carpetas desde la raíz del proyecto.
3. **Tabla** con columnas: Carpeta | Responsabilidad | Puede importar de | NO puede importar de.
4. **3 reglas de oro** para el equipo junior, en una línea cada una.
No escribas código de componentes; solo la arquitectura.
```

## Comando ejecutado (respuesta de la IA)

```bash
mkdir -p src/{components/{ui,layout,inventory},pages,hooks,context,services/supabase,types,utils,config,styles} supabase/migrations docs
```
