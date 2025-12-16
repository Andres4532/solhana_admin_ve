import { supabase } from './supabase'

// ============================================
// QUERIES PARA PRODUCTOS
// ============================================

export async function getProductos(filters?: {
  estado?: string
  search?: string
  categoria_id?: string
  limit?: number
  offset?: number
}) {
  let query = supabase
    .from('productos')
    .select(`
      id,
      sku,
      nombre,
      precio,
      descuento,
      stock,
      estado,
      categoria_id,
      categoria:categorias(nombre),
      producto_imagenes(url, es_principal, orden)
    `)

  if (filters?.estado) {
    if (filters.estado === 'Activo') {
      query = query.eq('estado', 'Activo')
    } else if (filters.estado === 'Inactivo') {
      query = query.eq('estado', 'Inactivo')
    }
    // Si es 'Todos', no filtramos por estado
  } else {
    // Por defecto solo mostrar activos
    query = query.eq('estado', 'Activo')
  }

  if (filters?.search) {
    query = query.or(`nombre.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`)
  }

  if (filters?.categoria_id) {
    query = query.eq('categoria_id', filters.categoria_id)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset !== undefined && filters?.limit) {
    query = query.range(filters.offset, filters.offset + filters.limit - 1)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getTotalProductos(filters?: {
  estado?: string
  search?: string
  categoria_id?: string
}) {
  let query = supabase
    .from('productos')
    .select('id', { count: 'exact', head: true })

  if (filters?.estado) {
    if (filters.estado === 'Activo') {
      query = query.eq('estado', 'Activo')
    } else if (filters.estado === 'Inactivo') {
      query = query.eq('estado', 'Inactivo')
    }
  } else {
    query = query.eq('estado', 'Activo')
  }

  if (filters?.search) {
    query = query.or(`nombre.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`)
  }

  if (filters?.categoria_id) {
    query = query.eq('categoria_id', filters.categoria_id)
  }

  const { count, error } = await query

  if (error) throw error
  return count || 0
}

export async function getProductoById(id: string) {
  const { data, error } = await supabase
    .from('productos')
    .select(`
      *,
      categoria:categorias(*),
      imagenes:producto_imagenes(*),
      variantes:producto_variantes(*),
      especificaciones:producto_especificaciones(*),
      resenas:producto_resenas(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function crearProducto(producto: {
  sku: string
  nombre: string
  descripcion?: string
  descripcion_corta?: string
  precio: number
  descuento?: number
  precio_original?: number
  stock: number
  categoria_id?: string
  tipo_producto?: string
  estado: 'Borrador' | 'Activo' | 'Inactivo'
  tiene_variantes?: boolean
  es_nuevo?: boolean
  es_best_seller?: boolean
  es_oferta?: boolean
  etiqueta_personalizada?: string
  tiempo_envio?: string
  variantes?: Array<{
    atributos: any
    precio?: number
    sku: string
    stock: number
    activo: boolean
    imagen_url?: string
  }>
  especificaciones?: Array<{
    nombre: string
    valor?: string
  }>
  imagenes?: Array<{
    url: string
    orden?: number
    es_principal?: boolean
  }>
}) {
  // Verificar si el SKU ya existe
  const { data: existingProduct, error: checkError } = await supabase
    .from('productos')
    .select('id, nombre')
    .eq('sku', producto.sku)
    .maybeSingle()

  // Si hay un error que no sea "no encontrado", lanzarlo
  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError
  }

  // Si el producto existe, lanzar error de SKU duplicado
  if (existingProduct) {
    const error = new Error(`El SKU "${producto.sku}" ya está en uso por el producto "${existingProduct.nombre}". Por favor, usa un SKU diferente.`)
    ;(error as any).code = 'DUPLICATE_SKU'
    throw error
  }

  // Crear el producto principal
  const { data: productoData, error: productoError } = await supabase
    .from('productos')
    .insert({
      sku: producto.sku,
      nombre: producto.nombre,
      descripcion: producto.descripcion || null,
      descripcion_corta: producto.descripcion_corta || null,
      precio: producto.precio,
      descuento: producto.descuento || 0,
      precio_original: producto.precio_original || null,
      stock: producto.stock,
      categoria_id: producto.categoria_id || null,
      tipo_producto: producto.tipo_producto || null,
      estado: producto.estado,
      tiene_variantes: producto.tiene_variantes || false,
      es_nuevo: producto.es_nuevo || false,
      es_best_seller: producto.es_best_seller || false,
      es_oferta: producto.es_oferta || false,
      etiqueta_personalizada: producto.etiqueta_personalizada || null,
      tiempo_envio: producto.tiempo_envio || '24 horas'
    })
    .select()
    .single()

  if (productoError) {
    // Mejorar el mensaje de error para SKU duplicado
    if (productoError.code === '23505' && productoError.message?.includes('productos_sku_key')) {
      const error = new Error(`El SKU "${producto.sku}" ya está en uso. Por favor, usa un SKU diferente.`)
      ;(error as any).code = 'DUPLICATE_SKU'
      throw error
    }
    throw productoError
  }

  const productoId = productoData.id

  // Crear variantes si existen
  if (producto.variantes && producto.variantes.length > 0) {
    // Verificar SKUs duplicados en las variantes antes de insertar
    const skus = producto.variantes.map(v => v.sku).filter(Boolean)
    const skusDuplicados = skus.filter((sku, index) => skus.indexOf(sku) !== index)
    
    if (skusDuplicados.length > 0) {
      const error = new Error(`Los SKUs de las variantes deben ser únicos. El SKU "${skusDuplicados[0]}" está duplicado.`)
      ;(error as any).code = 'DUPLICATE_VARIANT_SKU'
      throw error
    }

    // Verificar si algún SKU de variante ya existe en la base de datos
    if (skus.length > 0) {
      const { data: existingVariants, error: checkError } = await supabase
        .from('producto_variantes')
        .select('sku')
        .in('sku', skus)

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingVariants && existingVariants.length > 0) {
        const existingSku = existingVariants[0].sku
        const error = new Error(`El SKU de variante "${existingSku}" ya está en uso. Por favor, usa un SKU diferente.`)
        ;(error as any).code = 'DUPLICATE_VARIANT_SKU'
        throw error
      }
    }

    const variantesData = producto.variantes.map(variante => ({
      producto_id: productoId,
      atributos: typeof variante.atributos === 'string' ? JSON.parse(variante.atributos) : variante.atributos,
      precio: variante.precio || null,
      sku: variante.sku || null,
      stock: variante.stock || 0,
      activo: variante.activo !== undefined ? variante.activo : true,
      imagen_url: variante.imagen_url || null
    }))

    const { error: variantesError } = await supabase
      .from('producto_variantes')
      .insert(variantesData)

    if (variantesError) {
      // Mejorar el mensaje de error para SKU duplicado
      if (variantesError.code === '23505' && variantesError.message?.includes('producto_variantes_sku_key')) {
        const error = new Error(`El SKU de una variante ya está en uso. Por favor, verifica que todos los SKUs de las variantes sean únicos.`)
        ;(error as any).code = 'DUPLICATE_VARIANT_SKU'
        throw error
      }
      // Lanzar el error en lugar de solo loguearlo
      console.error('Error creando variantes:', variantesError)
      throw variantesError
    }
  }

  // Crear especificaciones si existen
  if (producto.especificaciones && producto.especificaciones.length > 0) {
    const especificacionesData = producto.especificaciones.map(espec => ({
      producto_id: productoId,
      nombre: espec.nombre,
      valor: espec.valor || null
    }))

    const { error: especError } = await supabase
      .from('producto_especificaciones')
      .insert(especificacionesData)

    if (especError) {
      console.error('Error creando especificaciones:', especError)
      // No lanzar error, solo loguear
    }
  }

  // Crear imágenes si existen
  if (producto.imagenes && producto.imagenes.length > 0) {
    const imagenesData = producto.imagenes.map((img, index) => ({
      producto_id: productoId,
      url: img.url,
      orden: img.orden || index,
      es_principal: img.es_principal || index === 0
    }))

    const { error: imagenesError } = await supabase
      .from('producto_imagenes')
      .insert(imagenesData)

    if (imagenesError) {
      console.error('Error creando imágenes:', imagenesError)
      // No lanzar error, solo loguear
    }
  }

  return productoData
}

export async function actualizarProducto(
  id: string,
  producto: {
    sku?: string
    nombre?: string
    descripcion?: string
    descripcion_corta?: string
    precio?: number
    descuento?: number
    precio_original?: number
    stock?: number
    categoria_id?: string
    tipo_producto?: string
    estado?: 'Borrador' | 'Activo' | 'Inactivo'
    tiene_variantes?: boolean
    es_nuevo?: boolean
    es_best_seller?: boolean
    es_oferta?: boolean
    etiqueta_personalizada?: string
    tiempo_envio?: string
  }
) {
  const { data, error } = await supabase
    .from('productos')
    .update(producto)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Funciones para gestionar variantes
export async function actualizarVariantesProducto(
  productoId: string,
  variantes: Array<{
    id?: string // Si tiene id, es una variante existente a actualizar
    atributos: any
    precio?: number
    sku: string
    stock: number
    activo: boolean
    imagen_url?: string
  }>
) {
  // Verificar SKUs duplicados en las variantes antes de actualizar
  const skus = variantes.map(v => v.sku).filter(Boolean)
  const skusDuplicados = skus.filter((sku, index) => skus.indexOf(sku) !== index)
  
  if (skusDuplicados.length > 0) {
    const error = new Error(`Los SKUs de las variantes deben ser únicos. El SKU "${skusDuplicados[0]}" está duplicado.`)
    ;(error as any).code = 'DUPLICATE_VARIANT_SKU'
    throw error
  }

  // Obtener variantes existentes
  const { data: variantesExistentes } = await supabase
    .from('producto_variantes')
    .select('id, sku')
    .eq('producto_id', productoId)

  const idsExistentes = (variantesExistentes || []).map(v => v.id)
  const variantesConId = variantes.filter(v => v.id && idsExistentes.includes(v.id))
  const variantesSinId = variantes.filter(v => !v.id || !idsExistentes.includes(v.id))

  // Eliminar variantes que ya no existen
  const idsAMantener = variantesConId.map(v => v.id).filter(Boolean) as string[]
  const idsAEliminar = idsExistentes.filter(id => !idsAMantener.includes(id))

  if (idsAEliminar.length > 0) {
    const { error: deleteError } = await supabase
      .from('producto_variantes')
      .delete()
      .in('id', idsAEliminar)

    if (deleteError) {
      console.error('Error eliminando variantes:', deleteError)
    }
  }

  // Actualizar variantes existentes
  for (const variante of variantesConId) {
    if (!variante.id) continue
    
    const { error: updateError } = await supabase
      .from('producto_variantes')
      .update({
        atributos: variante.atributos,
        precio: variante.precio || null,
        sku: variante.sku,
        stock: variante.stock,
        activo: variante.activo,
        imagen_url: variante.imagen_url || null
      })
      .eq('id', variante.id)

    if (updateError) {
      console.error('Error actualizando variante:', updateError)
    }
  }

  // Crear nuevas variantes
  if (variantesSinId.length > 0) {
    const nuevasVariantes = variantesSinId.map(v => ({
      producto_id: productoId,
      atributos: v.atributos,
      precio: v.precio || null,
      sku: v.sku,
      stock: v.stock,
      activo: v.activo,
      imagen_url: v.imagen_url || null
    }))

    const { error: insertError } = await supabase
      .from('producto_variantes')
      .insert(nuevasVariantes)

    if (insertError) {
      // Mejorar el mensaje de error para SKU duplicado
      if (insertError.code === '23505' && insertError.message?.includes('producto_variantes_sku_key')) {
        const error = new Error(`El SKU de una variante ya está en uso. Por favor, verifica que todos los SKUs de las variantes sean únicos.`)
        ;(error as any).code = 'DUPLICATE_VARIANT_SKU'
        throw error
      }
      console.error('Error creando variantes:', insertError)
      throw insertError
    }
  }
}

export async function eliminarProducto(id: string) {
  // Supabase eliminará automáticamente las relaciones (variantes, especificaciones, imágenes)
  // debido a ON DELETE CASCADE
  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getProductosCatalogo(filters?: {
  categoria_id?: string
  tipo_producto?: string
  precio_min?: number
  precio_max?: number
  es_nuevo?: boolean
  es_best_seller?: boolean
  es_oferta?: boolean
  search?: string
  limit?: number
  offset?: number
}) {
  let query = supabase
    .from('productos_catalogo')
    .select('*')

  if (filters?.categoria_id) {
    query = query.eq('categoria_id', filters.categoria_id)
  }

  if (filters?.tipo_producto) {
    query = query.eq('tipo_producto', filters.tipo_producto)
  }

  if (filters?.precio_min) {
    query = query.gte('precio_final', filters.precio_min)
  }

  if (filters?.precio_max) {
    query = query.lte('precio_final', filters.precio_max)
  }

  if (filters?.es_nuevo) {
    query = query.eq('es_nuevo', true)
  }

  if (filters?.es_best_seller) {
    query = query.eq('es_best_seller', true)
  }

  if (filters?.es_oferta) {
    query = query.eq('es_oferta', true)
  }

  if (filters?.search) {
    query = query.ilike('nombre', `%${filters.search}%`)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// ============================================
// QUERIES PARA CATEGORÍAS
// ============================================

export async function getCategorias() {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('orden', { ascending: true })

  if (error) {
    console.error('Error en getCategorias:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    throw error
  }
  return data
}

export async function getCategoriaById(id: string) {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// ============================================
// QUERIES PARA CARRITO
// ============================================

export async function getCarrito(clienteId?: string, sessionId?: string) {
  let query = supabase
    .from('carrito_completo')
    .select('*')

  if (clienteId) {
    query = query.eq('cliente_id', clienteId)
  } else if (sessionId) {
    query = query.eq('session_id', sessionId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function agregarAlCarrito(item: {
  cliente_id?: string
  session_id?: string
  producto_id: string
  variante_id?: string
  cantidad: number
  precio_unitario: number
  color?: string
  talla?: string
}) {
  const { data, error } = await supabase
    .from('carrito')
    .upsert(item, {
      onConflict: 'cliente_id,producto_id,variante_id,session_id'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function actualizarCantidadCarrito(
  id: string,
  cantidad: number
) {
  const { data, error } = await supabase
    .from('carrito')
    .update({ cantidad })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function eliminarDelCarrito(id: string) {
  const { error } = await supabase
    .from('carrito')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function limpiarCarrito(clienteId?: string, sessionId?: string) {
  let query = supabase.from('carrito').delete()

  if (clienteId) {
    query = query.eq('cliente_id', clienteId)
  } else if (sessionId) {
    query = query.eq('session_id', sessionId)
  }

  const { error } = await query
  if (error) throw error
}

// ============================================
// QUERIES PARA PEDIDOS
// ============================================

export async function crearPedido(pedido: {
  cliente_id?: string
  nombre_cliente?: string
  apellido_cliente?: string
  telefono_cliente?: string
  email_cliente?: string
  subtotal: number
  descuento?: number
  costo_envio?: number
  envio_prioritario?: boolean
  total: number
  metodo_pago: string
  metodo_envio?: string
  direccion_completa?: string
  ciudad_envio?: string
  departamento_envio?: string
  referencias_envio?: string
  items: Array<{
    producto_id: string
    variante_id?: string
    nombre_producto: string
    sku?: string
    precio_unitario: number
    cantidad: number
    subtotal: number
  }>
}) {
  // Si no hay cliente_id pero hay información del cliente, buscar o crear cliente
  let clienteIdFinal = pedido.cliente_id
  
  // Intentar crear cliente si hay nombre y al menos teléfono (email es opcional)
  if (!clienteIdFinal && pedido.nombre_cliente && pedido.telefono_cliente && pedido.telefono_cliente.trim()) {
    console.log('🔍 No hay cliente_id, buscando o creando cliente...', {
      nombre: pedido.nombre_cliente,
      telefono: pedido.telefono_cliente,
      email: pedido.email_cliente || 'sin email'
    })
    try {
      const clienteIdEncontrado = await buscarOCrearCliente({
        nombre: pedido.nombre_cliente.trim(),
        apellido: pedido.apellido_cliente?.trim(),
        email: pedido.email_cliente?.trim() || undefined, // Email puede ser null/undefined
        telefono: pedido.telefono_cliente.trim(),
        whatsapp: pedido.telefono_cliente.trim(),
        departamento: pedido.departamento_envio || pedido.ciudad_envio || undefined // Usar departamento_envio o ciudad_envio como fallback
      })
      
      if (clienteIdEncontrado) {
        clienteIdFinal = clienteIdEncontrado
        console.log('✅ Cliente asociado al pedido:', clienteIdFinal)
      } else {
        console.log('⚠️ No se pudo crear o encontrar cliente, el pedido se creará sin cliente_id')
      }
    } catch (error: any) {
      console.error('❌ Error al buscar/crear cliente:', {
        message: error.message,
        code: error.code,
        details: error.details
      })
      console.log('⚠️ Continuando sin cliente_id debido al error')
    }
  } else if (!clienteIdFinal && pedido.nombre_cliente && pedido.email_cliente && pedido.email_cliente.trim()) {
    // Si no hay teléfono pero hay email, también intentar crear
    console.log('🔍 No hay cliente_id, buscando o creando cliente por email...')
    const clienteIdEncontrado = await buscarOCrearCliente({
      nombre: pedido.nombre_cliente,
      apellido: pedido.apellido_cliente,
      email: pedido.email_cliente,
      telefono: pedido.telefono_cliente || undefined,
      whatsapp: pedido.telefono_cliente || undefined,
      departamento: pedido.departamento_envio || pedido.ciudad_envio || undefined
    })
    
    if (clienteIdEncontrado) {
      clienteIdFinal = clienteIdEncontrado
      console.log('✅ Cliente asociado al pedido:', clienteIdFinal)
    }
  }

  // Crear el pedido
  const { data: pedidoData, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      cliente_id: clienteIdFinal || null,
      nombre_cliente: pedido.nombre_cliente,
      apellido_cliente: pedido.apellido_cliente,
      telefono_cliente: pedido.telefono_cliente,
      email_cliente: pedido.email_cliente,
      subtotal: pedido.subtotal,
      descuento: pedido.descuento || 0,
      costo_envio: pedido.costo_envio || 0,
      envio_prioritario: pedido.envio_prioritario || false,
      total: pedido.total,
      metodo_pago: pedido.metodo_pago,
      metodo_envio: pedido.metodo_envio,
      direccion_completa: pedido.direccion_completa,
      ciudad_envio: pedido.ciudad_envio,
      referencias_envio: pedido.referencias_envio,
    })
    .select()
    .single()

  if (pedidoError) throw pedidoError

  // Crear los items del pedido
  const items = pedido.items.map(item => ({
    ...item,
    pedido_id: pedidoData.id
  }))

  const { error: itemsError } = await supabase
    .from('pedido_items')
    .insert(items)

  if (itemsError) throw itemsError

  return pedidoData
}

export async function getPedidos(filters?: {
  clienteId?: string
  estado?: string
  search?: string
  limit?: number
  offset?: number
}) {
  let query = supabase
    .from('pedidos')
    .select('id, numero_pedido, nombre_cliente, apellido_cliente, fecha_pedido, total, estado, email_cliente, telefono_cliente')

  if (filters?.clienteId) {
    query = query.eq('cliente_id', filters.clienteId)
  }

  if (filters?.estado && filters.estado !== 'Todos') {
    query = query.eq('estado', filters.estado)
  }

  if (filters?.search) {
    query = query.or(`numero_pedido.ilike.%${filters.search}%,nombre_cliente.ilike.%${filters.search}%,apellido_cliente.ilike.%${filters.search}%`)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset !== undefined && filters?.limit) {
    query = query.range(filters.offset, filters.offset + filters.limit - 1)
  }

  const { data, error } = await query.order('fecha_pedido', { ascending: false })

  if (error) throw error
  return data
}

export async function getTotalPedidos(filters?: {
  clienteId?: string
  estado?: string
  search?: string
}) {
  let query = supabase
    .from('pedidos')
    .select('id', { count: 'exact', head: true })

  if (filters?.clienteId) {
    query = query.eq('cliente_id', filters.clienteId)
  }

  if (filters?.estado && filters.estado !== 'Todos') {
    query = query.eq('estado', filters.estado)
  }

  if (filters?.search) {
    query = query.or(`numero_pedido.ilike.%${filters.search}%,nombre_cliente.ilike.%${filters.search}%,apellido_cliente.ilike.%${filters.search}%`)
  }

  const { count, error } = await query

  if (error) throw error
  return count || 0
}

// Función para verificar si un string es un UUID válido
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export async function getPedidoById(id: string) {
  console.log('🔍 getPedidoById llamado con ID:', id)
  
  // Limpiar el ID (remover # si existe)
  const cleanId = id.replace(/^#/, '')
  const isUUID = isValidUUID(cleanId)
  
  console.log('🔍 ID limpio:', cleanId, '¿Es UUID?', isUUID)
  
  let query = supabase
    .from('pedidos')
    .select(`
      *,
      cliente:clientes(*),
      items:pedido_items(
        *,
        producto:productos(
          id,
          nombre,
          sku,
          imagenes:producto_imagenes(url, es_principal, orden)
        ),
        variante:producto_variantes(
          id,
          atributos,
          sku,
          imagen_url
        )
      ),
      historial:pedido_historial(*)
    `)

  // Si es un UUID válido, buscar por id, sino buscar solo por numero_pedido
  if (isUUID) {
    // Intentar primero por ID, si no funciona, intentar por numero_pedido
    const { data: dataById } = await supabase
      .from('pedidos')
      .select('id')
      .eq('id', cleanId)
      .limit(1)
      .single()
    
    if (dataById) {
      query = query.eq('id', cleanId)
    } else {
      query = query.eq('numero_pedido', cleanId)
    }
  } else {
    // Si no es UUID, buscar por numero_pedido (con diferentes formatos posibles)
    // Intentar primero con el valor exacto
    query = query.eq('numero_pedido', cleanId)
  }
  
  query = query.limit(1)

  const { data, error } = await query

  if (error) {
    console.error('❌ Error en getPedidoById:', error)
    throw error
  }
  
  if (!data || data.length === 0) {
    console.log('⚠️ No se encontró pedido con numero_pedido:', cleanId)
    console.log('🔍 Intentando búsqueda alternativa...')
    
    // Si no se encontró, intentar buscar todos los pedidos para ver qué formatos tienen
    const { data: allPedidos } = await supabase
      .from('pedidos')
      .select('id, numero_pedido')
      .limit(10)
    
    console.log('📋 Primeros 10 pedidos en BD:', allPedidos?.map(p => ({ id: p.id.slice(0, 8), numero: p.numero_pedido })))
    
    // Intentar buscar con el ID formateado con #
    const withHash = `#${cleanId}`
    const { data: dataWithHash } = await supabase
      .from('pedidos')
      .select(`
        *,
        cliente:clientes(*),
        items:pedido_items(
          *,
          producto:productos(
            id,
            nombre,
            sku,
            imagenes:producto_imagenes(url, es_principal, orden)
          ),
          variante:producto_variantes(
            id,
            atributos,
            sku
          )
        ),
        historial:pedido_historial(*)
      `)
      .eq('numero_pedido', withHash)
      .limit(1)
    
    if (dataWithHash && dataWithHash.length > 0) {
      console.log('✅ Pedido encontrado con #:', dataWithHash[0].id)
      return dataWithHash[0]
    }
    
    return null
  }
  
  const pedido = data[0]
  console.log('✅ Pedido encontrado:', pedido.id, 'numero_pedido:', pedido.numero_pedido, 'Items:', pedido.items?.length || 0)
  
  return pedido
}

// Función para reponer el stock de un pedido cancelado
async function reponerStockPedido(pedidoId: string) {
  console.log('📦 Reponiendo stock para pedido:', pedidoId)
  
  // Obtener todos los items del pedido
  const { data: items, error: itemsError } = await supabase
    .from('pedido_items')
    .select('producto_id, variante_id, cantidad')
    .eq('pedido_id', pedidoId)
  
  if (itemsError) {
    console.error('❌ Error obteniendo items del pedido:', itemsError)
    throw itemsError
  }
  
  if (!items || items.length === 0) {
    console.log('⚠️ No hay items en el pedido para reponer stock')
    return
  }
  
  // Reponer stock para cada item
  for (const item of items) {
    if (item.variante_id) {
      // Si tiene variante, reponer stock de la variante
      const { data: variante, error: varianteError } = await supabase
        .from('producto_variantes')
        .select('stock')
        .eq('id', item.variante_id)
        .single()
      
      if (varianteError) {
        console.error(`❌ Error obteniendo variante ${item.variante_id}:`, varianteError)
        continue
      }
      
      const nuevoStock = (variante.stock || 0) + (item.cantidad || 0)
      
      const { error: updateError } = await supabase
        .from('producto_variantes')
        .update({ stock: nuevoStock })
        .eq('id', item.variante_id)
      
      if (updateError) {
        console.error(`❌ Error reponiendo stock de variante ${item.variante_id}:`, updateError)
      } else {
        console.log(`✅ Stock repuesto para variante ${item.variante_id}: ${variante.stock} -> ${nuevoStock}`)
      }
    } else if (item.producto_id) {
      // Si no tiene variante, reponer stock del producto
      const { data: producto, error: productoError } = await supabase
        .from('productos')
        .select('stock')
        .eq('id', item.producto_id)
        .single()
      
      if (productoError) {
        console.error(`❌ Error obteniendo producto ${item.producto_id}:`, productoError)
        continue
      }
      
      const nuevoStock = (producto.stock || 0) + (item.cantidad || 0)
      
      const { error: updateError } = await supabase
        .from('productos')
        .update({ stock: nuevoStock })
        .eq('id', item.producto_id)
      
      if (updateError) {
        console.error(`❌ Error reponiendo stock de producto ${item.producto_id}:`, updateError)
      } else {
        console.log(`✅ Stock repuesto para producto ${item.producto_id}: ${producto.stock} -> ${nuevoStock}`)
      }
    }
  }
  
  console.log('✅ Stock repuesto para todos los items del pedido')
}

export async function actualizarEstadoPedido(
  pedidoId: string,
  nuevoEstado: 'Pendiente' | 'Procesando' | 'Enviado' | 'Completado' | 'Cancelado',
  descripcion?: string
) {
  console.log('🔄 actualizarEstadoPedido llamado:', { pedidoId, nuevoEstado })
  
  // Primero obtener el pedido para obtener su ID real
  const pedidoData = await getPedidoById(pedidoId)
  
  if (!pedidoData) {
    const error = new Error(`No se encontró el pedido con ID: ${pedidoId}`)
    console.error('❌ Error:', error.message)
    throw error
  }
  
  // Si el pedido se está cancelando y antes no estaba cancelado, reponer stock
  const estadoAnterior = pedidoData.estado
  const estaCancelando = nuevoEstado === 'Cancelado' && estadoAnterior !== 'Cancelado'
  
  // Actualizar usando el ID real del pedido
  const { data, error } = await supabase
    .from('pedidos')
    .update({
      estado: nuevoEstado,
      updated_at: new Date().toISOString()
    })
    .eq('id', pedidoData.id)
    .select()
    .single()
  
  if (error) {
    console.error('❌ Error actualizando estado del pedido:', error)
    throw error
  }
  
  // Si se está cancelando, reponer el stock
  if (estaCancelando) {
    try {
      await reponerStockPedido(pedidoData.id)
    } catch (stockError) {
      console.error('⚠️ Error reponiendo stock al cancelar pedido:', stockError)
      // No lanzar error, solo loguear, para que el cambio de estado se complete
    }
  }
  
  // Si se proporciona una descripción personalizada, crear entrada en historial
  if (descripcion) {
    const { error: historialError } = await supabase
      .from('pedido_historial')
      .insert({
        pedido_id: data.id,
        estado: nuevoEstado,
        descripcion: descripcion,
        completado: nuevoEstado === 'Completado' || nuevoEstado === 'Cancelado'
      })
    
    if (historialError) {
      console.error('⚠️ Error creando entrada en historial:', historialError)
      // No lanzar error, solo loguear, ya que el trigger también crea la entrada
    }
  }
  
  console.log('✅ Estado del pedido actualizado exitosamente')
  return data
}

// ============================================
// QUERIES PARA CLIENTES
// ============================================

export async function crearCliente(cliente: {
  nombre: string
  apellido?: string
  email?: string
  telefono?: string
  whatsapp?: string
  departamento?: string
}) {
  const { data, error } = await supabase
    .from('clientes')
    .insert(cliente)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Busca un cliente existente por email o teléfono, o crea uno nuevo si no existe
 * @returns El ID del cliente encontrado o creado, o null si no se puede crear
 */
export async function buscarOCrearCliente(cliente: {
  nombre: string
  apellido?: string
  email?: string
  telefono?: string
  whatsapp?: string
  departamento?: string
}): Promise<string | null> {
  // Validar que el nombre no esté vacío
  if (!cliente.nombre || !cliente.nombre.trim()) {
    console.warn('⚠️ No se puede crear cliente: nombre vacío')
    return null
  }
  
  // Validar que haya al menos email o teléfono (y que no estén vacíos)
  const tieneEmail = cliente.email && cliente.email.trim()
  const tieneTelefono = cliente.telefono && cliente.telefono.trim()
  
  if (!tieneEmail && !tieneTelefono) {
    console.warn('⚠️ No se puede crear cliente: falta email y teléfono')
    return null
  }

  // Buscar cliente existente por email o teléfono
  let clientesExistentes = null
  
  // Intentar buscar por email primero (si existe y no está vacío)
  if (tieneEmail) {
    const { data: dataPorEmail, error: errorEmail } = await supabase
      .from('clientes')
      .select('id')
      .eq('email', cliente.email!.trim())
      .limit(1)
    
    if (errorEmail) {
      console.warn('⚠️ Error buscando por email:', errorEmail)
    } else if (dataPorEmail && dataPorEmail.length > 0) {
      clientesExistentes = dataPorEmail
      console.log('✅ Cliente encontrado por email:', dataPorEmail[0].id)
    }
  }
  
  // Si no se encontró por email, buscar por teléfono
  if (!clientesExistentes && tieneTelefono) {
    const { data: dataPorTelefono, error: errorTelefono } = await supabase
      .from('clientes')
      .select('id')
      .eq('telefono', cliente.telefono!.trim())
      .limit(1)
    
    if (errorTelefono) {
      console.warn('⚠️ Error buscando por teléfono:', errorTelefono)
    } else if (dataPorTelefono && dataPorTelefono.length > 0) {
      clientesExistentes = dataPorTelefono
      console.log('✅ Cliente encontrado por teléfono:', dataPorTelefono[0].id)
    }
  }

  // Si se encontró un cliente existente, actualizar sus datos y retornar su ID
  if (clientesExistentes && clientesExistentes.length > 0) {
    const clienteId = clientesExistentes[0].id
    console.log('✅ Cliente existente encontrado:', clienteId)
    
    // Actualizar los datos del cliente con la información más reciente
    try {
      const datosActualizacion: any = {}
      
      // Actualizar nombre si se proporciona
      if (cliente.nombre && cliente.nombre.trim()) {
        datosActualizacion.nombre = cliente.nombre.trim()
      }
      
      // Actualizar apellido si se proporciona
      if (cliente.apellido && cliente.apellido.trim()) {
        datosActualizacion.apellido = cliente.apellido.trim()
      }
      
      // Actualizar email si se proporciona y no está vacío
      if (cliente.email && cliente.email.trim()) {
        datosActualizacion.email = cliente.email.trim()
      }
      
      // Actualizar teléfono si se proporciona
      if (cliente.telefono && cliente.telefono.trim()) {
        datosActualizacion.telefono = cliente.telefono.trim()
        datosActualizacion.whatsapp = (cliente.whatsapp && cliente.whatsapp.trim()) || cliente.telefono.trim()
      }
      
      // Actualizar departamento si se proporciona
      if (cliente.departamento && cliente.departamento.trim()) {
        datosActualizacion.departamento = cliente.departamento.trim()
      }
      
      // Solo actualizar si hay datos nuevos
      if (Object.keys(datosActualizacion).length > 0) {
        console.log('🔄 Actualizando datos del cliente existente:', datosActualizacion)
        await actualizarCliente(clienteId, datosActualizacion)
        console.log('✅ Datos del cliente actualizados')
      }
    } catch (error: any) {
      // Si hay error al actualizar, solo loguear pero continuar
      console.warn('⚠️ Error al actualizar datos del cliente:', error)
      // No lanzar error, solo retornar el ID del cliente
    }
    
    return clienteId
  }

  // Si no se encontró, crear nuevo cliente
  console.log('📝 Creando nuevo cliente...', { 
    nombre: cliente.nombre, 
    tieneEmail: !!cliente.email, 
    tieneTelefono: !!cliente.telefono,
    email: cliente.email,
    telefono: cliente.telefono
  })
  
  try {
    const datosCliente: any = {
      nombre: cliente.nombre
    }
    
    // Agregar teléfono solo si existe y no está vacío
    if (cliente.telefono && cliente.telefono.trim()) {
      datosCliente.telefono = cliente.telefono.trim()
      datosCliente.whatsapp = (cliente.whatsapp && cliente.whatsapp.trim()) || cliente.telefono.trim()
    }
    
    // Agregar campos opcionales solo si existen y no están vacíos
    if (cliente.apellido && cliente.apellido.trim()) {
      datosCliente.apellido = cliente.apellido.trim()
    }
    if (cliente.email && cliente.email.trim()) {
      datosCliente.email = cliente.email.trim()
    }
    if (cliente.departamento && cliente.departamento.trim()) {
      datosCliente.departamento = cliente.departamento.trim()
    }
    
    console.log('📤 Datos del cliente a insertar:', datosCliente)
    const nuevoCliente = await crearCliente(datosCliente)
    console.log('✅ Nuevo cliente creado:', nuevoCliente.id)
    return nuevoCliente.id
  } catch (error: any) {
    console.error('❌ Error detallado al crear cliente:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      error: error
    })
    // Si hay error al crear (ej: email duplicado), intentar buscar de nuevo
    console.warn('⚠️ Error al crear cliente, intentando buscar de nuevo:', error)
    
    // Intentar buscar por email si existe
    if (cliente.email) {
      const { data: clientePorEmail } = await supabase
        .from('clientes')
        .select('id')
        .eq('email', cliente.email)
        .limit(1)
        .single()
      
      if (clientePorEmail) {
        return clientePorEmail.id
      }
    }
    
    // Intentar buscar por teléfono si existe
    if (cliente.telefono) {
      const { data: clientePorTelefono } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefono', cliente.telefono)
        .limit(1)
        .single()
      
      if (clientePorTelefono) {
        return clientePorTelefono.id
      }
    }
    
    // Si no se pudo crear ni encontrar, retornar null
    console.error('❌ No se pudo crear ni encontrar el cliente')
    return null
  }
}

export async function getClientes(filters?: {
  search?: string
  tipo?: string
  limit?: number
  offset?: number
}) {
  let query = supabase
    .from('clientes')
    .select('*')

  if (filters?.search) {
    query = query.or(`nombre.ilike.%${filters.search}%,email.ilike.%${filters.search}%,telefono.ilike.%${filters.search}%,whatsapp.ilike.%${filters.search}%`)
  }

  if (filters?.tipo && filters.tipo !== 'Todos') {
    query = query.eq('tipo', filters.tipo)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset !== undefined && filters?.limit) {
    query = query.range(filters.offset, filters.offset + filters.limit - 1)
  }

  const { data, error } = await query.order('fecha_registro', { ascending: false })

  if (error) throw error
  return data
}

export async function getTotalClientes(filters?: {
  search?: string
  tipo?: string
}) {
  let query = supabase
    .from('clientes')
    .select('id', { count: 'exact', head: true })

  if (filters?.search) {
    query = query.or(`nombre.ilike.%${filters.search}%,email.ilike.%${filters.search}%,telefono.ilike.%${filters.search}%,whatsapp.ilike.%${filters.search}%`)
  }

  if (filters?.tipo && filters.tipo !== 'Todos') {
    query = query.eq('tipo', filters.tipo)
  }

  const { count, error } = await query

  if (error) throw error
  return count || 0
}

export async function actualizarCliente(
  id: string,
  cliente: {
    nombre?: string
    apellido?: string
    email?: string
    telefono?: string
    whatsapp?: string
    tipo?: 'Nuevo' | 'Recurrente' | 'VIP'
    departamento?: string
  }
) {
  const { data, error } = await supabase
    .from('clientes')
    .update(cliente)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function eliminarCliente(id: string) {
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================
// QUERIES PARA CONFIGURACIÓN DE TIENDA
// ============================================

export interface TiendaConfiguracion {
  nombre_tienda: string
  logo_url: string
}

/**
 * Obtiene la configuración de la tienda (logo y nombre)
 */
export async function getConfiguracionTienda(): Promise<TiendaConfiguracion> {
  // Valores por defecto
  const defaultConfig: TiendaConfiguracion = {
    nombre_tienda: 'SOLHANA',
    logo_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHmlv4XJYfCnAdJoCOc80W1E-Rp6Avl_qzcOyu5JEIOMyl5R5lOAJFvlCsOd04YxMwPITW7Z665iNAEU7VUyziqsvL898l9SCZ9GdcuQCdS6fTie_GEwX_ajcLtAWgskdsdIFubLTUvr9yAfYTnQjr6zohbNjj0nfJmI4ZtpHcPOf5ttU30DLVXl_6QdI6RWX1IaK05XfKHjP4-T0-3PagqUHenXltH6i9gHissl7x7k4j9XyZ1FX9NWF6trsfQ8_IdZ2Pa4xFmIu3'
  }

  try {
    // Buscar configuración existente
    const { data, error } = await supabase
      .from('tienda_configuracion')
      .select('*')
      .eq('clave', 'general')
      .single()

    if (error || !data) {
      // Si no existe, crear con valores por defecto
      const { data: newData, error: insertError } = await supabase
        .from('tienda_configuracion')
        .insert({
          clave: 'general',
          valor: defaultConfig,
          descripcion: 'Configuración general de la tienda (logo y nombre)'
        })
        .select()
        .single()

      if (insertError) {
        console.warn('⚠️ Error creando configuración por defecto:', insertError)
        return defaultConfig
      }

      return newData.valor as TiendaConfiguracion
    }

    return data.valor as TiendaConfiguracion
  } catch (error) {
    console.warn('⚠️ Error obteniendo configuración:', error)
    return defaultConfig
  }
}

/**
 * Actualiza la configuración de la tienda (logo y nombre)
 */
export async function actualizarConfiguracionTienda(config: Partial<TiendaConfiguracion>): Promise<TiendaConfiguracion> {
  // Obtener configuración actual
  const configActual = await getConfiguracionTienda()
  
  // Combinar con nueva configuración
  const nuevaConfig: TiendaConfiguracion = {
    nombre_tienda: config.nombre_tienda ?? configActual.nombre_tienda,
    logo_url: config.logo_url ?? configActual.logo_url
  }

  // Verificar si existe la configuración
  const { data: existingData, error: checkError } = await supabase
    .from('tienda_configuracion')
    .select('id')
    .eq('clave', 'general')
    .maybeSingle()

  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 es "no rows returned", que es normal si no existe
    console.error('❌ Error verificando configuración:', checkError)
    throw new Error(`Error verificando configuración: ${checkError.message || JSON.stringify(checkError)}`)
  }

  let data, error

  if (existingData) {
    // Actualizar existente
    console.log('🔄 Actualizando configuración existente...')
    const result = await supabase
      .from('tienda_configuracion')
      .update({
        valor: nuevaConfig,
        descripcion: 'Configuración general de la tienda (logo y nombre)',
        updated_at: new Date().toISOString()
      })
      .eq('clave', 'general')
      .select()
      .single()
    
    data = result.data
    error = result.error
  } else {
    // Insertar nuevo
    console.log('➕ Insertando nueva configuración...')
    const result = await supabase
      .from('tienda_configuracion')
      .insert({
        clave: 'general',
        valor: nuevaConfig,
        descripcion: 'Configuración general de la tienda (logo y nombre)',
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    data = result.data
    error = result.error
  }

  if (error) {
    console.error('❌ Error actualizando configuración:', {
      error,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    const errorMessage = error.message || error.details || error.hint || JSON.stringify(error)
    throw new Error(`Error al guardar la configuración: ${errorMessage}`)
  }

  if (!data) {
    throw new Error('No se pudo guardar la configuración: no se recibieron datos')
  }

  console.log('✅ Configuración guardada exitosamente')
  return data.valor as TiendaConfiguracion
}

// ============================================
// QUERIES PARA RESEÑAS
// ============================================

export async function getResenasProducto(productoId: string) {
  const { data, error } = await supabase
    .from('producto_resenas')
    .select('*')
    .eq('producto_id', productoId)
    .eq('estado', 'Aprobada')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function crearResena(resena: {
  producto_id: string
  cliente_id?: string
  nombre_cliente?: string
  email_cliente?: string
  calificacion: number
  titulo?: string
  comentario?: string
}) {
  const { data, error } = await supabase
    .from('producto_resenas')
    .insert(resena)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================
// QUERIES PARA MÉTODOS DE PAGO Y ENVÍO
// ============================================

export async function getMetodosPago() {
  const { data, error } = await supabase
    .from('metodos_pago')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true })

  if (error) throw error
  return data
}

export async function getMetodosEnvio() {
  const { data, error } = await supabase
    .from('metodos_envio')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true })

  if (error) throw error
  return data
}

export async function getCiudadesEnvio() {
  const { data, error } = await supabase
    .from('ciudades_envio')
    .select('*')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  if (error) throw error
  return data
}

// ============================================
// QUERIES PARA NEWSLETTER
// ============================================

export async function suscribirNewsletter(email: string, nombre?: string) {
  const { data, error } = await supabase
    .from('newsletter_suscripciones')
    .upsert({
      email,
      nombre,
      activo: true,
      confirmado: false
    }, {
      onConflict: 'email'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================
// QUERIES PARA PRODUCTOS RELACIONADOS
// ============================================

export async function getProductosRelacionados(productoId: string) {
  const { data, error } = await supabase
    .from('productos_relacionados')
    .select(`
      producto_relacionado_id,
      producto_relacionado:productos!productos_relacionados_producto_relacionado_id_fkey(*)
    `)
    .eq('producto_id', productoId)
    .order('orden', { ascending: true })
    .limit(4)

  if (error) throw error
  return data?.map(item => item.producto_relacionado)
}

// ============================================
// QUERIES PARA DASHBOARD
// ============================================

export async function getDashboardKPIs() {
  // Obtener ventas totales y pedidos
  const { data: pedidos, error: pedidosError } = await supabase
    .from('pedidos')
    .select('total, fecha_pedido')
    .neq('estado', 'Cancelado')

  if (pedidosError) throw pedidosError

  // Calcular ventas totales
  const ventasTotales = pedidos?.reduce((sum, p) => sum + (p.total || 0), 0) || 0

  // Contar pedidos
  const totalPedidos = pedidos?.length || 0

  // Obtener pedidos del mes anterior para comparación
  const ahora = new Date()
  const mesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
  const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

  const { data: pedidosMesAnterior } = await supabase
    .from('pedidos')
    .select('total')
    .neq('estado', 'Cancelado')
    .gte('fecha_pedido', mesAnterior.toISOString())
    .lt('fecha_pedido', inicioMesActual.toISOString())

  const ventasMesAnterior = pedidosMesAnterior?.reduce((sum, p) => sum + (p.total || 0), 0) || 0
  const pedidosMesAnteriorCount = pedidosMesAnterior?.length || 0

  // Calcular cambios porcentuales
  const cambioVentas = ventasMesAnterior > 0 
    ? ((ventasTotales - ventasMesAnterior) / ventasMesAnterior) * 100 
    : 0
  
  const cambioPedidos = pedidosMesAnteriorCount > 0
    ? ((totalPedidos - pedidosMesAnteriorCount) / pedidosMesAnteriorCount) * 100
    : 0

  // Calcular tasa de conversión: Cart-to-Order (Pedidos / Sesiones de carrito únicas)
  // Obtener sesiones de carrito únicas (mes actual)
  const { data: carritosActuales } = await supabase
    .from('carrito')
    .select('cliente_id, session_id, created_at')
    .gte('created_at', inicioMesActual.toISOString())

  // Contar sesiones únicas de carrito (cliente_id o session_id)
  const sesionesCarrito = new Set<string>()
  carritosActuales?.forEach(c => {
    if (c.cliente_id) {
      sesionesCarrito.add(`cliente_${c.cliente_id}`)
    } else if (c.session_id) {
      sesionesCarrito.add(`session_${c.session_id}`)
    }
  })
  const totalSesionesCarrito = sesionesCarrito.size

  // Calcular tasa de conversión actual
  const tasaConversion = totalSesionesCarrito > 0 
    ? (totalPedidos / totalSesionesCarrito) * 100 
    : 0

  // Obtener sesiones de carrito del mes anterior
  const { data: carritosAnteriores } = await supabase
    .from('carrito')
    .select('cliente_id, session_id, created_at')
    .gte('created_at', mesAnterior.toISOString())
    .lt('created_at', inicioMesActual.toISOString())

  const sesionesCarritoAnterior = new Set<string>()
  carritosAnteriores?.forEach(c => {
    if (c.cliente_id) {
      sesionesCarritoAnterior.add(`cliente_${c.cliente_id}`)
    } else if (c.session_id) {
      sesionesCarritoAnterior.add(`session_${c.session_id}`)
    }
  })
  const totalSesionesCarritoAnterior = sesionesCarritoAnterior.size

  // Calcular tasa de conversión del mes anterior
  const tasaConversionAnterior = totalSesionesCarritoAnterior > 0
    ? (pedidosMesAnteriorCount / totalSesionesCarritoAnterior) * 100
    : 0

  // Calcular cambio en tasa de conversión
  const cambioConversion = tasaConversionAnterior > 0
    ? tasaConversion - tasaConversionAnterior
    : 0

  // Calcular visitantes únicos (sesiones de carrito como proxy)
  const { data: todasSesiones } = await supabase
    .from('carrito')
    .select('cliente_id, session_id')
    .gte('created_at', inicioMesActual.toISOString())

  const visitantesUnicos = new Set<string>()
  todasSesiones?.forEach(c => {
    if (c.cliente_id) {
      visitantesUnicos.add(`cliente_${c.cliente_id}`)
    } else if (c.session_id) {
      visitantesUnicos.add(`session_${c.session_id}`)
    }
  })

  // Obtener visitantes del mes anterior
  const { data: sesionesAnteriores } = await supabase
    .from('carrito')
    .select('cliente_id, session_id')
    .gte('created_at', mesAnterior.toISOString())
    .lt('created_at', inicioMesActual.toISOString())

  const visitantesAnteriores = new Set<string>()
  sesionesAnteriores?.forEach(c => {
    if (c.cliente_id) {
      visitantesAnteriores.add(`cliente_${c.cliente_id}`)
    } else if (c.session_id) {
      visitantesAnteriores.add(`session_${c.session_id}`)
    }
  })

  const cambioVisitantes = visitantesAnteriores.size > 0
    ? ((visitantesUnicos.size - visitantesAnteriores.size) / visitantesAnteriores.size) * 100
    : 0

  return {
    ventasTotales,
    totalPedidos,
    cambioVentas,
    cambioPedidos,
    visitantesUnicos: visitantesUnicos.size,
    cambioVisitantes,
    tasaConversion,
    cambioConversion
  }
}

export async function getUltimosPedidos(limit: number = 5) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, numero_pedido, nombre_cliente, apellido_cliente, fecha_pedido, total, estado')
    .order('fecha_pedido', { ascending: false })
    .limit(limit)

  if (error) throw error

  return data?.map(pedido => ({
    id: pedido.numero_pedido || `#${pedido.id.slice(0, 8)}`,
    cliente: `${pedido.nombre_cliente || ''} ${pedido.apellido_cliente || ''}`.trim() || 'Cliente',
    fecha: new Date(pedido.fecha_pedido).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }),
    total: `Bs. ${pedido.total.toFixed(2)}`,
    estado: pedido.estado as 'Enviado' | 'Procesando' | 'Cancelado' | 'Pendiente' | 'Completado'
  })) || []
}

export async function getProductosMasVendidos(limit: number = 5) {
  try {
    // Intentar usar la vista primero
    const { data, error } = await supabase
      .from('productos_mas_vendidos')
      .select('*')
      .order('unidades_vendidas', { ascending: false })
      .limit(limit)

    if (error) {
      // Si la vista no existe, calcular desde pedido_items
      console.warn('Vista productos_mas_vendidos no disponible, calculando desde pedido_items:', error.message)
      
      // Primero intentar obtener pedidos completados o enviados (prioridad)
      let { data: pedidosData, error: pedidosError } = await supabase
        .from('pedidos')
        .select('id')
        .in('estado', ['Completado', 'Enviado'])

      if (pedidosError) throw pedidosError

      // Si no hay pedidos completados/enviados, intentar con todos los pedidos excepto cancelados
      if (!pedidosData || pedidosData.length === 0) {
        console.warn('No hay pedidos completados/enviados, buscando en todos los pedidos activos')
        const { data: todosPedidos, error: todosError } = await supabase
          .from('pedidos')
          .select('id')
          .neq('estado', 'Cancelado')

        if (todosError) throw todosError
        pedidosData = todosPedidos
      }

      // Si aún no hay pedidos, retornar array vacío
      if (!pedidosData || pedidosData.length === 0) {
        console.warn('No hay pedidos disponibles para calcular productos más vendidos')
        return []
      }

      const pedidosIds = pedidosData.map(p => p.id)

      // Obtener items de esos pedidos con imágenes y subtotal
      const { data: itemsData, error: itemsError } = await supabase
        .from('pedido_items')
        .select(`
          producto_id,
          cantidad,
          subtotal,
          producto:productos(
            id, 
            nombre, 
            sku,
            imagenes:producto_imagenes(url, es_principal, orden)
          )
        `)
        .in('pedido_id', pedidosIds)
        .limit(1000) // Limitar para no sobrecargar

      if (itemsError) throw itemsError

      // Si no hay items, retornar array vacío
      if (!itemsData || itemsData.length === 0) {
        console.warn('No hay items en los pedidos para calcular productos más vendidos')
        return []
      }

      // Agrupar por producto
      const productosMap: { [key: string]: { nombre: string, sku: string, total: number, totalAmount: number, imagen?: string } } = {}
      
      itemsData.forEach(item => {
        const producto = item.producto as any
        if (producto && producto.id) {
          const key = producto.id
          if (!productosMap[key]) {
            // Obtener imagen principal o primera imagen
            let imagen = '/api/placeholder/80/80'
            if (producto.imagenes && Array.isArray(producto.imagenes) && producto.imagenes.length > 0) {
              const imagenesOrdenadas = [...producto.imagenes].sort((a, b) => {
                if (a.es_principal && !b.es_principal) return -1
                if (!a.es_principal && b.es_principal) return 1
                return (a.orden || 0) - (b.orden || 0)
              })
              imagen = imagenesOrdenadas[0]?.url || imagen
            }
            
            productosMap[key] = {
              nombre: producto.nombre || 'Producto sin nombre',
              sku: producto.sku || 'N/A',
              total: 0,
              totalAmount: 0,
              imagen
            }
          }
          productosMap[key].total += item.cantidad || 0
          productosMap[key].totalAmount += parseFloat(item.subtotal || 0)
        }
      })

      // Convertir a array y ordenar por monto total (totalAmount)
      const productosArray = Object.values(productosMap)
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, limit)

      return productosArray.map(p => ({
        name: p.nombre,
        sku: p.sku,
        sold: p.total,
        totalAmount: p.totalAmount,
        image: p.imagen || '/api/placeholder/80/80'
      }))
    }

    // Si la vista existe y tiene datos, obtener imágenes
    if (data && data.length > 0) {
      const productosIds = data.map(p => p.id)
      
      // Obtener imágenes para estos productos
      const { data: imagenesData } = await supabase
        .from('producto_imagenes')
        .select('producto_id, url, es_principal, orden')
        .in('producto_id', productosIds)
      
      // Crear mapa de imágenes por producto
      const imagenesMap: { [key: string]: string } = {}
      if (imagenesData) {
        productosIds.forEach(productoId => {
          const imagenesProducto = imagenesData.filter(img => img.producto_id === productoId)
          if (imagenesProducto.length > 0) {
            const imagenesOrdenadas = [...imagenesProducto].sort((a, b) => {
              if (a.es_principal && !b.es_principal) return -1
              if (!a.es_principal && b.es_principal) return 1
              return (a.orden || 0) - (b.orden || 0)
            })
            imagenesMap[productoId] = imagenesOrdenadas[0].url
          }
        })
      }
      
      // Ordenar por ingresos_totales (monto total) en lugar de unidades_vendidas
      const productosOrdenados = [...data].sort((a, b) => {
        const ingresosA = parseFloat(a.ingresos_totales || 0)
        const ingresosB = parseFloat(b.ingresos_totales || 0)
        return ingresosB - ingresosA
      }).slice(0, limit)

      return productosOrdenados.map(producto => ({
        name: producto.nombre,
        sku: producto.sku,
        sold: producto.unidades_vendidas || 0,
        totalAmount: parseFloat(producto.ingresos_totales || 0),
        image: imagenesMap[producto.id] || '/api/placeholder/80/80'
      }))
    }

    // Si la vista existe pero no tiene datos, intentar calcular desde pedido_items
    console.warn('Vista productos_mas_vendidos existe pero está vacía, calculando desde pedido_items')
    
    // Obtener todos los pedidos excepto cancelados
    const { data: pedidosData, error: pedidosError } = await supabase
      .from('pedidos')
      .select('id')
      .neq('estado', 'Cancelado')

    if (pedidosError) throw pedidosError

    if (!pedidosData || pedidosData.length === 0) {
      return []
    }

    const pedidosIds = pedidosData.map(p => p.id)

    const { data: itemsData, error: itemsError } = await supabase
      .from('pedido_items')
      .select(`
        producto_id,
        cantidad,
        subtotal,
        producto:productos(
          id, 
          nombre, 
          sku,
          imagenes:producto_imagenes(url, es_principal, orden)
        )
      `)
      .in('pedido_id', pedidosIds)
      .limit(1000)

    if (itemsError) throw itemsError

    if (!itemsData || itemsData.length === 0) {
      return []
    }

    const productosMap: { [key: string]: { nombre: string, sku: string, total: number, totalAmount: number, imagen?: string } } = {}
    
    itemsData.forEach(item => {
      const producto = item.producto as any
      if (producto && producto.id) {
        const key = producto.id
        if (!productosMap[key]) {
          // Obtener imagen principal o primera imagen
          let imagen = '/api/placeholder/80/80'
          if (producto.imagenes && Array.isArray(producto.imagenes) && producto.imagenes.length > 0) {
            const imagenesOrdenadas = [...producto.imagenes].sort((a, b) => {
              if (a.es_principal && !b.es_principal) return -1
              if (!a.es_principal && b.es_principal) return 1
              return (a.orden || 0) - (b.orden || 0)
            })
            imagen = imagenesOrdenadas[0]?.url || imagen
          }
          
          productosMap[key] = {
            nombre: producto.nombre || 'Producto sin nombre',
            sku: producto.sku || 'N/A',
            total: 0,
            totalAmount: 0,
            imagen
          }
        }
        productosMap[key].total += item.cantidad || 0
        productosMap[key].totalAmount += parseFloat(item.subtotal || 0)
      }
    })

    const productosArray = Object.values(productosMap)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit)

    return productosArray.map(p => ({
      name: p.nombre,
      sku: p.sku,
      sold: p.total,
      totalAmount: p.totalAmount,
      image: p.imagen || '/api/placeholder/80/80'
    }))
  } catch (error: any) {
    console.error('Error en getProductosMasVendidos:', {
      message: error?.message,
      code: error?.code,
      details: error?.details
    })
    // En lugar de lanzar el error, retornar array vacío para que el componente pueda mostrar un mensaje
    return []
  }
}

export async function getProductosBajoStock(limit: number = 5, umbral: number = 10) {
  try {
    // Obtener productos activos con imágenes
    const { data, error } = await supabase
      .from('productos')
      .select(`
        id, 
        nombre, 
        sku, 
        stock,
        imagenes:producto_imagenes(url, es_principal, orden)
      `)
      .eq('estado', 'Activo')
      .order('stock', { ascending: true })
      .limit(50) // Obtener más para filtrar

    if (error) {
      console.error('Error en getProductosBajoStock:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      throw error
    }

    // Filtrar en memoria los que tienen stock menor al umbral
    const productosBajoStock = (data || [])
      .filter(producto => (producto.stock || 0) < umbral)
      .slice(0, limit)
      .map(producto => {
        // Obtener imagen principal o primera imagen
        let imagen = '/api/placeholder/80/80'
        if (producto.imagenes && Array.isArray(producto.imagenes) && producto.imagenes.length > 0) {
          const imagenesOrdenadas = [...producto.imagenes].sort((a, b) => {
            if (a.es_principal && !b.es_principal) return -1
            if (!a.es_principal && b.es_principal) return 1
            return (a.orden || 0) - (b.orden || 0)
          })
          imagen = imagenesOrdenadas[0]?.url || imagen
        }
        
        return {
        name: producto.nombre,
        sku: producto.sku,
        stock: producto.stock || 0,
          image: imagen
        }
      })

    return productosBajoStock
  } catch (error: any) {
    console.error('Error completo en getProductosBajoStock:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    })
    // Retornar array vacío en lugar de lanzar error para no romper la UI
    return []
  }
}

export async function getVentasPorPeriodo(
  periodo: 'Día' | 'Semana' | 'Mes' = 'Semana',
  fechaSeleccionada?: string
) {
  const ahora = new Date()
  let fechaInicio: Date
  let fechaFin: Date

  switch (periodo) {
    case 'Día':
      if (fechaSeleccionada) {
        // Usar la fecha seleccionada
        fechaInicio = new Date(fechaSeleccionada)
        fechaInicio.setHours(0, 0, 0, 0)
        fechaFin = new Date(fechaSeleccionada)
        fechaFin.setHours(23, 59, 59, 999)
      } else {
        // Por defecto, hoy
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
        fechaFin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999)
      }
      break
    case 'Semana':
      if (fechaSeleccionada) {
        // Calcular el inicio de la semana (lunes) de la fecha seleccionada
        const fecha = new Date(fechaSeleccionada)
        const diaSemana = fecha.getDay()
        const diff = fecha.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1) // Ajustar para que lunes sea 0
        fechaInicio = new Date(fecha.setDate(diff))
        fechaInicio.setHours(0, 0, 0, 0)
        fechaFin = new Date(fechaInicio)
        fechaFin.setDate(fechaFin.getDate() + 6)
        fechaFin.setHours(23, 59, 59, 999)
      } else {
        // Por defecto, últimos 7 días
      fechaInicio = new Date(ahora)
      fechaInicio.setDate(ahora.getDate() - 7)
        fechaFin = new Date(ahora)
      }
      break
    case 'Mes':
      if (fechaSeleccionada) {
        // Usar el mes de la fecha seleccionada
        const fecha = new Date(fechaSeleccionada)
        fechaInicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
        fechaFin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0, 23, 59, 59, 999)
      } else {
        // Por defecto, mes actual
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
        fechaFin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59, 999)
      }
      break
  }

  const { data, error } = await supabase
    .from('pedidos')
    .select('total, fecha_pedido')
    .gte('fecha_pedido', fechaInicio.toISOString())
    .lte('fecha_pedido', fechaFin.toISOString())
    .neq('estado', 'Cancelado')

  if (error) throw error

  // Agrupar según el período
  const ventasPorDia: { [key: string]: number } = {}
  
  if (periodo === 'Día') {
    // Para días, agrupar por hora
  data?.forEach(pedido => {
      const fecha = new Date(pedido.fecha_pedido)
      const hora = fecha.getHours()
      const clave = `${hora.toString().padStart(2, '0')}:00`
      ventasPorDia[clave] = (ventasPorDia[clave] || 0) + (pedido.total || 0)
    })
    // Asegurar que todas las horas del día estén presentes (0-23)
    for (let i = 0; i < 24; i++) {
      const clave = `${i.toString().padStart(2, '0')}:00`
      if (!ventasPorDia[clave]) {
        ventasPorDia[clave] = 0
      }
    }
  } else if (periodo === 'Semana') {
    // Para semanas, agrupar por día
    data?.forEach(pedido => {
      const fecha = new Date(pedido.fecha_pedido)
      const diaSemana = fecha.getDay()
      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      const clave = dias[diaSemana]
      ventasPorDia[clave] = (ventasPorDia[clave] || 0) + (pedido.total || 0)
    })
  } else {
    // Para meses, agrupar por día del mes
    data?.forEach(pedido => {
      const fecha = new Date(pedido.fecha_pedido)
      const clave = fecha.getDate().toString()
      ventasPorDia[clave] = (ventasPorDia[clave] || 0) + (pedido.total || 0)
  })
  }

  // Calcular total y cambio
  const total = data?.reduce((sum, p) => sum + (p.total || 0), 0) || 0

  // Obtener período anterior para comparación
  let fechaInicioAnterior: Date
  let fechaFinAnterior: Date
  
  if (periodo === 'Día') {
    fechaInicioAnterior = new Date(fechaInicio)
    fechaInicioAnterior.setDate(fechaInicioAnterior.getDate() - 1)
    fechaFinAnterior = new Date(fechaFin)
    fechaFinAnterior.setDate(fechaFinAnterior.getDate() - 1)
  } else if (periodo === 'Semana') {
    const diasSemana = 7
    fechaInicioAnterior = new Date(fechaInicio)
    fechaInicioAnterior.setDate(fechaInicioAnterior.getDate() - diasSemana)
    fechaFinAnterior = new Date(fechaInicio)
    fechaFinAnterior.setDate(fechaFinAnterior.getDate() - 1)
    fechaFinAnterior.setHours(23, 59, 59, 999)
  } else {
    fechaInicioAnterior = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth() - 1, 1)
    fechaFinAnterior = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), 0, 23, 59, 59, 999)
  }

  const { data: datosAnteriores } = await supabase
    .from('pedidos')
    .select('total')
    .gte('fecha_pedido', fechaInicioAnterior.toISOString())
    .lte('fecha_pedido', fechaFinAnterior.toISOString())
    .neq('estado', 'Cancelado')

  const totalAnterior = datosAnteriores?.reduce((sum, p) => sum + (p.total || 0), 0) || 0
  const cambio = totalAnterior > 0 ? ((total - totalAnterior) / totalAnterior) * 100 : 0

  return {
    total,
    cambio,
    ventasPorDia,
    periodo,
    fechaInicio: fechaInicio.toISOString(),
    fechaFin: fechaFin.toISOString()
  }
}

