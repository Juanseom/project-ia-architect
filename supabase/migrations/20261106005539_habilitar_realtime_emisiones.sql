-- EcoTrack · Publica los cambios de public.emisiones por Supabase Realtime (postgres_changes).
-- Realtime respeta RLS: cada suscriptor solo recibe filas que su política de SELECT le permite ver.
alter publication supabase_realtime add table public.emisiones;
