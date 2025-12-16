'use client'

import { useState, useEffect, useRef } from 'react'
import { getConfiguracionTienda, actualizarConfiguracionTienda } from '@/lib/supabase-queries'
import { uploadImage, validateImageFile } from '@/lib/supabase-storage'
import { showSuccess, showError } from '@/lib/swal'
import styles from './configuracion.module.css'

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  
  const [nombreTienda, setNombreTienda] = useState('SOLHANA')
  const [logoUrl, setLogoUrl] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadConfiguracion() {
      try {
        setLoading(true)
        const config = await getConfiguracionTienda()
        setNombreTienda(config.nombre_tienda)
        setLogoUrl(config.logo_url)
      } catch (error) {
        console.error('Error cargando configuración:', error)
        await showError('Error', 'No se pudo cargar la configuración')
      } finally {
        setLoading(false)
      }
    }
    loadConfiguracion()
  }, [])

  const handleLogoClick = () => {
    fileInputRef.current?.click()
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.valid) {
      await showError('Error de validación', validation.error || 'Archivo inválido')
      return
    }

    setUploadingLogo(true)
    try {
      const url = await uploadImage(file, 'productos', 'logo')
      setLogoUrl(url)
      await showSuccess('Logo subido', 'El logo se ha subido exitosamente')
    } catch (error: any) {
      console.error('Error subiendo logo:', error)
      await showError('Error al subir', error.message || 'No se pudo subir el logo')
    } finally {
      setUploadingLogo(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveLogo = () => {
    setLogoUrl('')
  }

  const handleSave = async () => {
    if (!nombreTienda.trim()) {
      await showError('Error', 'El nombre de la tienda es requerido')
      return
    }

    setSaving(true)
    try {
      await actualizarConfiguracionTienda({
        nombre_tienda: nombreTienda.trim(),
        logo_url: logoUrl || ''
      })
      await showSuccess('Configuración guardada', 'Los cambios se han guardado exitosamente')
      // Recargar la página para actualizar el sidebar
      window.location.reload()
    } catch (error: any) {
      console.error('Error guardando configuración:', error)
      await showError('Error', error.message || 'No se pudo guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>Cargando configuración...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Configuración de la Tienda</h1>
        <p className={styles.description}>
          Personaliza el logo y el nombre de tu tienda que aparecerá en el panel de administración.
        </p>
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Información de la Tienda</h2>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Nombre de la Tienda <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              value={nombreTienda}
              onChange={(e) => setNombreTienda(e.target.value)}
              placeholder="Ej: SOLHANA"
              maxLength={50}
            />
            <small className={styles.helpText}>
              Este nombre aparecerá en el sidebar y en otras partes del panel de administración.
            </small>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Logo de la Tienda
            </label>
            <div className={styles.logoSection}>
              {logoUrl ? (
                <div className={styles.logoPreview}>
                  <img src={logoUrl} alt="Logo de la tienda" className={styles.logoImage} />
                  <div className={styles.logoActions}>
                    <button
                      type="button"
                      className={styles.changeButton}
                      onClick={handleLogoClick}
                      disabled={uploadingLogo}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                      Cambiar
                    </button>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={handleRemoveLogo}
                      disabled={uploadingLogo}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                      Eliminar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`${styles.logoPlaceholder} ${uploadingLogo ? styles.uploading : ''}`}
                  onClick={handleLogoClick}
                >
                  {uploadingLogo ? (
                    <span style={{ fontSize: '14px' }}>Subiendo...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>add_photo_alternate</span>
                      <span>Haz clic para subir un logo</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <small className={styles.helpText}>
              El logo aparecerá en el sidebar. Formatos soportados: JPG, PNG, WEBP, GIF. Tamaño máximo: 5MB.
            </small>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={handleLogoUpload}
              style={{ display: 'none' }}
            />
          </div>

          <div className={styles.actions}>
            <button
              className={styles.saveButton}
              onClick={handleSave}
              disabled={saving || uploadingLogo}
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Vista Previa</h2>
          <div className={styles.preview}>
            <div className={styles.previewSidebar}>
              <div className={styles.previewLogo}>
                <div
                  className={styles.previewLogoIcon}
                  style={{
                    backgroundImage: logoUrl ? `url(${logoUrl})` : undefined,
                    backgroundColor: logoUrl ? 'transparent' : 'var(--primary)'
                  }}
                ></div>
                <div>
                  <h3 className={styles.previewLogoTitle}>{nombreTienda || 'Nombre de la tienda'}</h3>
                  <p className={styles.previewLogoSubtitle}>Panel de Administración</p>
                </div>
              </div>
            </div>
          </div>
          <p className={styles.previewNote}>
            Esta es una vista previa de cómo se verá el logo y nombre en el sidebar.
          </p>
        </div>
      </div>
    </div>
  )
}