// ============================================
// QUERIES PARA REPORTES Y ANALÍTICAS
// ============================================

export async function getReportesKPIs(periodo: 'Hoy' | 'Últimos 7 días' | 'Este Mes' | 'Rango Personalizado' = 'Este Mes') {
  const ahora = new Date()
  let fechaInicio: Date

  switch (periodo) {
    case 'Hoy':
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
      break
    case 'Últimos 7 días':
      fechaInicio = new Date(ahora)
      fechaInicio.setDate(ahora.getDate() - 7)
      break
    case 'Este Mes':
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      break
    case 'Rango Personalizado':
      // Por defecto usar "Este Mes" si es rango personalizado sin fechas definidas
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      break
    default:
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  }

  // Obtener pedidos del período actual
  const { data: pedidosActuales, error: pedidosError } = await supabase
    .from('pedidos')
    .select('total, fecha_pedido')
    .gte('fecha_pedido', fechaInicio.toISOString())
    .neq('estado', 'Cancelado')

  if (pedidosError) throw pedidosError

  // Calcular ventas totales
  const ventasTotales = pedidosActuales?.reduce((sum, p) => sum + (p.total || 0), 0) || 0
  const totalPedidos = pedidosActuales?.length || 0

  // Calcular valor promedio de pedido
  const valorPromedioPedido = totalPedidos > 0 ? ventasTotales / totalPedidos : 0

  // Obtener período anterior para comparación
  const diasAtras = periodo === 'Hoy' ? 1 : periodo === 'Últimos 7 días' ? 7 : 30
  const fechaInicioAnterior = new Date(fechaInicio)
  fechaInicioAnterior.setDate(fechaInicioAnterior.getDate() - diasAtras)

  const { data: pedidosAnteriores } = await supabase
    .from('pedidos')
    .select('total')
    .gte('fecha_pedido', fechaInicioAnterior.toISOString())
    .lt('fecha_pedido', fechaInicio.toISOString())
    .neq('estado', 'Cancelado')

  const ventasAnteriores = pedidosAnteriores?.reduce((sum, p) => sum + (p.total || 0), 0) || 0
  const pedidosAnterioresCount = pedidosAnteriores?.length || 0
  const valorPromedioAnterior = pedidosAnterioresCount > 0 ? ventasAnteriores / pedidosAnterioresCount : 0

  // Calcular cambios porcentuales
  const cambioVentas = ventasAnteriores > 0 
    ? ((ventasTotales - ventasAnteriores) / ventasAnteriores) * 100 
    : 0
  
  const cambioPedidos = pedidosAnterioresCount > 0
    ? ((totalPedidos - pedidosAnterioresCount) / pedidosAnterioresCount) * 100
    : 0

  const cambioValorPromedio = valorPromedioAnterior > 0
    ? ((valorPromedioPedido - valorPromedioAnterior) / valorPromedioAnterior) * 100
    : 0

  // Calcular tasa de conversión: Cart-to-Order (Pedidos / Sesiones de carrito únicas)
  // Obtener sesiones de carrito únicas del período actual
  const { data: carritosActuales } = await supabase
    .from('carrito')
    .select('cliente_id, session_id, created_at')
    .gte('created_at', fechaInicio.toISOString())

  // Contar sesiones únicas de carrito (cliente_id o session_id)
  const sesionesCarrito = new Set<string>()
  carritosActuales?.forEach(c => {
    if (c.cliente_id) {
      sesionesCarrito.add(`cliente_${c.cliente_id}`)
    } else if (c.session_id) {
      sesionesCarrito.add(`session_${c.session_id}`)
    }
  })
  const totalSesionesCarrito = sesionesCarrito.size

  // Calcular tasa de conversión actual
  const tasaConversion = totalSesionesCarrito > 0 
    ? (totalPedidos / totalSesionesCarrito) * 100 
    : 0

  // Obtener sesiones de carrito del período anterior
  const { data: carritosAnteriores } = await supabase
    .from('carrito')
    .select('cliente_id, session_id, created_at')
    .gte('created_at', fechaInicioAnterior.toISOString())
    .lt('created_at', fechaInicio.toISOString())

  const sesionesCarritoAnterior = new Set<string>()
  carritosAnteriores?.forEach(c => {
    if (c.cliente_id) {
      sesionesCarritoAnterior.add(`cliente_${c.cliente_id}`)
    } else if (c.session_id) {
      sesionesCarritoAnterior.add(`session_${c.session_id}`)
    }
  })
  const totalSesionesCarritoAnterior = sesionesCarritoAnterior.size

  // Calcular tasa de conversión del período anterior
  const tasaConversionAnterior = totalSesionesCarritoAnterior > 0
    ? (pedidosAnterioresCount / totalSesionesCarritoAnterior) * 100
    : 0

  // Calcular cambio en tasa de conversión
  const cambioConversion = tasaConversionAnterior > 0
    ? tasaConversion - tasaConversionAnterior
    : 0

  return {
    ventasTotales,
    totalPedidos,
    valorPromedioPedido,
    cambioVentas,
    cambioPedidos,
    cambioValorPromedio,
    tasaConversion,
    cambioConversion
  }
}

