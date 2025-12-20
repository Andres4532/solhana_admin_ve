-- Agregar columna imagen_url a la tabla categorias (si no existe)
-- Ejecutar en Supabase SQL Editor

DO $$ 
BEGIN
  -- Verificar si la columna existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categorias' AND column_name = 'imagen_url'
  ) THEN
    -- Agregar la columna
    ALTER TABLE categorias ADD COLUMN imagen_url TEXT;
    RAISE NOTICE 'Columna imagen_url agregada exitosamente a la tabla categorias';
  ELSE
    RAISE NOTICE 'La columna imagen_url ya existe en la tabla categorias';
  END IF;
END $$;
