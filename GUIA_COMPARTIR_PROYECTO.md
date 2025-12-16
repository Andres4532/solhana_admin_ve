# 🚀 Guía para Compartir el Proyecto

Esta guía te muestra las mejores formas de compartir tu proyecto para que otras personas puedan verlo.

## 📋 Opciones Disponibles

### 1. **Vercel (Recomendado) - Deploy Gratuito y Fácil** ⭐

Vercel es la plataforma oficial de Next.js y la forma más fácil de compartir tu proyecto.

#### Pasos:

1. **Crear cuenta en Vercel**
   - Ve a [vercel.com](https://vercel.com)
   - Regístrate con GitHub, GitLab o email

2. **Instalar Vercel CLI** (opcional, pero recomendado)
   ```bash
   npm install -g vercel
   ```

3. **Deploy desde la terminal**
   ```bash
   # En la carpeta del proyecto
   vercel
   ```
   
   O desde el dashboard web:
   - Ve a [vercel.com/new](https://vercel.com/new)
   - Conecta tu repositorio de GitHub/GitLab
   - O arrastra la carpeta del proyecto

4. **Configurar variables de entorno**
   - En el dashboard de Vercel, ve a Settings > Environment Variables
   - Agrega tus variables de Supabase:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY` (si la usas)

5. **¡Listo!** Tu proyecto estará disponible en una URL como:
   `https://tu-proyecto.vercel.app`

**Ventajas:**
- ✅ Gratis para proyectos personales
- ✅ Deploy automático desde Git
- ✅ HTTPS incluido
- ✅ Optimizado para Next.js
- ✅ URL pública permanente

---

### 2. **GitHub + Vercel (Recomendado para Colaboración)**

Ideal si quieres compartir el código y que se actualice automáticamente.

#### Pasos:

1. **Crear repositorio en GitHub**
   ```bash
   # Si no tienes Git inicializado
   git init
   git add .
   git commit -m "Initial commit"
   
   # Crear repositorio en GitHub y luego:
   git remote add origin https://github.com/tu-usuario/tu-repo.git
   git branch -M main
   git push -u origin main
   ```

2. **Conectar con Vercel**
   - Ve a [vercel.com/new](https://vercel.com/new)
   - Selecciona "Import Git Repository"
   - Conecta tu cuenta de GitHub
   - Selecciona tu repositorio

3. **Configurar variables de entorno** (igual que opción 1)

4. **Deploy automático**
   - Cada vez que hagas `git push`, Vercel desplegará automáticamente
   - Puedes compartir el repositorio y la URL del deploy

**Ventajas:**
- ✅ Control de versiones
- ✅ Colaboración fácil
- ✅ Deploy automático
- ✅ Historial de cambios

---

### 3. **Netlify (Alternativa a Vercel)**

Similar a Vercel, también muy fácil de usar.

#### Pasos:

1. **Crear cuenta en Netlify**
   - Ve a [netlify.com](https://netlify.com)
   - Regístrate gratis

2. **Deploy**
   - Arrastra la carpeta `out` (después de `npm run build`)
   - O conecta con GitHub para deploy automático

3. **Configurar variables de entorno**
   - Site settings > Environment variables

**Ventajas:**
- ✅ Gratis
- ✅ Fácil de usar
- ✅ HTTPS incluido

---

### 4. **Túnel Local (Para Mostrar Temporalmente)**

Si solo quieres mostrar el proyecto rápidamente sin deploy permanente.

#### Opción A: ngrok

1. **Instalar ngrok**
   ```bash
   npm install -g ngrok
   # O descargar desde ngrok.com
   ```

2. **Iniciar tu proyecto**
   ```bash
   npm run dev
   ```

3. **Crear túnel**
   ```bash
   ngrok http 3000
   ```

4. **Compartir la URL** que ngrok te da (ej: `https://abc123.ngrok.io`)

**Ventajas:**
- ✅ Rápido y temporal
- ✅ No requiere deploy
- ✅ Útil para demos

**Desventajas:**
- ❌ URL cambia cada vez (en plan gratuito)
- ❌ Requiere que tu computadora esté encendida

#### Opción B: localtunnel

```bash
npm install -g localtunnel
npm run dev
# En otra terminal:
lt --port 3000
```

---

### 5. **Railway / Render (Alternativas)**

Plataformas similares a Vercel:

- **Railway**: [railway.app](https://railway.app)
- **Render**: [render.com](https://render.com)

Ambas ofrecen planes gratuitos y son fáciles de usar.

---

## 🔐 Variables de Entorno Necesarias

Asegúrate de configurar estas variables en tu plataforma de deploy:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key (opcional)
```

**⚠️ IMPORTANTE:** Nunca subas tu archivo `.env` a GitHub. Ya está en `.gitignore`.

---

## 📝 Checklist Antes de Compartir

- [ ] Verificar que `.env` esté en `.gitignore`
- [ ] Probar `npm run build` localmente
- [ ] Verificar que todas las variables de entorno estén configuradas
- [ ] Probar la aplicación en el deploy
- [ ] Verificar que las conexiones a Supabase funcionen

---

## 🎯 Recomendación

**Para compartir rápidamente:** Usa **Vercel** (Opción 1)
- Es la más rápida
- Optimizada para Next.js
- Gratis y fácil

**Para colaboración:** Usa **GitHub + Vercel** (Opción 2)
- Permite que otros vean el código
- Deploy automático
- Mejor para trabajo en equipo

---

## 🆘 Problemas Comunes

### Error: "Environment variables not found"
**Solución:** Asegúrate de configurar las variables en la plataforma de deploy.

### Error: "Build failed"
**Solución:** 
1. Prueba `npm run build` localmente primero
2. Revisa los logs de error en la plataforma
3. Verifica que todas las dependencias estén en `package.json`

### La aplicación no se conecta a Supabase
**Solución:** 
1. Verifica las variables de entorno
2. Asegúrate de que las URLs de Supabase sean públicas
3. Revisa las políticas RLS en Supabase

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas con el deploy, revisa:
- Los logs en la plataforma de deploy
- La consola del navegador (F12)
- La documentación de la plataforma elegida

---

**¡Listo!** Ahora puedes compartir tu proyecto fácilmente. 🎉