export async function getVentasPorDia(periodo: 'Hoy' | 'Últimos 7 días' | 'Este Mes' | 'Rango Personalizado' = 'Este Mes') {
  const ahora = new Date()
  let fechaInicio: Date

  switch (periodo) {
    case 'Hoy':
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
      break
    case 'Últimos 7 días':
      fechaInicio = new Date(ahora)
      fechaInicio.setDate(ahora.getDate() - 7)
      break
    case 'Este Mes':
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      break
    case 'Rango Personalizado':
      // Por defecto usar "Este Mes" si es rango personalizado sin fechas definidas
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      break
    default:
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  }

  const { data, error } = await supabase
    .from('pedidos')
    .select('total, fecha_pedido')
    .gte('fecha_pedido', fechaInicio.toISOString())
    .neq('estado', 'Cancelado')
    .order('fecha_pedido', { ascending: true })

  if (error) throw error

  // Agrupar por día
  const ventasPorDia: Array<{ fecha: string, total: number }> = []
  const ventasMap: { [key: string]: number } = {}
  
  data?.forEach(pedido => {
    const fecha = new Date(pedido.fecha_pedido).toISOString().split('T')[0]
    ventasMap[fecha] = (ventasMap[fecha] || 0) + (pedido.total || 0)
  })

  // Convertir a array ordenado
  Object.keys(ventasMap).sort().forEach(fecha => {
    ventasPorDia.push({
      fecha,
      total: ventasMap[fecha]
    })
  })

  return ventasPorDia
}

