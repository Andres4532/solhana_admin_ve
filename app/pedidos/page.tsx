'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getPedidos, getTotalPedidos } from '@/lib/supabase-queries'
import styles from './pedidos.module.css'

interface Order {
  id: string
  idReal?: string
  numeroPedido?: string
  cliente: string
  fecha: string
  total: string
  estado: 'Pendiente' | 'Procesando' | 'Enviado' | 'Completado' | 'Cancelado'
}

const getStatusClass = (estado: string) => {
  switch (estado) {
    case 'Pendiente':
      return styles.statusPendiente
    case 'Procesando':
      return styles.statusProcesando
    case 'Enviado':
      return styles.statusEnviado
    case 'Completado':
      return styles.statusCompletado
    case 'Cancelado':
      return styles.statusCancelado
    default:
      return styles.statusPendiente
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month}, ${year}`
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const itemsPerPage = 5

  // Cargar pedidos desde Supabase
  useEffect(() => {
    async function loadPedidos() {
      setLoading(true)
      try {
        const offset = (currentPage - 1) * itemsPerPage
        
        // Cargar pedidos con filtros
        const pedidosData = await getPedidos({
          estado: statusFilter,
          search: searchTerm || undefined,
          limit: itemsPerPage,
          offset: offset
        })

        // Cargar total para paginación
        const total = await getTotalPedidos({
          estado: statusFilter,
          search: searchTerm || undefined
        })

        // Convertir datos de Supabase al formato de la UI
        const formattedOrders: Order[] = (pedidosData || []).map(pedido => ({
          id: pedido.numero_pedido || `#${pedido.id.slice(0, 8)}`,
          idReal: pedido.id, // Guardar el ID real para el enlace
          numeroPedido: pedido.numero_pedido, // Guardar el numero_pedido
          cliente: `${pedido.nombre_cliente || ''} ${pedido.apellido_cliente || ''}`.trim() || 'Cliente',
          fecha: formatDate(pedido.fecha_pedido),
          total: `Bs. ${pedido.total.toFixed(2)}`,
          estado: pedido.estado as 'Pendiente' | 'Procesando' | 'Enviado' | 'Completado' | 'Cancelado'
        }))

        setOrders(formattedOrders)
        setTotalOrders(total)
      } catch (error) {
        console.error('Error cargando pedidos:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPedidos()
  }, [currentPage, statusFilter, searchTerm])

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchTerm])

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalOrders)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Pedidos</h1>
      </div>

      <div className={styles.filters}>
        <div className={styles.filtersGrid}>
          <div className={styles.searchContainer}>
            <label htmlFor="search" className={styles.searchLabel}>Buscar</label>
            <div className={styles.searchInputWrapper}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
              <input
                id="search"
                type="text"
                className={styles.searchInput}
                placeholder="Buscar por ID o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="status" className={styles.filterLabel}>Estado</label>
            <select
              id="status"
              className={styles.select}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>Todos</option>
              <option>Pendiente</option>
              <option>Procesando</option>
              <option>Enviado</option>
              <option>Completado</option>
              <option>Cancelado</option>
            </select>
          </div>

          <div className={styles.dateInputContainer}>
            <label htmlFor="date-range" className={styles.filterLabel}>Rango de Fechas</label>
            <div className={styles.dateInputWrapper}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>calendar_today</span>
              <input
                id="date-range"
                type="text"
                className={styles.dateInput}
                placeholder="Seleccionar rango"
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID Pedido</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th className={styles.actionsCell}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                    Cargando pedidos...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                    No hay pedidos
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  // Usar numero_pedido si existe, sino el ID real
                  // Remover el # si existe
                  let pedidoId = order.numeroPedido || order.idReal || order.id.replace('#', '')
                  // Asegurarse de que no tenga # al inicio
                  pedidoId = pedidoId.replace(/^#/, '')
                  
                  return (
                    <tr key={order.id}>
                      <td className={styles.id}>{order.id}</td>
                      <td className={styles.cliente}>{order.cliente}</td>
                      <td className={styles.date}>{order.fecha}</td>
                      <td className={styles.total}>{order.total}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusClass(order.estado)}`}>
                          {order.estado}
                        </span>
                      </td>
                      <td className={styles.actionsCell}>
                        <Link href={`/pedidos/${pedidoId}`}>
                          <button 
                            className={styles.actionsButton}
                            type="button"
                            aria-label="Ver detalles"
                          >
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className={styles.pagination}>
          <div className={styles.paginationInfo}>
            {loading ? (
              'Cargando...'
            ) : totalOrders > 0 ? (
              <>
                Mostrando <strong>{startIndex + 1}</strong>-<strong>{endIndex}</strong> de <strong>{totalOrders}</strong>
              </>
            ) : (
              'No hay pedidos'
            )}
          </div>
          <div className={styles.paginationControls}>
            <button
              className={styles.paginationButton}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              aria-label="Página anterior"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
            </button>
            <button
              className={styles.paginationButton}
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={endIndex >= totalOrders || loading}
              aria-label="Página siguiente"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

