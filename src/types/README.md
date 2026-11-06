# types/

Interfaces y tipos **de dominio** compartidos (Product, Emission, AsyncState...).

- Solo tipos: sin lógica ni imports de React o Supabase.
- Los tipos *generados* de la base de datos viven en `services/supabase/database.types.ts`;
  los servicios los traducen a estos tipos de dominio.
