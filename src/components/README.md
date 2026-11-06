# components/

Componentes **presentacionales** de React: reciben `props`, renderizan JSX y emiten eventos.

- `ui/`: átomos genéricos y reutilizables (Button, Input, Modal). No conocen el dominio.
- `layout/`: estructura de la página (AppLayout, Header, Sidebar).
- `inventory/`: componentes del dominio inventario (ProductList, ProductForm).
- `emissions/`: componentes del dominio emisiones de EcoTrack (EmissionCard, EmissionForm...).

Reglas: prohibido importar `hooks/`, `services/`, `context/` o `supabase` (lo verifica `npm run lint`). Si un componente necesita datos,
los recibe de una página que usa un hook. Así se pueden probar y reutilizar aisladamente.
