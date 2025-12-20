# 🚀 GUÍA RÁPIDA: ACTIVAR IMÁGENES EN CATEGORÍAS

## ⚡ En 5 minutos

### Paso 1: Abrir Supabase Dashboard
1. Ve a https://supabase.com
2. Inicia sesión con tu cuenta
3. Abre tu proyecto "solhanaproyecto"

### Paso 2: Ir a SQL Editor
1. En el menú lateral izquierdo, haz clic en **"SQL Editor"**
2. Haz clic en **"New Query"**

### Paso 3: Copiar el SQL
Copia y pega esto en el editor:

```sql
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

### Paso 4: Ejecutar
Haz clic en el botón **"▶ RUN"** (esquina superior derecha)

**Deberías ver:** ✅ "Columna imagen_url agregada exitosamente a la tabla categorias"

---

## ✅ Crear Bucket de Storage (Opcional pero recomendado)

Si quieres que las imágenes se vean en la tienda:

1. Ve a **"Storage"** en el menú lateral
2. Haz clic en **"+ New bucket"**
3. Nombre: `categorias`
4. Desmarca "Private" para que sea público
5. Haz clic en **"Create bucket"**

---

## 🧪 Verificar que Funcionó

Ejecuta esta consulta en SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'categorias' 
ORDER BY ordinal_position;
```

Deberías ver algo como esto:

| column_name | data_type |
|------------|-----------|
| id | uuid |
| nombre | character varying |
| descripcion | text |
| icono | character varying |
| orden | integer |
| estado | character varying |
| created_at | timestamp with time zone |
| updated_at | timestamp with time zone |
| **imagen_url** | **text** |

✅ Si ves **imagen_url**, ¡está listo!

---

## 🎨 Ahora Puedes:

1. ➕ **Crear Categoría con Imagen**
   - Ve a http://localhost:3000/productos/categorias
   - Haz clic en "Agregar Categoría"
   - Llena el formulario
   - Sube una imagen
   - ¡Guarda!

2. ✏️ **Editar Categoría**
   - Haz clic en el botón ✏️
   - Modifica lo que quieras
   - Guarda

3. 🗑️ **Eliminar Categoría**
   - Haz clic en el botón 🗑️
   - Confirma
   - ¡Listo!

---

## 🆘 Si hay Errores

**"Column 'imagen_url' does not exist"**
→ El SQL no se ejecutó correctamente. Intenta de nuevo.

**"Error al subir imagen"**
→ El bucket `categorias` no existe en Storage. Créalo.

**"CORS error"**
→ Las políticas de Supabase pueden estar restrictivas. Verifica Storage → Policies

---

**¡Listo! Ya puedes agregar imágenes a tus categorías 🎉**
