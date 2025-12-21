-- ============================================
-- SINCRONIZAR STOCK DE PRODUCTOS CON VARIANTES
-- ============================================
-- Este archivo crea un TRIGGER que actualiza automáticamente el stock
-- del producto principal cuando cambian las variantes

-- 1. Crear función que recalcula el stock del producto
CREATE OR REPLACE FUNCTION actualizar_stock_producto()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar el stock del producto con la suma de las variantes
  UPDATE productos
  SET stock = COALESCE(
    (SELECT SUM(stock) FROM producto_variantes 
     WHERE producto_id = NEW.producto_id AND activo = TRUE),
    0
  ),
  updated_at = NOW()
  WHERE id = NEW.producto_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear función para cuando se elimina una variante
CREATE OR REPLACE FUNCTION actualizar_stock_producto_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar el stock del producto con la suma de las variantes restantes
  UPDATE productos
  SET stock = COALESCE(
    (SELECT SUM(stock) FROM producto_variantes 
     WHERE producto_id = OLD.producto_id AND activo = TRUE),
    0
  ),
  updated_at = NOW()
  WHERE id = OLD.producto_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear TRIGGERs en la tabla producto_variantes

-- Trigger para INSERT (cuando se crea una variante)
DROP TRIGGER IF EXISTS trigger_sync_stock_insert ON producto_variantes;
CREATE TRIGGER trigger_sync_stock_insert
AFTER INSERT ON producto_variantes
FOR EACH ROW
EXECUTE FUNCTION actualizar_stock_producto();

-- Trigger para UPDATE (cuando se actualiza el stock de una variante)
DROP TRIGGER IF EXISTS trigger_sync_stock_update ON producto_variantes;
CREATE TRIGGER trigger_sync_stock_update
AFTER UPDATE ON producto_variantes
FOR EACH ROW
EXECUTE FUNCTION actualizar_stock_producto();

-- Trigger para DELETE (cuando se elimina una variante)
DROP TRIGGER IF EXISTS trigger_sync_stock_delete ON producto_variantes;
CREATE TRIGGER trigger_sync_stock_delete
AFTER DELETE ON producto_variantes
FOR EACH ROW
EXECUTE FUNCTION actualizar_stock_producto_delete();

-- ============================================
-- ACTUALIZAR PRODUCTOS EXISTENTES CON VARIANTES
-- ============================================
-- Ejecutar esto para actualizar los stocks de productos que ya tienen variantes

UPDATE productos
SET stock = COALESCE(
  (SELECT SUM(pv.stock) FROM producto_variantes pv 
   WHERE pv.producto_id = productos.id AND pv.activo = TRUE),
  0
)
WHERE tiene_variantes = TRUE
AND id IN (SELECT DISTINCT producto_id FROM producto_variantes);

-- Verificar que se actualizó correctamente
SELECT 
  p.id,
  p.nombre,
  p.stock as stock_total,
  COUNT(pv.id) as cantidad_variantes,
  SUM(pv.stock) as suma_stocks_variantes,
  p.tiene_variantes
FROM productos p
LEFT JOIN producto_variantes pv ON p.id = pv.producto_id AND pv.activo = TRUE
WHERE p.tiene_variantes = TRUE
GROUP BY p.id, p.nombre, p.stock, p.tiene_variantes
ORDER BY p.nombre;
