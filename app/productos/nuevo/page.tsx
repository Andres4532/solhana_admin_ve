'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { crearProducto, getCategorias, getNextSkuNumberByCategory } from '@/lib/supabase-queries'
import { showSuccess, showError } from '@/lib/swal'
import { uploadImage, validateImageFile } from '@/lib/supabase-storage'
import ImageUploader from '@/components/ImageUploader'
import AddAttributeModal from '@/components/AddAttributeModal'
import AddValueModal from '@/components/AddValueModal'
import styles from './nuevo.module.css'

interface Variant {
  id: string
  attributes: string
  precio: string
  sku: string
  stock: number
  activo: boolean
}

export default function NuevoProductoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categorias, setCategorias] = useState<Array<{ id: string, nombre: string }>>([])
  
  // Form data
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [descripcionCorta, setDescripcionCorta] = useState('')
  const [precio, setPrecio] = useState('')
  const [descuento, setDescuento] = useState('0')
  const [sku, setSku] = useState('')
  const [stock, setStock] = useState('0')
  const [categoriaId, setCategoriaId] = useState('')
  const [tipoProducto, setTipoProducto] = useState('')
  const [productStatus, setProductStatus] = useState<'Borrador' | 'Activo' | 'Inactivo'>('Borrador')
  
  // Variantes - Sistema dinámico
  const [hasVariants, setHasVariants] = useState(false)
  const [attributes, setAttributes] = useState<Array<{
    id: string
    name: string
    values: string[]
    activo: boolean
  }>>([
    { id: 'color', name: 'Color', values: ['Negro', 'Blanco'], activo: true },
    { id: 'talla', name: 'Talla', values: ['S', 'M', 'L'], activo: true }
  ])
  const [variants, setVariants] = useState<Array<{
    id: string
    attributes: Record<string, string> // { Color: "Negro", Talla: "M" }
    precio: string
    sku: string
    stock: number
    activo: boolean
    imagen?: string | null
  }>>([])
  
  // Especificaciones
  const [specifications, setSpecifications] = useState<Array<{ id: string, name: string, valor?: string }>>([])
  
  // Imágenes
  const [imagenes, setImagenes] = useState<string[]>([])
  
  // Etiquetas
  const [esNuevo, setEsNuevo] = useState(false)
  const [esBestSeller, setEsBestSeller] = useState(false)
  const [esOferta, setEsOferta] = useState(false)
  
  // Errores de validación
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Modales
  const [showAddAttributeModal, setShowAddAttributeModal] = useState(false)
  const [showAddValueModal, setShowAddValueModal] = useState(false)
  const [selectedAttributeForValue, setSelectedAttributeForValue] = useState<string>('')
  
  // Referencias para inputs de imagen de variantes
  const variantImageInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const [uploadingVariantImage, setUploadingVariantImage] = useState<string | null>(null)
  
  const lastGeneratedPrefix = useRef<string>('')
  
  // Selección múltiple de variantes
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set())

  // Obtener nombres de atributos existentes para filtrar
  const existingAttributeNames = attributes.map(a => a.name)
  
  // Funciones helper para generar SKU
  const getCategoryPrefix = (categoryName: string): string => {
    if (!categoryName || categoryName.trim().length === 0) return ''
    // Obtener las primeras 3 letras en mayúsculas
    const cleanName = categoryName.trim().toUpperCase().replace(/[^A-Z]/g, '')
    return cleanName.substring(0, 3).padEnd(3, 'X') // Si tiene menos de 3 letras, rellenar con X
  }

  const getProductTypePrefix = (productType: string): string => {
    if (!productType || productType.trim().length === 0) return ''
    // Obtener las primeras letras de cada palabra
    const words = productType.trim().split(/\s+/)
    return words
      .map(word => {
        const cleanWord = word.replace(/[^a-zA-Z]/g, '')
        return cleanWord.charAt(0).toUpperCase()
      })
      .join('')
      .substring(0, 10) // Limitar a 10 caracteres máximo
  }

  // Cargar categorías
  useEffect(() => {
    async function loadCategorias() {
      try {
        const data = await getCategorias()
        setCategorias(data || [])
      } catch (error) {
        console.error('Error cargando categorías:', error)
      }
    }
    loadCategorias()
  }, [])

  // Generar SKU automáticamente cuando cambien categoría o tipo de producto
  useEffect(() => {
    let cancelled = false

    async function generateSku() {
      // Solo generar si hay categoría seleccionada
      if (!categoriaId) {
        return
      }

      // Esperar a que las categorías se carguen
      if (categorias.length === 0) {
        return
      }

      // Obtener el nombre de la categoría
      const categoria = categorias.find(cat => cat.id === categoriaId)
      if (!categoria || !categoria.nombre) {
        return
      }

      const categoryPrefix = getCategoryPrefix(categoria.nombre)
      const typePrefix = getProductTypePrefix(tipoProducto)

      // Si no hay prefijo de categoría, no generar SKU
      if (!categoryPrefix || categoryPrefix.length < 3) {
        return
      }

      // Construir el prefijo completo del SKU
      let skuPrefix = categoryPrefix
      if (typePrefix && typePrefix.length > 0) {
        skuPrefix = `${categoryPrefix}-${typePrefix}`
      } else {
        // Si no hay tipo de producto, usar solo el prefijo de categoría
        skuPrefix = categoryPrefix
      }

      // Si el prefijo no cambió y el SKU ya existe con ese prefijo, no regenerar
      if (skuPrefix === lastGeneratedPrefix.current && sku && sku.startsWith(skuPrefix)) {
        const currentPrefix = sku.split('-').slice(0, -1).join('-')
        if (currentPrefix === skuPrefix) {
          return
        }
      }

      // Actualizar el prefijo generado
      lastGeneratedPrefix.current = skuPrefix

      // Generar SKU temporal mientras se consulta la BD
      const tempSku = `${skuPrefix}-001`
      const currentSkuValue = sku || ''
      const shouldShowTemp = !currentSkuValue || 
                            currentSkuValue.trim() === '' || 
                            !currentSkuValue.startsWith(skuPrefix)

      if (shouldShowTemp) {
        setSku(tempSku)
      }

      try {
        // Obtener el siguiente número secuencial basado en la categoría
        const nextNumber = await getNextSkuNumberByCategory(categoriaId)
        
        if (cancelled) return
        
        const newSku = `${skuPrefix}-${nextNumber.toString().padStart(3, '0')}`
        
        // Actualizar con el número correcto
        if (shouldShowTemp) {
          setSku(newSku)
        }
      } catch (error) {
        console.error('Error generando SKU:', error)
        if (cancelled) return
        
        // Si hay error, generar un SKU básico sin consultar la BD
        const fallbackNumber = 1
        const newSku = `${skuPrefix}-${fallbackNumber.toString().padStart(3, '0')}`
        const currentSkuValue = sku || ''
        const shouldUpdate = !currentSkuValue || 
                            currentSkuValue.trim() === '' || 
                            !currentSkuValue.startsWith(skuPrefix)
        if (shouldUpdate) {
          setSku(newSku)
        }
      }
    }

    generateSku()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriaId, tipoProducto, categorias])

  // Funciones para manejar atributos dinámicos
  const addAttribute = (name: string) => {
    const newAttr = {
      id: Date.now().toString(),
      name: name,
      values: [],
      activo: true
    }
    setAttributes([...attributes, newAttr])
  }

  const removeAttribute = (attrId: string) => {
    setAttributes(attributes.filter(a => a.id !== attrId))
  }

  const handleOpenAddValueModal = (attrId: string) => {
    setSelectedAttributeForValue(attrId)
    setShowAddValueModal(true)
  }

  const addAttributeValue = (value: string) => {
    const attr = attributes.find(a => a.id === selectedAttributeForValue)
    if (!attr) return
    
    setAttributes(attributes.map(a => 
      a.id === selectedAttributeForValue 
        ? { ...a, values: [...a.values, value] }
        : a
    ))
  }

  const removeAttributeValue = (attrId: string, value: string) => {
    setAttributes(attributes.map(a => 
      a.id === attrId 
        ? { ...a, values: a.values.filter(v => v !== value) }
        : a
    ))
  }

  const toggleAttribute = (attrId: string) => {
    setAttributes(attributes.map(a => 
      a.id === attrId 
        ? { ...a, activo: !a.activo }
        : a
    ))
  }

  const addSpecification = () => {
    const nombre = prompt('Nombre de la especificación:')
    if (nombre) {
      const valor = prompt('Valor (opcional):') || ''
      setSpecifications([...specifications, { 
        id: Date.now().toString(), 
        name: nombre,
        valor: valor || undefined
      }])
    }
  }

  const updateSpecification = (id: string, field: 'name' | 'valor', value: string) => {
    setSpecifications(specifications.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ))
  }

  const removeSpecification = (id: string) => {
    setSpecifications(specifications.filter(s => s.id !== id))
  }

  // Función para generar todas las combinaciones posibles de atributos
  const generateCombinations = (attrs: Array<{ name: string, values: string[] }>): Array<Record<string, string>> => {
    if (attrs.length === 0) return []
    
    // Filtrar atributos que tienen valores
    const attrsWithValues = attrs.filter(a => a.values.length > 0)
    if (attrsWithValues.length === 0) return []

    // Función recursiva para generar combinaciones
    const combine = (index: number, current: Record<string, string>): Array<Record<string, string>> => {
      if (index >= attrsWithValues.length) {
        return [current]
      }

      const results: Array<Record<string, string>> = []
      const attr = attrsWithValues[index]

      attr.values.forEach(value => {
        const newCombination = { ...current, [attr.name]: value }
        results.push(...combine(index + 1, newCombination))
      })

      return results
    }

    return combine(0, {})
  }

  // Generar variantes automáticamente cuando cambian los atributos
  useEffect(() => {
    if (!hasVariants) {
      setVariants([])
      return
    }

    const activeAttributes = attributes.filter(a => a.activo && a.values.length > 0)
    
    if (activeAttributes.length === 0) {
      setVariants([])
      return
    }

    const combinations = generateCombinations(activeAttributes)
    
    // Función para generar SKU único basado en atributos
    const generateVariantSKU = (combo: Record<string, string>, baseSKU: string, index: number, usedSKUs: Set<string>): string => {
      // Crear sufijo basado en los valores de los atributos
      // Usar un hash más robusto que incluya más información del valor y un hash numérico
      const sortedEntries = Object.entries(combo).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      
      // Calcular un hash simple basado en los valores para mayor unicidad
      const valuesString = sortedEntries.map(([_, value]) => value).join('')
      const hash = valuesString.split('').reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0)
      }, 0)
      const hashSuffix = Math.abs(hash).toString(36).substring(0, 2).toUpperCase()
      
      const skuParts = sortedEntries.map(([key, value], partIndex) => {
        // Limpiar el valor
        const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
        
        // Crear un código más único usando múltiples estrategias
        let code = ''
        
        if (cleanValue.length >= 4) {
          // Si tiene 4+ caracteres, usar los primeros 2 y los últimos 2
          code = cleanValue.substring(0, 2) + cleanValue.substring(cleanValue.length - 2)
        } else if (cleanValue.length === 3) {
          // Si tiene 3, usar todos + primera letra del atributo
          code = cleanValue + key.charAt(0).toUpperCase()
        } else if (cleanValue.length === 2) {
          // Si tiene 2, duplicar + primera letra del atributo
          code = cleanValue + cleanValue.charAt(0) + key.charAt(0).toUpperCase()
        } else if (cleanValue.length === 1) {
          // Si tiene 1, triplicar + primera letra del atributo
          code = cleanValue + cleanValue + cleanValue + key.charAt(0).toUpperCase()
        } else {
          // Fallback: usar las primeras letras del nombre del atributo + índice
          code = key.substring(0, 2).toUpperCase() + partIndex.toString()
        }
        
        return code
      })
      
      const skuSuffix = skuParts.join('-') + '-' + hashSuffix
      const base = (baseSKU || 'PROD').trim().toUpperCase()
      let finalSKU = `${base}-${skuSuffix}`
      
      // Si el SKU ya está en uso, agregar un índice único
      let counter = 1
      while (usedSKUs.has(finalSKU)) {
        finalSKU = `${base}-${skuSuffix}-${counter}`
        counter++
      }
      
      return finalSKU
    }
    
    setVariants(prevVariants => {
      // Generar SKUs únicos para todas las combinaciones
      const generatedSKUs = new Set<string>()
      
      // Función para validar que una variante es válida (todos sus valores existen en los atributos actuales)
      const isValidVariant = (variant: typeof prevVariants[0]): boolean => {
        // Verificar que todos los atributos de la variante existen en los atributos activos
        for (const [attrName, attrValue] of Object.entries(variant.attributes)) {
          const attr = activeAttributes.find(a => a.name === attrName)
          if (!attr) return false // El atributo ya no existe
          if (!attr.values.includes(attrValue)) return false // El valor ya no existe en ese atributo
        }
        return true
      }

      // Filtrar solo las variantes válidas antes de procesar
      const validPrevVariants = prevVariants.filter(isValidVariant)

      // Primero, generar todos los SKUs para asegurar unicidad
      const generated = combinations.map((combo, index) => {
        // Crear ID único basado en los valores
        const comboId = Object.values(combo).join('-').replace(/\s+/g, '-')
        
        // Verificar si ya existe una variante válida con estos atributos exactos
        const existing = validPrevVariants.find(v => {
          // Verificar que coincide exactamente con esta combinación
          const vKeys = Object.keys(v.attributes).sort()
          const cKeys = Object.keys(combo).sort()
          return vKeys.length === cKeys.length &&
            vKeys.every(key => v.attributes[key] === combo[key])
        })

        if (existing) {
          // Si los atributos cambiaron, regenerar el SKU automáticamente
          const attributesChanged = Object.keys(combo).some(key => existing.attributes[key] !== combo[key]) ||
            Object.keys(existing.attributes).some(key => combo[key] !== existing.attributes[key])
          
          if (attributesChanged || !existing.sku || existing.sku.trim() === '' || existing.sku.startsWith(`${sku || 'PROD'}-`) === false) {
            // Regenerar SKU cuando cambian los atributos o si está vacío o no coincide con el formato
            const newSKU = generateVariantSKU(combo, sku, index, generatedSKUs)
            generatedSKUs.add(newSKU)
            return {
              ...existing,
              attributes: combo,
              sku: newSKU
            }
          }
          // Si los atributos no cambiaron y el SKU existe, mantenerlo pero verificar que sea único
          if (generatedSKUs.has(existing.sku)) {
            // Si el SKU existente está duplicado, generar uno nuevo
            const newSKU = generateVariantSKU(combo, sku, index, generatedSKUs)
            generatedSKUs.add(newSKU)
            return {
              ...existing,
              attributes: combo,
              sku: newSKU
            }
          }
          generatedSKUs.add(existing.sku)
          return {
            ...existing,
            attributes: combo
          }
        }

        // Generar SKU único para nueva variante
        const newSKU = generateVariantSKU(combo, sku, index, generatedSKUs)
        generatedSKUs.add(newSKU)

        return {
          id: `${comboId}-${Date.now()}-${index}`,
          attributes: combo,
          precio: '0.00',
          sku: newSKU,
          stock: 0,
          activo: true,
          imagen: null
        }
      })

      // NO mantener variantes que no están en las nuevas combinaciones
      // Si se eliminaron atributos o valores, esas variantes deben desaparecer
      // Solo retornar las variantes generadas que coinciden con las combinaciones actuales
      return generated
    })
  }, [hasVariants, attributes, sku])

  // Función para actualizar variante
  const updateVariant = (id: string, field: string, value: any) => {
    setVariants(variants.map(v => {
      if (v.id === id) {
        const updated = { ...v, [field]: value }
        
        // Validación: Si se activa una variante, debe tener stock > 0
        if (field === 'activo' && value === true && updated.stock === 0) {
          showError('Error', 'No puedes activar una variante sin stock. Agrega stock primero.')
          return { ...updated, activo: false } // Mantener desactivada
        }
        
        // Validación: Si el stock se pone en 0 y la variante está activa, desactivarla
        if (field === 'stock' && value === 0 && updated.activo) {
          return { ...updated, activo: false } // Desactivar automáticamente
        }
        
        return updated
      }
      return v
    }))
  }

  // Funciones para manejar imágenes de variantes
  const handleVariantImageClick = (variantId: string) => {
    const input = variantImageInputRefs.current[`variant-${variantId}`]
    if (input) {
      input.click()
    }
  }

  const handleVariantImageUpload = async (variantId: string, file: File) => {
    try {
      setUploadingVariantImage(variantId)
      const imageUrl = await uploadImage(file, 'productos', 'variantes')
      updateVariant(variantId, 'imagen', imageUrl)
    } catch (error: any) {
      await showError('Error', error.message || 'No se pudo subir la imagen')
    } finally {
      setUploadingVariantImage(null)
    }
  }

  const handleVariantFileSelect = (variantId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validation = validateImageFile(file)
      if (validation.valid) {
        handleVariantImageUpload(variantId, file)
      } else {
        showError('Error', validation.error || 'Archivo inválido')
      }
      e.target.value = ''
    }
  }

  const handleRemoveVariantImage = (variantId: string) => {
    updateVariant(variantId, 'imagen', null)
  }

  // Funciones para selección múltiple de variantes
  const handleSelectVariant = (variantId: string, checked: boolean) => {
    setSelectedVariants(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(variantId)
      } else {
        newSet.delete(variantId)
      }
      return newSet
    })
  }

  const handleSelectAllVariants = (checked: boolean) => {
    if (checked) {
      setSelectedVariants(new Set(variants.map(v => v.id)))
    } else {
      setSelectedVariants(new Set())
    }
  }

  const handleBulkToggleActive = () => {
    if (selectedVariants.size === 0) {
      showError('Error', 'Selecciona al menos una variante')
      return
    }
    // Toggle: si todas están activas, desactivarlas; si alguna está inactiva, activarlas todas
    const selectedVariantsList = variants.filter(v => selectedVariants.has(v.id))
    const allActive = selectedVariantsList.every(v => v.activo)
    const newActiveState = !allActive
    
    // Validar que las variantes a activar tengan stock > 0
    if (newActiveState) {
      const variantesSinStock = selectedVariantsList.filter(v => v.stock === 0)
      if (variantesSinStock.length > 0) {
        showError('Error', `No puedes activar variantes sin stock. ${variantesSinStock.length} variante(s) seleccionada(s) tienen stock 0.`)
        return
      }
    }
    
    setVariants(prevVariants => 
      prevVariants.map(v => 
        selectedVariants.has(v.id) ? { ...v, activo: newActiveState } : v
      )
    )
    setSelectedVariants(new Set())
  }

  const handleBulkDelete = () => {
    if (selectedVariants.size === 0) {
      showError('Error', 'Selecciona al menos una variante')
      return
    }
    setVariants(prevVariants => 
      prevVariants.filter(v => !selectedVariants.has(v.id))
    )
    setSelectedVariants(new Set())
  }

  // Función para aplicar el precio original a todas las variantes
  const applyPriceToAllVariants = () => {
    const precioNum = parseFloat(precio.replace(/[^0-9.]/g, ''))
    if (isNaN(precioNum) || precioNum <= 0) {
      return
    }
    const precioFormateado = precioNum.toFixed(2)
    setVariants(variants.map(v => ({ ...v, precio: precioFormateado })))
  }

  // Función de validación
  const validateForm = (estado: 'Borrador' | 'Activo' | 'Inactivo'): boolean => {
    const newErrors: { [key: string]: string } = {}

    // Validar nombre
    if (!nombre.trim()) {
      newErrors.nombre = 'El nombre del producto es requerido'
    } else if (nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres'
    } else if (nombre.trim().length > 200) {
      newErrors.nombre = 'El nombre no puede exceder 200 caracteres'
    }

    // Validar SKU
    if (!sku.trim()) {
      newErrors.sku = 'El SKU es requerido'
    } else if (sku.trim().length < 3) {
      newErrors.sku = 'El SKU debe tener al menos 3 caracteres'
    } else if (sku.trim().length > 50) {
      newErrors.sku = 'El SKU no puede exceder 50 caracteres'
    } else if (!/^[A-Za-z0-9\-_]+$/.test(sku.trim())) {
      newErrors.sku = 'El SKU solo puede contener letras, números, guiones y guiones bajos'
    }

    // Validar precio
    if (!precio.trim()) {
      newErrors.precio = 'El precio es requerido'
    } else {
      const precioNum = parseFloat(precio.replace(/[^0-9.]/g, ''))
      if (isNaN(precioNum) || precioNum <= 0) {
        newErrors.precio = 'El precio debe ser un número mayor a 0'
      } else if (precioNum > 999999.99) {
        newErrors.precio = 'El precio no puede exceder Bs. 999,999.99'
      }
    }

    // Validar descuento
    if (descuento.trim()) {
      const descuentoNum = parseFloat(descuento)
      if (isNaN(descuentoNum) || descuentoNum < 0) {
        newErrors.descuento = 'El descuento debe ser un número mayor o igual a 0'
      } else if (descuentoNum > 100) {
        newErrors.descuento = 'El descuento no puede ser mayor a 100%'
      }
    }

    // Validar stock
    if (stock.trim()) {
      const stockNum = parseInt(stock)
      if (isNaN(stockNum) || stockNum < 0) {
        newErrors.stock = 'El stock debe ser un número entero mayor o igual a 0'
      } else if (stockNum > 999999) {
        newErrors.stock = 'El stock no puede exceder 999,999 unidades'
      }
    }

    // Validar descripción corta
    if (descripcionCorta.trim() && descripcionCorta.trim().length > 300) {
      newErrors.descripcionCorta = 'La descripción corta no puede exceder 300 caracteres'
    }

    // Validar descripción
    if (descripcion.trim() && descripcion.trim().length > 5000) {
      newErrors.descripcion = 'La descripción no puede exceder 5000 caracteres'
    }

    // Validar categoría (OBLIGATORIA)
    if (!categoriaId || categoriaId.trim() === '') {
      newErrors.categoria = 'La categoría es obligatoria'
    }

    // Validar variantes si tiene variantes activadas
    if (hasVariants) {
      const activeAttributes = attributes.filter(a => a.activo && a.values.length > 0)
      
      if (activeAttributes.length === 0) {
        newErrors.variantes = 'Debe agregar al menos un atributo con valores para las variantes'
      } else if (variants.length === 0) {
        newErrors.variantes = 'Debe generar al menos una variante'
      } else {
        // Validar cada variante
        variants.forEach((variant, index) => {
          if (!variant.sku.trim()) {
            newErrors[`variante_${index}_sku`] = 'El SKU de la variante es requerido'
          } else if (!/^[A-Za-z0-9\-_]+$/.test(variant.sku.trim())) {
            newErrors[`variante_${index}_sku`] = 'El SKU solo puede contener letras, números, guiones y guiones bajos'
          }
          if (variant.precio.trim()) {
            const precioVar = parseFloat(variant.precio.replace(/[^0-9.]/g, ''))
            if (isNaN(precioVar) || precioVar < 0) {
              newErrors[`variante_${index}_precio`] = 'El precio debe ser un número mayor o igual a 0'
            }
          }
          if (variant.stock < 0) {
            newErrors[`variante_${index}_stock`] = 'El stock debe ser mayor o igual a 0'
          }
          
          // Validar que variantes activas tengan stock > 0
          if (variant.activo && variant.stock === 0) {
            newErrors[`variante_${index}_stock`] = 'Las variantes activas deben tener stock mayor a 0'
          }
        })
      }
    }

    // Validar imágenes si el producto está activo
    if (estado === 'Activo' && imagenes.length === 0) {
      newErrors.imagenes = 'Debe agregar al menos una imagen para publicar el producto'
    }

    // Validar especificaciones
    specifications.forEach((spec, index) => {
      if (!spec.name.trim()) {
        newErrors[`especificacion_${index}_nombre`] = 'El nombre de la especificación es requerido'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Función para guardar producto
  const handleSubmit = async (estado: 'Borrador' | 'Activo' | 'Inactivo') => {
    // Limpiar errores previos
    setErrors({})
    
    // Validar formulario
    if (!validateForm(estado)) {
      await showError('Error de validación', 'Por favor corrige los errores en el formulario')
      // Scroll al primer error
      const firstErrorField = document.querySelector('[data-error]')
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    setLoading(true)
    try {
      const precioNum = parseFloat(precio.replace(/[^0-9.]/g, '')) || 0
      const descuentoNum = parseFloat(descuento) || 0
      const stockNum = parseInt(stock) || 0
      const precioOriginal = descuentoNum > 0 ? precioNum : undefined

      // Preparar variantes para Supabase
      const variantesData = hasVariants && variants.length > 0
        ? variants.map(v => ({
            atributos: v.attributes, // Ya es un objeto Record<string, string>
            precio: parseFloat(v.precio) || undefined,
            sku: v.sku,
            stock: v.stock,
            activo: v.activo,
            imagen_url: v.imagen || undefined
          }))
        : undefined

      // Preparar especificaciones
      const especificacionesData = specifications.length > 0
        ? specifications.map(s => ({
            nombre: s.name,
            valor: s.valor || undefined
          }))
        : undefined

      // Preparar imágenes para Supabase
      const imagenesData = imagenes.map((url, index) => ({
        url,
        orden: index + 1,
        es_principal: index === 0
      }))

      await crearProducto({
        sku,
        nombre,
        descripcion: descripcion || undefined,
        descripcion_corta: descripcionCorta || undefined,
        precio: precioNum,
        descuento: descuentoNum,
        precio_original: precioOriginal,
        stock: stockNum,
        categoria_id: categoriaId || undefined,
        tipo_producto: tipoProducto || undefined,
        estado,
        tiene_variantes: hasVariants,
        es_nuevo: esNuevo,
        es_best_seller: esBestSeller,
        es_oferta: esOferta,
        variantes: variantesData,
        especificaciones: especificacionesData,
        imagenes: imagenesData
      })

      await showSuccess('Producto creado', 'El producto ha sido creado exitosamente')
      router.push('/productos')
    } catch (error: any) {
      console.error('Error creando producto:', error)
      
      // Mensaje de error más específico
      let errorMessage = 'Error desconocido al crear el producto'
      let errorTitle = 'Error al crear producto'
      
      if (error?.code === 'DUPLICATE_SKU' || error?.message?.includes('productos_sku_key') || error?.message?.includes('duplicate key')) {
        errorMessage = error.message || `El SKU "${sku}" ya está en uso. Por favor, usa un SKU diferente.`
      } else if (error?.code === 'DUPLICATE_VARIANT_SKU' || error?.message?.includes('producto_variantes_sku_key')) {
        errorTitle = 'Error al crear variantes'
        errorMessage = error.message || 'Uno o más SKUs de las variantes ya están en uso. Por favor, verifica que todos los SKUs sean únicos.'
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      await showError(errorTitle, errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.logo}>
          <h2>SOLHANA</h2>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={styles.draftButton}
            onClick={() => handleSubmit('Borrador')}
            disabled={loading}
          >
            <span className="truncate">{loading ? 'Guardando...' : 'Guardar borrador'}</span>
          </button>
          <button className={styles.previewButton} disabled>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
          </button>
          <button className={styles.previewButton} disabled>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>more_vert</span>
          </button>
          <button 
            className={styles.publishButton}
            onClick={() => handleSubmit('Activo')}
            disabled={loading}
          >
            <span className="truncate">{loading ? 'Publicando...' : 'Publicar producto'}</span>
          </button>
        </div>
      </div>

      {/* Título y Descripción */}
      <div className={styles.titleSection}>
        <h1 className={styles.title}>Agregar nuevo producto</h1>
        <p className={styles.description}>
          Completa los detalles a continuación para registrar un nuevo producto en tu catálogo.
        </p>
      </div>

      {/* Contenido principal - Dos columnas */}
      <div className={styles.content}>
        {/* Columna izquierda */}
        <div className={styles.leftColumn}>
          {/* Información principal */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Información principal</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <p>Título del producto <span className={styles.required}>*</span></p>
              </label>
              <input
                type="text"
                className={`${styles.input} ${errors.nombre ? styles.inputError : ''}`}
                placeholder="Ej: Camiseta de algodón orgánico"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value)
                  if (errors.nombre) {
                    setErrors({ ...errors, nombre: '' })
                  }
                }}
                data-error={errors.nombre ? 'true' : undefined}
                required
              />
              {errors.nombre && <span className={styles.errorMessage}>{errors.nombre}</span>}
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Descripción corta
                {descripcionCorta.trim() && (
                  <span className={styles.charCount}>({descripcionCorta.trim().length}/300)</span>
                )}
              </label>
              <input
                type="text"
                className={`${styles.input} ${errors.descripcionCorta ? styles.inputError : ''}`}
                placeholder="Descripción breve para listados..."
                value={descripcionCorta}
                onChange={(e) => {
                  setDescripcionCorta(e.target.value)
                  if (errors.descripcionCorta) {
                    setErrors({ ...errors, descripcionCorta: '' })
                  }
                }}
                data-error={errors.descripcionCorta ? 'true' : undefined}
                maxLength={300}
              />
              {errors.descripcionCorta && <span className={styles.errorMessage}>{errors.descripcionCorta}</span>}
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <p>Descripción del producto</p>
              </label>
              <textarea
                className={`${styles.textarea} ${errors.descripcion ? styles.inputError : ''}`}
                rows={6}
                placeholder="Describe tu producto en detalle..."
                value={descripcion}
                onChange={(e) => {
                  setDescripcion(e.target.value)
                  if (errors.descripcion) {
                    setErrors({ ...errors, descripcion: '' })
                  }
                }}
                data-error={errors.descripcion ? 'true' : undefined}
                maxLength={5000}
              />
              {errors.descripcion && <span className={styles.errorMessage}>{errors.descripcion}</span>}
            </div>
          </div>

          {/* Precio */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Precio</h3>
            <div className={styles.priceRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <p>Precio</p>
                </label>
                <div className={styles.priceInputWrapper}>
                  <span className={styles.pricePrefix}>Bs.</span>
                  <input
                    type="number"
                    className={`${styles.input} ${styles.priceInput} ${errors.precio ? styles.inputError : ''}`}
                    placeholder="0.00"
                    value={precio}
                    onChange={(e) => {
                      setPrecio(e.target.value)
                      if (errors.precio) {
                        setErrors({ ...errors, precio: '' })
                      }
                    }}
                    data-error={errors.precio ? 'true' : undefined}
                    required
                  />
                </div>
                {errors.precio && <span className={styles.errorMessage}>{errors.precio}</span>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <p>Descuento</p>
                </label>
                <div className={styles.discountInput}>
                  <input
                    type="number"
                    className={`${styles.input} ${errors.descuento ? styles.inputError : ''}`}
                    placeholder="0"
                    value={descuento}
                    onChange={(e) => {
                      setDescuento(e.target.value)
                      if (errors.descuento) {
                        setErrors({ ...errors, descuento: '' })
                      }
                    }}
                    data-error={errors.descuento ? 'true' : undefined}
                    min="0"
                    max="100"
                  />
                  <span className={styles.percent}>%</span>
                </div>
                {errors.descuento && <span className={styles.errorMessage}>{errors.descuento}</span>}
              </div>
            </div>
          </div>

          {/* Inventario */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Inventario</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <p>SKU (Stock Keeping Unit)</p>
              </label>
              <input
                type="text"
                className={`${styles.input} ${errors.sku ? styles.inputError : ''}`}
                placeholder="SAN-SP-001"
                value={sku}
                readOnly
                style={{ backgroundColor: '#f9fafb', cursor: 'not-allowed' }}
                data-error={errors.sku ? 'true' : undefined}
                required
              />
              {errors.sku && <span className={styles.errorMessage}>{errors.sku}</span>}
              <small className={styles.helpText}>
                {categoriaId && tipoProducto 
                  ? 'Se genera automáticamente basado en la categoría y tipo de producto.'
                  : 'Se generará automáticamente al seleccionar categoría y tipo de producto.'}
              </small>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <p>Cantidad disponible</p>
              </label>
              <input
                type="number"
                className={`${styles.input} ${errors.stock ? styles.inputError : ''}`}
                value={stock}
                onChange={(e) => {
                  setStock(e.target.value)
                  if (errors.stock) {
                    setErrors({ ...errors, stock: '' })
                  }
                }}
                data-error={errors.stock ? 'true' : undefined}
                min="0"
              />
              {errors.stock && <span className={styles.errorMessage}>{errors.stock}</span>}
            </div>
          </div>

          {/* Variantes del producto */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Variantes del producto</h3>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  id="has-variants"
                  checked={hasVariants}
                  onChange={(e) => setHasVariants(e.target.checked)}
                />
                <span>Este producto tiene variantes (Tallas, colores, medidas...)</span>
              </label>
            </div>

            {hasVariants && (
              <>
                {errors.variantes && (
                  <div className={styles.errorBanner}>
                    <span className={styles.errorMessage}>{errors.variantes}</span>
                  </div>
                )}

                {/* Gestión de Atributos */}
                <div className={styles.variantSection}>
                  <div className={styles.attributeHeader}>
                    <p className={styles.label} style={{ margin: 0 }}>Atributos de Variante</p>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {attributes.map((attr) => (
                        <div key={attr.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            id={`attr-${attr.id}`}
                            checked={attr.activo && attr.values.length > 0}
                            onChange={() => {
                              if (attr.values.length > 0) {
                                toggleAttribute(attr.id)
                              }
                            }}
                            disabled={attr.values.length === 0}
                            style={{ cursor: attr.values.length > 0 ? 'pointer' : 'not-allowed', opacity: attr.values.length === 0 ? 0.5 : 1 }}
                          />
                          <label 
                            htmlFor={`attr-${attr.id}`} 
                            style={{ 
                              fontSize: '14px', 
                              color: attr.values.length > 0 ? 'var(--slate-700)' : 'var(--slate-400)',
                              cursor: attr.values.length > 0 ? 'pointer' : 'not-allowed'
                            }}
                            onClick={() => {
                              if (attr.values.length > 0) {
                                toggleAttribute(attr.id)
                              }
                            }}
                          >
                            {attr.name} {attr.values.length === 0 && '(sin valores)'}
                          </label>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          className={styles.input}
                          style={{ width: '192px', height: '36px', fontSize: '14px', padding: '8px' }}
                          placeholder="Personalizado..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget
                              const value = input.value.trim()
                              if (value) {
                                addAttribute(value)
                                input.value = ''
                              }
                            }
                          }}
                        />
                        <button 
                          className={styles.addButton}
                          onClick={() => setShowAddAttributeModal(true)}
                          type="button"
                          style={{ width: '36px', height: '36px', padding: 0, minWidth: '36px' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {attributes.map((attr) => (
                    attr.activo ? (
                      <div key={attr.id} className={styles.attributeCard}>
                        <div className={styles.attributeTitle}>
                          <p className={styles.label} style={{ margin: 0 }}>Valores de {attr.name}</p>
                        </div>
                        <div className={styles.tagsContainer}>
                          {attr.values.map((value) => (
                            <div key={value} className={styles.tag}>
                              <span>{value}</span>
                              <button
                                className={styles.tagRemove}
                                onClick={() => removeAttributeValue(attr.id, value)}
                                type="button"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                              </button>
                            </div>
                          ))}
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="text"
                              className={styles.input}
                              style={{ width: '160px', height: '36px', fontSize: '14px', padding: '8px' }}
                              placeholder={`Agregar nuevo ${attr.name.toLowerCase()}`}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  const input = e.currentTarget
                                  const value = input.value.trim()
                                  if (value && !attr.values.includes(value)) {
                                    addAttributeValue(value)
                                    input.value = ''
                                  }
                                }
                              }}
                            />
                            <button 
                              className={styles.addButton}
                              onClick={() => handleOpenAddValueModal(attr.id)}
                              type="button"
                              style={{ width: '36px', height: '36px', padding: 0, minWidth: '36px' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null
                  ))}

                  {attributes.length === 0 && (
                    <div style={{ 
                      padding: '24px', 
                      textAlign: 'center', 
                      color: '#6b7280',
                      border: '2px dashed #e5e7eb',
                      borderRadius: '8px'
                    }}>
                      <p style={{ margin: 0 }}>No hay atributos configurados</p>
                      <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                        Agrega atributos como Color, Talla, Material, etc.
                      </p>
                    </div>
                  )}
                </div>

                {variants.length > 0 && (
                  <div className={styles.variantsGenerated}>
                    <div className={styles.variantsHeader}>
                      <p className={styles.variantsCount}>{variants.length} variantes generadas</p>
                      <div className={styles.variantsActions}>
                        <button 
                          className={styles.actionButton}
                          onClick={applyPriceToAllVariants}
                          title={`Aplicar precio de Bs. ${parseFloat(precio.replace(/[^0-9.]/g, '')) || 0} a todas las variantes`}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>content_copy</span>
                          <span>Copiar</span>
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={handleBulkToggleActive}
                          disabled={selectedVariants.size === 0}
                          title={selectedVariants.size === 0 ? 'Selecciona variantes primero' : `Activar/Desactivar ${selectedVariants.size} variante(s) seleccionada(s)`}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>toggle_on</span>
                          <span>Activar/Desactivar ({selectedVariants.size})</span>
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={handleBulkDelete}
                          disabled={selectedVariants.size === 0}
                          title={selectedVariants.size === 0 ? 'Selecciona variantes primero' : `Eliminar ${selectedVariants.size} variante(s) seleccionada(s)`}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                          <span>Eliminar ({selectedVariants.size})</span>
                        </button>
                      </div>
                    </div>
                    <div className={styles.variantsTable}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>
                              <input
                                type="checkbox"
                                checked={variants.length > 0 && selectedVariants.size === variants.length}
                                onChange={(e) => handleSelectAllVariants(e.target.checked)}
                                title="Seleccionar todas"
                              />
                            </th>
                            <th>VARIANTE</th>
                            <th>PRECIO</th>
                            <th>SKU</th>
                            <th>STOCK</th>
                            <th>IMAGEN</th>
                            <th>ACTIVO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variants.map((variant, index) => (
                            <tr key={variant.id}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedVariants.has(variant.id)}
                                  onChange={(e) => handleSelectVariant(variant.id, e.target.checked)}
                                  title="Seleccionar variante"
                                />
                              </td>
                              <td>
                                {Object.entries(variant.attributes)
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join(' / ')}
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className={`${styles.input} ${errors[`variante_${index}_precio`] ? styles.inputError : ''}`}
                                  style={{ width: '80px' }}
                                  value={variant.precio}
                                  onChange={(e) => {
                                    updateVariant(variant.id, 'precio', e.target.value)
                                    if (errors[`variante_${index}_precio`]) {
                                      setErrors({ ...errors, [`variante_${index}_precio`]: '' })
                                    }
                                  }}
                                  placeholder="0.00"
                                />
                                {errors[`variante_${index}_precio`] && (
                                  <span className={styles.errorMessage} style={{ fontSize: '11px', display: 'block', marginTop: '2px' }}>
                                    {errors[`variante_${index}_precio`]}
                                  </span>
                                )}
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className={`${styles.input} ${errors[`variante_${index}_sku`] ? styles.inputError : ''}`}
                                  style={{ width: '120px', backgroundColor: '#f9fafb' }}
                                  value={variant.sku}
                                  readOnly
                                  title="SKU generado automáticamente basado en los atributos"
                                />
                                {errors[`variante_${index}_sku`] && (
                                  <span className={styles.errorMessage} style={{ fontSize: '11px', display: 'block', marginTop: '2px' }}>
                                    {errors[`variante_${index}_sku`]}
                                  </span>
                                )}
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <input
                                    type="number"
                                    className={`${styles.input} ${errors[`variante_${index}_stock`] ? styles.inputError : ''} ${variant.activo && variant.stock === 0 ? styles.inputError : ''}`}
                                    style={{ 
                                      width: '80px',
                                      borderColor: variant.activo && variant.stock === 0 ? '#ef4444' : undefined
                                    }}
                                    value={variant.stock}
                                    onChange={(e) => {
                                      updateVariant(variant.id, 'stock', parseInt(e.target.value) || 0)
                                      if (errors[`variante_${index}_stock`]) {
                                        setErrors({ ...errors, [`variante_${index}_stock`]: '' })
                                      }
                                    }}
                                    min="0"
                                  />
                                  {errors[`variante_${index}_stock`] && (
                                    <span className={styles.errorMessage} style={{ fontSize: '11px', display: 'block', marginTop: '2px' }}>
                                      {errors[`variante_${index}_stock`]}
                                    </span>
                                  )}
                                  {variant.activo && variant.stock === 0 && (
                                    <span className={styles.errorMessage} style={{ fontSize: '10px', display: 'block', marginTop: '2px' }}>
                                      Variante activa sin stock
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                {variant.imagen ? (
                                  <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <img
                                      src={variant.imagen}
                                      alt="Variante"
                                      style={{
                                        width: '48px',
                                        height: '48px',
                                        objectFit: 'cover',
                                        borderRadius: '6px',
                                        border: '1px solid var(--slate-200)',
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => handleVariantImageClick(variant.id)}
                                    />
                                    {uploadingVariantImage === variant.id && (
                                      <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        backgroundColor: 'rgba(0,0,0,0.5)',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}>
                                        <span style={{ color: 'white', fontSize: '10px' }}>Subiendo...</span>
                                      </div>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemoveVariantImage(variant.id)
                                      }}
                                      style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        padding: 0
                                      }}
                                      title="Eliminar imagen"
                                    >
                                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    className={styles.imagePlaceholder}
                                    onClick={() => handleVariantImageClick(variant.id)}
                                    title="Agregar imagen"
                                  >
                                    {uploadingVariantImage === variant.id ? (
                                      <span style={{ fontSize: '12px' }}>Subiendo...</span>
                                    ) : (
                                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_photo_alternate</span>
                                    )}
                                  </button>
                                )}
                                <input
                                  ref={(el) => { variantImageInputRefs.current[`variant-${variant.id}`] = el }}
                                  type="file"
                                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                                  onChange={(e) => handleVariantFileSelect(variant.id, e)}
                                  style={{ display: 'none' }}
                                />
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                  <label className={styles.toggle}>
                                    <input
                                      type="checkbox"
                                      checked={variant.activo}
                                      onChange={(e) => updateVariant(variant.id, 'activo', e.target.checked)}
                                      disabled={variant.stock === 0}
                                      title={variant.stock === 0 ? 'No se puede activar una variante sin stock' : 'Activar/Desactivar variante'}
                                    />
                                    <span className={styles.toggleSlider}></span>
                                  </label>
                                  {variant.activo && variant.stock === 0 && (
                                    <span style={{ 
                                      fontSize: '10px', 
                                      color: '#ef4444',
                                      textAlign: 'center',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      Sin stock
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Columna derecha */}
        <div className={styles.rightColumn}>
          {/* Estado del producto */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Estado del producto</h3>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  id="draft"
                  name="status"
                  value="Borrador"
                  checked={productStatus === 'Borrador'}
                  onChange={(e) => setProductStatus(e.target.value as 'Borrador' | 'Activo' | 'Inactivo')}
                />
                <span>Borrador</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  id="active"
                  name="status"
                  value="Activo"
                  checked={productStatus === 'Activo'}
                  onChange={(e) => setProductStatus(e.target.value as 'Borrador' | 'Activo' | 'Inactivo')}
                />
                <span>Activo</span>
              </label>
            </div>
          </div>

          {/* Organización */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Organización</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <p>Categoría <span style={{ color: '#ef4444' }}>*</span></p>
              </label>
              <select 
                className={`${styles.select} ${errors.categoria ? styles.inputError : ''}`}
                value={categoriaId}
                onChange={(e) => {
                  setCategoriaId(e.target.value)
                  if (errors.categoria) {
                    setErrors({ ...errors, categoria: '' })
                  }
                }}
                data-error={errors.categoria ? 'true' : undefined}
                required
              >
                <option value="">Seleccionar categoría</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
              {errors.categoria && <span className={styles.errorMessage}>{errors.categoria}</span>}
            </div>
            <div className={styles.formGroup}>
              <p className={styles.label}>Tipo de Producto</p>
              <div className={styles.typeInput}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Ej: Camiseta"
                  value={tipoProducto}
                  onChange={(e) => setTipoProducto(e.target.value)}
                />
                <button className={styles.addTypeButton} type="button">
                  Agregar tipo
                </button>
              </div>
            </div>
            <div className={styles.checkboxGroup} style={{ marginTop: '16px' }}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={esNuevo}
                  onChange={(e) => setEsNuevo(e.target.checked)}
                />
                <span>Marcar como nuevo</span>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={esBestSeller}
                  onChange={(e) => setEsBestSeller(e.target.checked)}
                />
                <span>Best Seller</span>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={esOferta}
                  onChange={(e) => setEsOferta(e.target.checked)}
                />
                <span>En oferta</span>
              </label>
            </div>
          </div>

          {/* Especificaciones */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Especificaciones</h3>
              <button className={styles.newButton} onClick={addSpecification}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                <span>Nueva</span>
              </button>
            </div>
            <div className={styles.specificationsList}>
              {specifications.map((spec, index) => (
                <div key={spec.id} className={styles.specificationItem}>
                  <p>{spec.name}{spec.valor ? `: ${spec.valor}` : ''}</p>
                  <div className={styles.specActions}>
                    <button
                      className={styles.iconButton}
                      onClick={() => {
                        const newName = prompt('Nuevo nombre:', spec.name)
                        if (newName) {
                          updateSpecification(spec.id, 'name', newName)
                        }
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                    </button>
                    <button
                      className={`${styles.iconButton} ${styles.delete}`}
                      onClick={() => removeSpecification(spec.id)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Medios */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Medios</h3>
            {errors.imagenes && (
              <div className={styles.errorBanner}>
                <span className={styles.errorMessage}>{errors.imagenes}</span>
              </div>
            )}
            <ImageUploader
              images={imagenes}
              onImagesChange={(newImages) => {
                setImagenes(newImages)
                if (errors.imagenes) {
                  setErrors({ ...errors, imagenes: '' })
                }
              }}
              maxImages={5}
              bucket="productos"
              folder="productos"
            />
          </div>
        </div>
      </div>

      {/* Modales */}
      <AddAttributeModal
        isOpen={showAddAttributeModal}
        onClose={() => setShowAddAttributeModal(false)}
        onAdd={addAttribute}
        existingAttributes={existingAttributeNames}
      />
      <AddValueModal
        isOpen={showAddValueModal}
        onClose={() => setShowAddValueModal(false)}
        onAdd={addAttributeValue}
        attributeName={attributes.find(a => a.id === selectedAttributeForValue)?.name || ''}
        existingValues={attributes.find(a => a.id === selectedAttributeForValue)?.values || []}
      />
    </div>
  )
}


