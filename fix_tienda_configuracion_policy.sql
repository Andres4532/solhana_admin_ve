-- Agregar política RLS para tienda_configuracion
-- Ejecuta este script en el SQL Editor de Supabase

-- Política para permitir acceso completo a tienda_configuracion
CREATE POLICY "Admin full access" ON tienda_configuracion FOR ALL USING (true);

-- Si la política ya existe, elimínala primero con:
-- DROP POLICY IF EXISTS "Admin full access" ON tienda_configuracion;

