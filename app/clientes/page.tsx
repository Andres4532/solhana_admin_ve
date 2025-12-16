'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getClientes, getTotalClientes, eliminarCliente } from '@/lib/supabase-queries'
import { showSuccess, showError, showConfirm } from '@/lib/swal'
import styles from './clientes.module.css'

interface Client {
  id: string
  nombre: string
  tipo: 'VIP' | 'Recurrente' | 'Nuevo'
  whatsapp: string
  departamento: string
  fechaRegistro: string
  pedidos: number
  totalGastado: string
}

const getTipoClass = (tipo: string) => {
  switch (tipo) {
    case 'VIP':
      return styles.tipoVIP
    case 'Recurrente':
      return styles.tipoRecurrente
    case 'Nuevo':
      return styles.tipoNuevo
    default:
      return styles.tipoNuevo
  }
}

export default function ClientesPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('Todos')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalClients, setTotalClients] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const itemsPerPage = 10

  // Función para recargar clientes
  const reloadClientes = async () => {
    setLoading(true)
    try {
      const offset = (currentPage - 1) * itemsPerPage
      
      const clientesData = await getClientes({
        search: searchTerm || undefined,
        tipo: filterType,
        limit: itemsPerPage,
        offset: offset
      })

      const total = await getTotalClientes({
        search: searchTerm || undefined,
        tipo: filterType
      })

      // Convertir datos de Supabase al formato de la UI
      const formattedClients: Client[] = (clientesData || []).map(cliente => ({
        id: cliente.id,
        nombre: `${cliente.nombre} ${cliente.apellido || ''}`.trim(),
        tipo: cliente.tipo as 'VIP' | 'Recurrente' | 'Nuevo',
        whatsapp: cliente.whatsapp || cliente.telefono || 'Sin número',
        departamento: (cliente as any).departamento || 'N/A',
        fechaRegistro: new Date(cliente.fecha_registro).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        pedidos: cliente.total_pedidos || 0,
        totalGastado: `Bs. ${(cliente.total_gastado || 0).toFixed(2)}`
      }))

      setClients(formattedClients)
      setTotalClients(total)
    } catch (error) {
      console.error('Error cargando clientes:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar clientes desde Supabase
  useEffect(() => {
    reloadClientes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, filterType])

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterType])

  // Función para ver cliente
  const handleView = (id: string) => {
    // TODO: Implementar página de detalle de cliente
    router.push(`/clientes/${id}`)
  }

  // Función para editar cliente
  const handleEdit = (id: string) => {
    router.push(`/clientes/editar/${id}`)
  }

  // Función para eliminar cliente
  const handleDelete = async (id: string, nombre: string) => {
    const result = await showConfirm(
      '¿Eliminar cliente?',
      `¿Estás seguro de que deseas eliminar el cliente "${nombre}"? Esta acción no se puede deshacer.`,
      'Sí, eliminar',
      'Cancelar'
    )

    if (!result.isConfirmed) {
      return
    }

    setDeletingId(id)
    try {
      await eliminarCliente(id)
      await showSuccess('Cliente eliminado', 'El cliente ha sido eliminado exitosamente')
      await reloadClientes()
    } catch (error: any) {
      console.error('Error eliminando cliente:', error)
      await showError('Error al eliminar', error?.message || 'Error desconocido al eliminar el cliente')
    } finally {
      setDeletingId(null)
    }
  }

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalClients)
  const totalPages = Math.ceil(totalClients / itemsPerPage)
  
  const pagesToShow = []
  const maxPagesToShow = 7
  
  if (totalPages <= maxPagesToShow) {
    for (let i = 1; i <= totalPages; i++) {
      pagesToShow.push(i)
    }
  } else {
    pagesToShow.push(1, 2, 3)
    if (currentPage > 4 && currentPage < totalPages - 2) {
      pagesToShow.push('...', currentPage - 1, currentPage, currentPage + 1, '...')
    } else if (currentPage <= 4) {
      pagesToShow.push(4, 5, '...')
    } else {
      pagesToShow.push('...', totalPages - 2, totalPages - 1)
    }
    pagesToShow.push(totalPages - 1, totalPages)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestión de Clientes</h1>
          <p className={styles.subtitle}>
            Busca, filtra y gestiona toda la información de tus clientes en un solo lugar.
          </p>
        </div>
      </div>

      <div className={styles.searchAndFilters}>
        <div className={styles.searchContainer}>
          <label className={styles.searchWrapper}>
            <div className={styles.searchIconWrapper}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
            </div>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
        </div>
        <div className={styles.filters}>
          <button
            className={`${styles.filterButton} ${filterType === 'Todos' ? styles.active : ''}`}
            onClick={() => setFilterType('Todos')}
          >
            Todos
          </button>
          <button
            className={`${styles.filterButton} ${filterType === 'Nuevo' ? styles.active : ''}`}
            onClick={() => setFilterType('Nuevo')}
          >
            Nuevo
          </button>
          <button
            className={`${styles.filterButton} ${filterType === 'Recurrente' ? styles.active : ''}`}
            onClick={() => setFilterType('Recurrente')}
          >
            Recurrente
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Número de WhatsApp</th>
                <th>Departamento</th>
                <th>Fecha de Registro</th>
                <th>Historial de Compras</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                    Cargando clientes...
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                    No hay clientes
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div className={styles.clientInfo}>
                        <div className={styles.avatar}>
                          {client.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className={styles.clientName}>{client.nombre}</div>
                          <span className={`${styles.tipoBadge} ${getTipoClass(client.tipo)}`}>
                            {client.tipo}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className={styles.whatsapp}>{client.whatsapp}</td>
                    <td className={styles.ciudad}>{client.departamento}</td>
                    <td className={styles.fecha}>{client.fechaRegistro}</td>
                    <td>
                      <div className={styles.purchaseHistory}>
                        <div>{client.pedidos} pedidos</div>
                        <div className={styles.totalSpent}>{client.totalGastado} gastados</div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button 
                          className={styles.actionButton} 
                          title="Ver"
                          onClick={() => handleView(client.id)}
                          disabled={loading || deletingId === client.id}
                        >
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                        <button 
                          className={styles.actionButton} 
                          title="Editar"
                          onClick={() => handleEdit(client.id)}
                          disabled={loading || deletingId === client.id}
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button 
                          className={`${styles.actionButton} ${styles.delete}`}
                          title="Eliminar"
                          onClick={() => handleDelete(client.id, client.nombre)}
                          disabled={loading || deletingId === client.id}
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
        <div className={styles.pagination}>
          <div className={styles.paginationInfo}>
            {loading ? (
              'Cargando...'
            ) : totalClients > 0 ? (
              <>
                Mostrando <strong>{startIndex + 1}</strong> a <strong>{endIndex}</strong> de <strong>{totalClients}</strong> resultados
              </>
            ) : (
              'No hay clientes'
            )}
          </div>
          <div className={styles.paginationControls}>
            <button
              className={styles.paginationButton}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              aria-label="Anterior"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
            </button>
            {pagesToShow.map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className={styles.paginationEllipsis}>...</span>
              ) : (
                <button
                  key={page}
                  className={`${styles.paginationButton} ${currentPage === page ? styles.active : ''}`}
                  onClick={() => setCurrentPage(page as number)}
                  disabled={loading}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </button>
              )
            ))}
            <button
              className={styles.paginationButton}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
              aria-label="Siguiente"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