export async function getProductosMasVendidosReporte(limit: number = 10) {
  try {
    // Intentar usar la vista primero
    const { data, error } = await supabase
      .from('productos_mas_vendidos')
      .select('*')
      .order('unidades_vendidas', { ascending: false })
      .limit(limit)

    if (error) {
      // Si la vista no existe, calcular desde pedido_items
      const { data: itemsData, error: itemsError } = await supabase
        .from('pedido_items')
        .select(`
          producto_id,
          cantidad,
          subtotal,
          producto:productos(id, nombre, sku)
        `)
        .limit(1000)

      if (itemsError) throw itemsError

      // Agrupar por producto
      const productosMap: { [key: string]: { nombre: string, sku: string, unidades: number, ingresos: number } } = {}
      
      itemsData?.forEach(item => {
        const producto = item.producto as any
        if (producto) {
          const key = producto.id
          if (!productosMap[key]) {
            productosMap[key] = {
              nombre: producto.nombre,
              sku: producto.sku,
              unidades: 0,
              ingresos: 0
            }
          }
          productosMap[key].unidades += item.cantidad || 0
          productosMap[key].ingresos += item.subtotal || 0
        }
      })

      // Convertir a array y ordenar
      const productosArray = Object.values(productosMap)
        .sort((a, b) => b.unidades - a.unidades)
        .slice(0, limit)

      return productosArray.map(p => ({
        sku: p.sku,
        nombre: p.nombre,
        unidades: p.unidades,
        ingresos: p.ingresos
      }))
    }

    return data?.map(producto => ({
      sku: producto.sku,
      nombre: producto.nombre,
      unidades: producto.unidades_vendidas || 0,
      ingresos: producto.ingresos_totales || 0
    })) || []
  } catch (error: any) {
    console.error('Error en getProductosMasVendidosReporte:', error)
    throw error
  }
}

