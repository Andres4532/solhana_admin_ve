'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getCategorias } from '@/lib/supabase-queries'
import { supabase } from '@/lib/supabase'
import { showSuccess, showError, showConfirm } from '@/lib/swal'
import { uploadImage, deleteImage } from '@/lib/supabase-storage'
import styles from './categorias.module.css'

interface Category {
  id: string
  nombre: string
  descripcion: string | null
  icono: string | null
  orden: number
  estado: 'Activo' | 'Inactivo'
  imagen_url: string | null
}

const getIconName = (icono: string | null) => {
  switch (icono) {
    case 'coffee':
      return 'coffee'
    case 'cake':
      return 'cake'
    case 'snowflake':
      return 'ac_unit'
    default:
      return 'coffee'
  }
}

const getStatusClass = (estado: string) => {
  switch (estado) {
    case 'Activo':
      return styles.statusActivo
    case 'Inactivo':
      return styles.statusInactivo
    default:
      return styles.statusInactivo
  }
}

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    icono: '',
    orden: 1,
    activa: false,
    imagen_url: null as string | null,
    imagen_file: null as File | null
  })

  // Cargar categorías de Supabase
  useEffect(() => {
    async function loadCategorias() {
      try {
        const data = await getCategorias()
        setCategories(data || [])
      } catch (error: any) {
        console.error('Error cargando categorías:', error)
        console.error('Detalles del error:', {
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint
        })
        // Si es un error de RLS o tabla no existe, mostrar mensaje útil
        if (error?.code === 'PGRST116' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
          console.error('⚠️ La tabla "categorias" no existe en Supabase. Ejecuta el archivo supabase_schema.sql primero.')
        } else if (error?.code === '42501' || error?.message?.includes('permission denied')) {
          console.error('⚠️ Error de permisos. Verifica las políticas RLS en Supabase.')
        }
      } finally {
        setLoading(false)
      }
    }
    loadCategorias()
  }, [])

  const iconOptions = [
    { value: 'coffee', label: 'Café' },
    { value: 'cake', label: 'Pastel' },
    { value: 'snowflake', label: 'Copo de Nieve' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let imagenUrl = formData.imagen_url

      // Subir imagen si se seleccionó una nueva
      if (formData.imagen_file) {
        setUploadingImage(true)
        try {
          imagenUrl = await uploadImage(formData.imagen_file, 'categorias', 'images')
        } catch (error: any) {
          throw new Error(`Error al subir imagen: ${error.message}`)
        } finally {
          setUploadingImage(false)
        }
      }

      if (editingId) {
        // Actualizar categoría existente
        const { data, error } = await supabase
          .from('categorias')
          .update({
            nombre: formData.nombre,
            descripcion: formData.descripcion || null,
            icono: formData.icono || null,
            orden: formData.orden,
            estado: formData.activa ? 'Activo' : 'Inactivo',
            imagen_url: imagenUrl
          })
          .eq('id', editingId)
          .select()
          .single()

        if (error) throw error

        await showSuccess('Categoría actualizada', 'La categoría ha sido actualizada exitosamente')
      } else {
        // Crear nueva categoría
        const { data, error } = await supabase
          .from('categorias')
          .insert({
            nombre: formData.nombre,
            descripcion: formData.descripcion || null,
            icono: formData.icono || null,
            orden: formData.orden,
            estado: formData.activa ? 'Activo' : 'Inactivo',
            imagen_url: imagenUrl
          })
          .select()
          .single()

        if (error) throw error

        await showSuccess('Categoría creada', 'La categoría ha sido creada exitosamente')
      }

      // Recargar categorías
      const nuevasCategorias = await getCategorias()
      setCategories(nuevasCategorias || [])

      setIsModalOpen(false)
      setEditingId(null)
      setImagePreview(null)
      setFormData({
        nombre: '',
        descripcion: '',
        icono: '',
        orden: 1,
        activa: false,
        imagen_url: null,
        imagen_file: null
      })
    } catch (error: any) {
      console.error('Error:', error)
      await showError('Error', error?.message || 'Error desconocido al guardar la categoría')
    }
  }

  const handleClose = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setImagePreview(null)
    setFormData({
      nombre: '',
      descripcion: '',
      icono: '',
      orden: 1,
      activa: false,
      imagen_url: null,
      imagen_file: null
    })
  }

  const handleEditClick = async (category: Category) => {
    setEditingId(category.id)
    setFormData({
      nombre: category.nombre,
      descripcion: category.descripcion || '',
      icono: category.icono || '',
      orden: category.orden,
      activa: category.estado === 'Activo',
      imagen_url: category.imagen_url,
      imagen_file: null
    })
    if (category.imagen_url) {
      setImagePreview(category.imagen_url)
    }
    setIsModalOpen(true)
  }

  const handleDeleteClick = async (id: string) => {
    try {
      const result = await showConfirm('¿Eliminar categoría?', 'Esta acción no se puede deshacer.')
      if (!result.isConfirmed) return

      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id)

      if (error) throw error

      const nuevasCategorias = await getCategorias()
      setCategories(nuevasCategorias || [])
      await showSuccess('Categoría eliminada', 'La categoría ha sido eliminada exitosamente')
    } catch (error: any) {
      console.error('Error eliminando categoría:', error)
      await showError('Error', error?.message || 'Error al eliminar la categoría')
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, imagen_file: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setFormData({ ...formData, imagen_file: null, imagen_url: null })
    setImagePreview(null)
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumbs */}
      <div className={styles.breadcrumbs}>
        <Link href="/" className={styles.breadcrumbLink}>Dashboard</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link href="/productos" className={styles.breadcrumbLink}>Productos</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>Categorías</span>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Administración de Categorías</h1>
          <p className={styles.description}>
            Gestiona las categorías de tus productos.
          </p>
        </div>
        <button 
          className={styles.addButton}
          onClick={() => setIsModalOpen(true)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
          <span className="truncate">Agregar Categoría</span>
        </button>
      </div>

      {/* Tabla de Categorías */}
      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Icono</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Orden</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                    Cargando categorías...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                    No hay categorías. Crea una nueva categoría.
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <div className={styles.iconContainer}>
                        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                          {getIconName(category.icono)}
                        </span>
                      </div>
                    </td>
                    <td className={styles.categoryName}>{category.nombre}</td>
                    <td className={styles.categoryDescription}>{category.descripcion || '-'}</td>
                    <td className={styles.order}>{category.orden}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusClass(category.estado)}`}>
                        {category.estado}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button 
                          className={styles.actionButton} 
                          aria-label="Editar" 
                          title="Editar"
                          onClick={() => handleEditClick(category)}
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button 
                          className={`${styles.actionButton} ${styles.delete}`} 
                          aria-label="Eliminar" 
                          title="Eliminar"
                          onClick={() => handleDeleteClick(category.id)}
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear Nueva Categoría */}
      {isModalOpen && (
        <>
          <div className={styles.modalOverlay} onClick={handleClose} />
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingId ? 'Editar Categoría' : 'Crear Nueva Categoría'}
              </h2>
              <button className={styles.modalClose} onClick={handleClose}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>
            <p className={styles.modalSubtitle}>
              {editingId ? 'Actualiza los detalles de la categoría.' : 'Rellena los detalles de la nueva categoría.'}
            </p>
            <form onSubmit={handleSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Nombre de la categoría <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Ej. Bebidas Calientes"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Descripción</label>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  placeholder="Añade una descripción opcional..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Imagen de la Categoría</label>
                <div style={{
                  border: '2px dashed #ccc',
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  marginBottom: '10px',
                  backgroundColor: '#f9f9f9'
                }}>
                  {imagePreview ? (
                    <div>
                      <img 
                        src={imagePreview} 
                        alt="Vista previa" 
                        style={{
                          maxWidth: '100%',
                          maxHeight: '200px',
                          marginBottom: '10px',
                          borderRadius: '4px'
                        }} 
                      />
                      <p style={{ margin: '10px 0', color: '#666' }}>Imagen seleccionada</p>
                      <button
                        type="button"
                        onClick={removeImage}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#ff6b6b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Eliminar imagen
                      </button>
                    </div>
                  ) : (
                    <label style={{ cursor: 'pointer' }}>
                      <span className="material-symbols-outlined" style={{
                        fontSize: '48px',
                        color: '#999',
                        display: 'block',
                        marginBottom: '10px'
                      }}>
                        image
                      </span>
                      <p style={{ color: '#666', margin: '10px 0' }}>
                        Haz clic para seleccionar una imagen
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Icono</label>
                <select
                  className={styles.select}
                  value={formData.icono}
                  onChange={(e) => setFormData({ ...formData, icono: e.target.value })}
                >
                  <option value="">Seleccionar icono</option>
                  {iconOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Orden de visualización</label>
                <input
                  type="number"
                  className={styles.input}
                  value={formData.orden}
                  onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>

              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.activa}
                    onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                  />
                  <span>Categoría activa</span>
                </label>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleClose}
                  disabled={uploadingImage}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.createButton}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? 'Subiendo imagen...' : (editingId ? 'Actualizar Categoría' : 'Crear Categoría')}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

