# 📦 STOCK VINCULADO A VARIANTES - IMPLEMENTACIÓN COMPLETA

## ✅ Cambios Realizados

### 1. Base de Datos - Archivo: `sync_stock_variantes.sql`
- ✅ Creado TRIGGER automático que sincroniza el stock cuando:
  - Se inserta una variante
  - Se actualiza el stock de una variante
  - Se elimina una variante
- ✅ El stock del producto = suma de todos los stocks de variantes activas
- ✅ Se actualiza automáticamente sin intervención manual

### 2. Backend - `lib/supabase-queries.ts`
**Función `crearProducto`:**
- ✅ Calcula stock total = suma de todos los stocks de variantes
- ✅ Inserta el producto con el stock calculado

**Función `actualizarVariantesProducto`:**
- ✅ Después de actualizar variantes, recalcula el stock total
- ✅ Actualiza el producto con el nuevo stock

### 3. Frontend - `app/productos/nuevo/page.tsx`
- ✅ Campo Stock deshabilitado cuando hay variantes
- ✅ Muestra el stock total calculado en tiempo real
- ✅ Muestra desglose: "Stock total: 150 (suma de variantes: Negro-S=50, Negro-M=50, Rojo-S=50)"

---

## 🚀 PASOS PARA ACTIVAR

### Paso 1: Ejecutar el SQL en Supabase
1. Abre Supabase Dashboard → SQL Editor
2. Copia todo el contenido de: `sync_stock_variantes.sql`
3. Pégalo en el editor y haz clic en **RUN**

**Espera ver:**
```
✅ Functions created successfully
✅ Triggers created successfully
✅ Existing products updated
```

### Paso 2: Verificar que funciona
Ejecuta esto en SQL Editor para verificar que los TRIGGERs se crearon:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE 'trigger_sync_stock%'
ORDER BY trigger_name;
```

Deberías ver 3 triggers:
- `trigger_sync_stock_insert`
- `trigger_sync_stock_update`
- `trigger_sync_stock_delete`

### Paso 3: Probar en la App
1. `npm run dev`
2. Ve a Productos → Nuevo Producto
3. Completa el formulario básico
4. **Activa "Este producto tiene variantes"**
5. Agrega atributos (Ej: Color, Talla)
6. Agrega valores (Ej: Negro, Blanco; S, M, L)
7. Se generarán variantes automáticamente con sus SKUs
8. **Asigna stock a cada variante** (Ej: Negro-S=50, Negro-M=40, Blanco-S=30)
9. Observa que el campo "Cantidad disponible" se deshabilita
10. Verás: **"Stock total: 120 (suma de variantes: Negro-S=50, Negro-M=40, Blanco-S=30)"**
11. Haz clic en "Publicar producto"
12. ✅ Se crea el producto con stock = 120

---

## 📊 CÓMO FUNCIONA

### Creación de Producto CON Variantes:
```
Usuario llena:
- Nombre, Precio, etc.
- Checkbox "Tiene variantes" = ON
- Crea variantes:
  * Negro - S - Stock: 50
  * Negro - M - Stock: 40
  * Blanco - S - Stock: 30
  ↓
- Click en "Publicar"
  ↓
Frontend calcula: 50 + 40 + 30 = 120
  ↓
Se inserta producto con stock = 120
  ↓
Se insertan 3 variantes
  ↓
TRIGGER se activa automáticamente
  ↓
Recalcula y confirma stock = 120 ✅
```

### Actualización de Variantes (después de creación):
```
Usuario edita variantes:
- Cambia Negro-S de 50 a 60
- Cambia Negro-M de 40 a 35
  ↓
Frontend recalcula: 60 + 35 + 30 = 125
  ↓
Se actualiza el producto con stock = 125
  ↓
TRIGGER se activa
  ↓
Confirma stock = 125 ✅
```

---

## 🎯 COMPORTAMIENTO

### ✅ LO QUE ESTÁ HABILITADO:
- Crear producto CON variantes → stock = suma
- Editar producto CON variantes → stock = suma
- Crear producto SIN variantes → stock manual (normal)
- Editar variantes → stock se recalcula automáticamente

### ❌ RESTRICCIONES:
- Si el producto tiene variantes, el campo "Cantidad disponible" está DESHABILITADO
- No puedes editar manualmente el stock si hay variantes (está bloqueado)
- El stock siempre es la suma de variantes

---

## 🔍 VERIFICACIÓN EN BD

Para verificar que funciona correctamente:

```sql
-- Ver productos con sus stocks
SELECT 
  p.nombre,
  p.stock as stock_en_bd,
  COUNT(pv.id) as cantidad_variantes,
  SUM(pv.stock) as suma_stocks_variantes,
  CASE WHEN p.stock = SUM(pv.stock) THEN '✅ CORRECTO' ELSE '❌ DESINCRONIZADO' END as estado
FROM productos p
LEFT JOIN producto_variantes pv ON p.id = pv.producto_id AND pv.activo = TRUE
WHERE p.tiene_variantes = TRUE
GROUP BY p.id, p.nombre, p.stock
ORDER BY p.nombre;
```

---

## 📋 TROUBLESHOOTING

### Problema: "El stock total no se actualiza"
**Solución:**
1. Verifica que el TRIGGER se creó: Ejecuta la query de verificación de triggers
2. Si falta, vuelve a ejecutar `sync_stock_variantes.sql`
3. Revisa la consola del navegador para errores

### Problema: "El campo stock sigue habilitado con variantes"
**Solución:**
1. Recarga la página (Ctrl+F5)
2. Verifica que `app/productos/nuevo/page.tsx` está actualizado

### Problema: "Stock incorrecto después de crear variantes"
**Solución:**
1. Ejecuta la verificación en BD (query anterior)
2. Si están desincronizados, ejecuta en SQL Editor:
```sql
UPDATE productos p
SET stock = COALESCE(
  (SELECT SUM(pv.stock) FROM producto_variantes pv 
   WHERE pv.producto_id = p.id AND pv.activo = TRUE),
  0
)
WHERE tiene_variantes = TRUE;
```

---

## 📝 NOTAS IMPORTANTES

- **TRIGGER automático**: Cada vez que cambies variantes, el stock se actualiza solo
- **Cálculo de suma**: Solo cuenta variantes ACTIVAS (si desactivas una variante, no se suma)
- **Sin transacciones**: El TRIGGER usa `ON DELETE CASCADE` para limpiar automáticamente
- **Performance**: El TRIGGER es muy ligero, no afecta rendimiento

---

## ✨ EJEMPLO REAL

**Producto: Camiseta Roja**

Variantes:
| Color | Talla | Stock |
|-------|-------|-------|
| Rojo  | S     | 25    |
| Rojo  | M     | 30    |
| Rojo  | L     | 20    |
| Azul  | S     | 15    |
| Azul  | M     | 35    |

**Stock Total en Base de Datos:** 25 + 30 + 20 + 15 + 35 = **125** ✅

Si cambias Rojo-S de 25 a 40:
**Nuevo Stock Total:** 40 + 30 + 20 + 15 + 35 = **140** ✅ (Automático)

Si desactivas variante Azul-M (no se suma):
**Stock Total:** 25 + 30 + 20 + 15 = **90** ✅ (Automático)

---

**¡Implementación completada! 🎉**
