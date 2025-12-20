-- ============================================
-- CREAR BUCKET PARA CATEGORÍAS EN SUPABASE
-- ============================================
-- NOTA: Los buckets en Supabase NO se crean con SQL
-- Se crean a través de la API REST o Dashboard
-- 
-- Sin embargo, puedes ejecutar esto para crear las políticas
-- Una vez que el bucket existe en el Dashboard

-- 1. Primero: CREA EL BUCKET MANUALMENTE en el Dashboard
-- Ve a Storage → + New bucket → nombre: "categorias"

-- 2. Luego: Ejecuta estos comandos para configurar permisos

-- ============================================
-- OPCIÓN A: Permitir lectura pública
-- ============================================
-- Ejecuta esto en SQL Editor después de crear el bucket

INSERT INTO storage.buckets (id, name, public)
VALUES ('categorias', 'categorias', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- OPCIÓN B: Crear políticas de acceso
-- ============================================

-- Permitir lectura pública de todas las imágenes
CREATE POLICY "Permitir lectura pública en categorias"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'categorias');

-- Permitir que usuarios autenticados suban imágenes
CREATE POLICY "Permitir subir imágenes en categorias"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'categorias');

-- Permitir que usuarios autenticados eliminen sus imágenes
CREATE POLICY "Permitir eliminar imágenes en categorias"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'categorias');

-- ============================================
-- VERIFICAR QUE EL BUCKET EXISTE
-- ============================================

SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'categorias';

-- Deberías ver:
-- id        | name       | public
-- -----------+------------+--------
-- categorias | categorias | true