export async function getVentasPorCategoria(periodo: 'Hoy' | 'Últimos 7 días' | 'Este Mes' | 'Rango Personalizado' = 'Este Mes') {
  const ahora = new Date()
  let fechaInicio: Date

  switch (periodo) {
    case 'Hoy':
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
      break
    case 'Últimos 7 días':
      fechaInicio = new Date(ahora)
      fechaInicio.setDate(ahora.getDate() - 7)
      break
    case 'Este Mes':
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      break
    case 'Rango Personalizado':
      // Por defecto usar "Este Mes" si es rango personalizado sin fechas definidas
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      break
    default:
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  }

  const { data, error } = await supabase
    .from('pedido_items')
    .select(`
      cantidad,
      subtotal,
      producto:productos(categoria_id, categoria:categorias(nombre))
    `)
    .gte('created_at', fechaInicio.toISOString())

  if (error) throw error

  // Agrupar por categoría
  const categoriasMap: { [key: string]: { nombre: string, unidades: number } } = {}
  
  data?.forEach(item => {
    const categoria = (item.producto as any)?.categoria
    const nombreCategoria = categoria?.nombre || 'Sin categoría'
    
    if (!categoriasMap[nombreCategoria]) {
      categoriasMap[nombreCategoria] = {
        nombre: nombreCategoria,
        unidades: 0
      }
    }
    categoriasMap[nombreCategoria].unidades += item.cantidad || 0
  })

  // Convertir a array y ordenar
  const categoriasArray = Object.values(categoriasMap)
    .sort((a, b) => b.unidades - a.unidades)

  const totalUnidades = categoriasArray.reduce((sum, c) => sum + c.unidades, 0)

  return categoriasArray.map(cat => ({
    nombre: cat.nombre,
    unidades: cat.unidades,
    porcentaje: totalUnidades > 0 ? (cat.unidades / totalUnidades) * 100 : 0
  }))
}

