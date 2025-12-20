# ACTUALIZACIÓN: Imágenes en Categorías

## ✨ Nuevas Funcionalidades Implementadas

1. **Agregar Imagen a Categoría** - Ahora puedes subir una imagen cuando creas una categoría
2. **Editar Categoría** - El botón de editar ahora funciona correctamente
3. **Eliminar Categoría** - El botón de eliminar ahora funciona correctamente
4. **Vista Previa de Imagen** - Visualiza la imagen antes de guardar

## 📋 Cambios Realizados

### 1. Base de Datos
- Se agregó columna `imagen_url` a la tabla `categorias` 

**NECESARIO EJECUTAR en Supabase SQL Editor:**
```sql
-- Ejecutar este archivo: add_imagen_to_categorias.sql
-- O copiar y pegar en Supabase SQL Editor:

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categorias' AND column_name = 'imagen_url'
  ) THEN
    ALTER TABLE categorias ADD COLUMN imagen_url TEXT;
    RAISE NOTICE 'Columna imagen_url agregada exitosamente a la tabla categorias';
  ELSE
    RAISE NOTICE 'La columna imagen_url ya existe en la tabla categorias';
  END IF;
END $$;
```

### 2. Archivos Modificados

#### `app/productos/categorias/page.tsx`
- ✅ Agregado estado para manejar edición de categorías
- ✅ Agregado estado para vista previa de imagen
- ✅ Implementado `handleEditClick()` - Abre modal para editar
- ✅ Implementado `handleDeleteClick()` - Elimina categoría
- ✅ Implementado `handleImageChange()` - Maneja subida de imagen
- ✅ Agregada sección de carga de imagen en el formulario
- ✅ Actualizado `handleSubmit()` para crear y actualizar categorías con imagen
- ✅ Botones de editar y eliminar ahora funcionales

#### `lib/supabase-queries.ts`
- ✅ Agregada función `actualizarCategoria()` para actualizar datos de categoría

### 3. Características

**Crear Categoría:**
- ✏️ Nombre (requerido)
- ✏️ Descripción
- 🖼️ Imagen (nueva)
- 📌 Icono
- 🔢 Orden
- ☑️ Estado

**Editar Categoría:**
- Haz clic en el botón ✏️ editar
- Modifica cualquier campo
- Opcionalmente cambia la imagen
- Guarda los cambios

**Eliminar Categoría:**
- Haz clic en el botón 🗑️ eliminar
- Confirma la acción
- La categoría se eliminará

## 🚀 Uso

### Pasos para Activar:

1. **Actualizar Base de Datos** (MUY IMPORTANTE)
   - Abre Supabase Dashboard
   - Ve a SQL Editor
   - Copia y ejecuta el contenido de `add_imagen_to_categorias.sql`

2. **Probar en tu aplicación**
   - Ve a Productos → Categorías
   - Haz clic en "Agregar Categoría"
   - Llena el formulario
   - Carga una imagen
   - Guarda

3. **Editar una categoría**
   - En la tabla de categorías, haz clic en el botón ✏️
   - Modifica los datos
   - Guarda los cambios

4. **Eliminar una categoría**
   - Haz clic en el botón 🗑️
   - Confirma la eliminación

## 📁 Archivos Nuevos

- `add_imagen_to_categorias.sql` - Script para agregar columna a la BD

## ✅ Verificación

Después de ejecutar el SQL:
```sql
-- Verifica que la columna se agregó correctamente
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'categorias' 
ORDER BY ordinal_position;
```

Deberías ver la columna `imagen_url` en la lista.

## 🔧 Troubleshooting

**Error: "Column 'imagen_url' does not exist"**
- Ejecuta el script SQL `add_imagen_to_categorias.sql` en Supabase

**La imagen no se sube**
- Asegúrate de que el bucket `categorias` existe en Supabase Storage
- Si no existe, créalo manualmente en el Dashboard de Supabase

**Los botones de editar/eliminar no funcionan**
- Revisa la consola del navegador (F12)
- Verifica que no haya errores de Red/Supabase

## 📝 Notas

- Las imágenes se almacenan en Supabase Storage en el bucket `categorias`
- El tamaño máximo recomendado es 5MB por imagen
- Los formatos soportados: JPG, PNG, GIF, WebP
- Las imágenes se redimensionan automáticamente en la interfaz
