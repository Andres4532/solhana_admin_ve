# 🚀 Guía Completa: Desplegar en Vercel

Esta guía te ayudará a desplegar tu proyecto Next.js en Vercel para compartirlo con otros.

---

## 📋 Requisitos Previos

1. ✅ Tener una cuenta en [Vercel](https://vercel.com) (gratis)
2. ✅ Tener tu proyecto funcionando localmente
3. ✅ Tener las credenciales de Supabase listas

---

## 🎯 Opción 1: Despliegue desde la Web (Recomendado)

### Paso 1: Preparar el Proyecto

1. **Asegúrate de que tu código esté en Git:**
   ```bash
   git init
   git add .
   git commit -m "Preparar para deploy en Vercel"
   ```

2. **Sube tu código a GitHub:**
   - Crea un repositorio en [GitHub](https://github.com/new)
   - Sigue las instrucciones para subir tu código:
     ```bash
     git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
     git branch -M main
     git push -u origin main
     ```

### Paso 2: Conectar con Vercel

1. **Ve a [vercel.com/new](https://vercel.com/new)**
2. **Inicia sesión** con tu cuenta (puedes usar GitHub)
3. **Importa tu repositorio:**
   - Haz clic en "Import Git Repository"
   - Selecciona tu repositorio de GitHub
   - Haz clic en "Import"

### Paso 3: Configurar el Proyecto

1. **Configuración del proyecto:**
   - **Framework Preset:** Next.js (debería detectarse automáticamente)
   - **Root Directory:** `./` (dejar por defecto)
   - **Build Command:** `npm run build` (automático)
   - **Output Directory:** `.next` (automático)
   - **Install Command:** `npm install` (automático)

2. **Configurar Variables de Entorno:**
   - Haz clic en "Environment Variables"
   - Agrega las siguientes variables:

   | Variable | Valor |
   |----------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://ztbiqgfypxgptvconxon.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu anon key de Supabase |

   **Cómo obtener la anon key:**
   - Ve a [Supabase Dashboard](https://supabase.com/dashboard)
   - Selecciona tu proyecto
   - Ve a **Settings** > **API**
   - Copia la key **"anon public"** (NO uses "service_role")

3. **Haz clic en "Deploy"**

### Paso 4: Esperar el Despliegue

- Vercel construirá tu proyecto automáticamente
- Esto puede tomar 2-5 minutos
- Verás el progreso en tiempo real

### Paso 5: ¡Listo! 🎉

- Tu proyecto estará disponible en: `https://tu-proyecto.vercel.app`
- Cada vez que hagas `git push`, Vercel desplegará automáticamente

---

## 🛠️ Opción 2: Despliegue desde CLI (Terminal)

### Paso 1: Instalar Vercel CLI

```bash
npm install -g vercel
```

### Paso 2: Iniciar Sesión

```bash
vercel login
```

Esto abrirá tu navegador para autenticarte.

### Paso 3: Desplegar

```bash
vercel
```

Sigue las instrucciones:
- **Set up and deploy?** → Presiona Enter (Yes)
- **Which scope?** → Selecciona tu cuenta
- **Link to existing project?** → No (primera vez)
- **What's your project's name?** → Presiona Enter (usa el nombre por defecto)
- **In which directory is your code located?** → Presiona Enter (./)

### Paso 4: Configurar Variables de Entorno

Después del primer deploy:

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** > **Environment Variables**
4. Agrega:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://ztbiqgfypxgptvconxon.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Tu anon key

### Paso 5: Desplegar a Producción

```bash
vercel --prod
```

O desde el dashboard de Vercel, haz clic en "Redeploy"

---

## 🔧 Configuración Adicional

### Dominio Personalizado (Opcional)

1. Ve a **Settings** > **Domains**
2. Agrega tu dominio personalizado
3. Sigue las instrucciones para configurar DNS

### Variables de Entorno por Ambiente

Puedes configurar variables diferentes para:
- **Production:** Producción (tu-proyecto.vercel.app)
- **Preview:** Previews de pull requests
- **Development:** Desarrollo local

---

## 📊 Monitoreo y Logs

### Ver Logs en Tiempo Real

```bash
vercel logs
```

### Ver Logs en el Dashboard

1. Ve a tu proyecto en Vercel
2. Haz clic en "Deployments"
3. Selecciona un deployment
4. Ve a la pestaña "Logs"

---

## 🔄 Actualizaciones Automáticas

Cada vez que hagas `git push` a tu repositorio:
- Vercel detectará los cambios automáticamente
- Creará un nuevo deployment
- Si todo está bien, lo desplegará automáticamente

---

## 🐛 Solución de Problemas

### Error: "Build Failed"

1. **Revisa los logs:**
   - Ve al deployment fallido
   - Revisa la pestaña "Logs"

2. **Problemas comunes:**
   - Variables de entorno faltantes
   - Errores de TypeScript
   - Dependencias faltantes

3. **Prueba localmente primero:**
   ```bash
   npm run build
   ```

### Error: "Missing Environment Variables"

1. Ve a **Settings** > **Environment Variables**
2. Verifica que todas las variables estén configuradas
3. Haz clic en "Redeploy"

### Error: "Module not found"

1. Verifica que todas las dependencias estén en `package.json`
2. Ejecuta `npm install` localmente
3. Verifica que no haya errores

---

## 🔗 Compartir tu Proyecto

Una vez desplegado, puedes compartir:

1. **URL de Producción:**
   ```
   https://tu-proyecto.vercel.app
   ```

2. **URL de Preview (para cada PR):**
   ```
   https://tu-proyecto-git-branch.vercel.app
   ```

3. **Repositorio GitHub:**
   ```
   https://github.com/tu-usuario/tu-repo
   ```

---

## ✅ Checklist Final

Antes de compartir, verifica:

- [ ] El proyecto se construye sin errores (`npm run build`)
- [ ] Las variables de entorno están configuradas en Vercel
- [ ] El proyecto funciona correctamente en la URL de Vercel
- [ ] No hay errores en la consola del navegador
- [ ] Las imágenes y recursos se cargan correctamente
- [ ] La conexión con Supabase funciona

---

## 📚 Recursos Adicionales

- [Documentación de Vercel](https://vercel.com/docs)
- [Guía de Next.js en Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Variables de Entorno en Vercel](https://vercel.com/docs/environment-variables)

---

## 🆘 ¿Necesitas Ayuda?

Si tienes problemas:
1. Revisa los logs en Vercel
2. Prueba construir localmente: `npm run build`
3. Verifica que todas las variables de entorno estén configuradas
4. Revisa la documentación de Vercel

¡Buena suerte con tu despliegue! 🚀