// ============================================
// QUERIES PARA DISEÑO DE PÁGINA
// ============================================

export async function getDisenoPagina() {
  const { data, error } = await supabase
    .from('diseno_pagina')
    .select('*')
    .order('orden', { ascending: true })

  if (error) throw error
  return data
}

export async function getBanners() {
  const { data, error } = await supabase
    .from('diseno_pagina')
    .select('*')
    .eq('tipo', 'banner')
    .order('orden', { ascending: true })

  if (error) throw error
  
  // Filtrar banners duplicados por seccion (mantener solo el más reciente)
  if (data && data.length > 0) {
    const bannersMap = new Map()
    data.forEach((banner: any) => {
      const key = banner.seccion
      if (!bannersMap.has(key) || new Date(banner.updated_at || banner.created_at) > new Date(bannersMap.get(key).updated_at || bannersMap.get(key).created_at)) {
        bannersMap.set(key, banner)
      }
    })
    return Array.from(bannersMap.values()).sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0))
  }
  
  return data
}

export async function getSecciones() {
  const { data, error } = await supabase
    .from('diseno_pagina')
    .select('*')
    .eq('tipo', 'seccion')
    .order('orden', { ascending: true })

  if (error) throw error
  return data
}

export async function guardarBanner(banner: {
  id?: string
  seccion: string
  configuracion: {
    imagen?: string | null
    titulo?: string
    subtitulo?: string
    textoBoton?: string
  }
  url_enlace?: string
  visible?: boolean
  orden?: number
}) {
  const bannerData = {
    seccion: banner.seccion,
    tipo: 'banner',
    configuracion: banner.configuracion,
    url_enlace: banner.url_enlace || null,
    visible: banner.visible !== undefined ? banner.visible : true,
    orden: banner.orden || 0
  }

  if (banner.id) {
    // Actualizar banner existente
    const { data, error } = await supabase
      .from('diseno_pagina')
      .update(bannerData)
      .eq('id', banner.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Crear nuevo banner
    const { data, error } = await supabase
      .from('diseno_pagina')
      .insert(bannerData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export async function guardarSeccion(seccion: {
  id?: string
  seccion: string
  configuracion: any
  visible?: boolean
  orden?: number
}) {
  const seccionData = {
    seccion: seccion.seccion,
    tipo: 'seccion',
    configuracion: seccion.configuracion,
    visible: seccion.visible !== undefined ? seccion.visible : true,
    orden: seccion.orden || 0
  }

  if (seccion.id) {
    // Actualizar sección existente
    const { data, error } = await supabase
      .from('diseno_pagina')
      .update(seccionData)
      .eq('id', seccion.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Crear nueva sección
    const { data, error } = await supabase
      .from('diseno_pagina')
      .insert(seccionData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export async function eliminarBanner(id: string) {
  const { error } = await supabase
    .from('diseno_pagina')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function actualizarOrdenBanners(banners: Array<{ id: string, orden: number }>) {
  // Actualizar el orden de múltiples banners
  const updates = banners.map(banner =>
    supabase
      .from('diseno_pagina')
      .update({ orden: banner.orden })
      .eq('id', banner.id)
  )

  const results = await Promise.all(updates)
  const errors = results.filter(r => r.error)
  
  if (errors.length > 0) {
    throw errors[0].error
  }
}

// ============================================
// QUERIES PARA CATEGORÍAS CON IMÁGENES
// ============================================

export async function getCategoriasConImagenes() {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('estado', 'Activo')
    .order('orden', { ascending: true })

  if (error) throw error
  return data
}

export async function actualizarCategoriaImagen(
  categoriaId: string,
  datos: {
    imagen_url?: string
    banner_imagen_url?: string
    banner_titulo?: string
    banner_descripcion?: string
  }
) {
  const { data, error } = await supabase
    .from('categorias')
    .update(datos)
    .eq('id', categoriaId)
    .select()
    .single()

  if (error) throw error
  return data
}


