# context/

Estado **global** compartido por muchas pantallas (sesión de Supabase Auth, tema...).

- Cada contexto = `xxx-context.ts` (createContext + tipo) + `XxxProvider.tsx`.
- Los providers delegan en `services/`; nunca llaman a `supabase` directamente.
- Se consumen a través de un hook (`hooks/useAuth.ts`), no con `useContext` suelto.
- No guardes aquí datos de una sola pantalla: eso va en un hook.
- `AuthProvider` garantiza una sesión (anónima en la demo) antes de que las pantallas pidan datos; su `value` está memoizado.
