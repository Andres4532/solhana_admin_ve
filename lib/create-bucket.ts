/**
 * Crear Bucket Automáticamente desde JavaScript
 * 
 * Archivo: lib/create-bucket.ts
 * 
 * Este archivo crea el bucket "categorias" automáticamente
 * si no existe. Úsalo una sola vez.
 */

import { supabase } from './supabase'

/**
 * Crea el bucket 'categorias' si no existe
 * Ejecuta esto UNA SOLA VEZ al iniciar la aplicación
 */
export async function createCategoriasBucketIfNeeded() {
  try {
    console.log('🔍 Verificando si el bucket "categorias" existe...')

    // Intentar listar contenido del bucket
    const { data, error } = await supabase.storage
      .from('categorias')
      .list('images', {
        limit: 1,
        offset: 0,
      })

    // Si no hay error, el bucket existe
    if (!error) {
      console.log('✅ El bucket "categorias" ya existe')
      return true
    }

    // Si el error es "Bucket not found", créalo
    if (error.message.includes('Bucket not found') || error.message.includes('not exist')) {
      console.log('📦 Creando bucket "categorias"...')

      // Crear el bucket
      const { data: bucketData, error: createError } = await supabase.storage
        .createBucket('categorias', {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        })

      if (createError) {
        console.error('❌ Error al crear bucket:', createError)
        throw createError
      }

      console.log('✅ Bucket "categorias" creado exitosamente', bucketData)
      return true
    }

    // Otro tipo de error
    console.error('❌ Error desconocido:', error)
    throw error

  } catch (error: any) {
    console.error('❌ Error en createCategoriasBucketIfNeeded:', error)
    return false
  }
}

/**
 * Uso en app/layout.tsx o app/page.tsx
 * 
 * Ejemplo:
 * 
 * import { createCategoriasBucketIfNeeded } from '@/lib/create-bucket'
 * 
 * export default function RootLayout({
 *   children,
 * }: {
 *   children: React.ReactNode
 * }) {
 *   useEffect(() => {
 *     createCategoriasBucketIfNeeded()
 *   }, [])
 * 
 *   return (...)
 * }
 */
