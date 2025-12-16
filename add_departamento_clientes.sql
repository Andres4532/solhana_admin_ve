-- Script para agregar columna departamento a la tabla clientes
-- Ejecuta este script en el SQL Editor de Supabase

-- Paso 1: Verificar si existe la columna ciudad y eliminarla si existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clientes' 
        AND column_name = 'ciudad'
    ) THEN
        ALTER TABLE clientes DROP COLUMN ciudad;
        RAISE NOTICE 'Columna ciudad eliminada';
    END IF;
END $$;

-- Paso 2: Agregar columna departamento si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clientes' 
        AND column_name = 'departamento'
    ) THEN
        ALTER TABLE clientes ADD COLUMN departamento VARCHAR(100);
        RAISE NOTICE 'Columna departamento agregada';
    ELSE
        RAISE NOTICE 'Columna departamento ya existe';
    END IF;
END $$;

-- Paso 3: Agregar comentario a la columna
COMMENT ON COLUMN clientes.departamento IS 'Departamento de Bolivia donde reside el cliente (ej: La Paz, Santa Cruz, Cochabamba)';

