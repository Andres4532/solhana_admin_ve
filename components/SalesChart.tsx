'use client'

import { useState, useEffect } from 'react'
import { getVentasPorPeriodo } from '@/lib/supabase-queries'
import styles from './SalesChart.module.css'

const timeframes: ('Día' | 'Semana' | 'Mes')[] = ['Día', 'Semana', 'Mes']

export default function SalesChart() {
  const [activeTimeframe, setActiveTimeframe] = useState<'Día' | 'Semana' | 'Mes'>('Semana')
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>('')
  const [ventas, setVentas] = useState({ total: 0, cambio: 0, ventasPorDia: {} as { [key: string]: number } })
  const [loading, setLoading] = useState(true)

  // Inicializar fecha seleccionada con la fecha actual
  useEffect(() => {
    const hoy = new Date()
    const fechaStr = hoy.toISOString().split('T')[0]
    setFechaSeleccionada(fechaStr)
  }, [])

  useEffect(() => {
    async function loadVentas() {
      try {
        setLoading(true)
        const data = await getVentasPorPeriodo(activeTimeframe, fechaSeleccionada)
        setVentas(data)
      } catch (error) {
        console.error('Error cargando ventas:', error)
      } finally {
        setLoading(false)
      }
    }
    if (fechaSeleccionada) {
    loadVentas()
    }
  }, [activeTimeframe, fechaSeleccionada])

  // Generar datos para el gráfico ordenados
  const generateChartPath = () => {
    let clavesOrdenadas: string[] = []
    
    if (activeTimeframe === 'Día') {
      // Para días, ordenar por hora (00:00 a 23:00)
      clavesOrdenadas = Object.keys(ventas.ventasPorDia).sort((a, b) => {
        const horaA = parseInt(a.split(':')[0])
        const horaB = parseInt(b.split(':')[0])
        return horaA - horaB
      })
    } else if (activeTimeframe === 'Semana') {
      // Para semanas, ordenar por día de la semana
      const ordenDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      clavesOrdenadas = ordenDias.filter(dia => ventas.ventasPorDia.hasOwnProperty(dia))
    } else {
      // Para meses, ordenar por número de día
      clavesOrdenadas = Object.keys(ventas.ventasPorDia).sort((a, b) => parseInt(a) - parseInt(b))
    }

    const valores = clavesOrdenadas.map(clave => ventas.ventasPorDia[clave] || 0)
    
    if (valores.length === 0 || valores.every(v => v === 0)) {
      // Datos por defecto si no hay datos (línea plana)
      const puntos = activeTimeframe === 'Día' ? 24 : activeTimeframe === 'Semana' ? 7 : 30
      return `M 0 109 ${Array(puntos - 1).fill(0).map((_, i) => `L ${((i + 1) / (puntos - 1)) * 478} 109`).join(' ')}`
    }

    const maxValue = Math.max(...valores, 1)
    const puntos = valores.length
    const ancho = 478
    const alto = 150
    const padding = 1

    const path = valores.map((valor, index) => {
      const x = puntos > 1 ? (index / (puntos - 1)) * (ancho - padding * 2) + padding : ancho / 2
      const y = alto - (valor / maxValue) * (alto - padding * 2) - padding
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')

    return path
  }

  // Generar etiquetas según el período
  const generateLabels = () => {
    if (activeTimeframe === 'Día') {
      // Mostrar horas cada 4 horas: 00, 04, 08, 12, 16, 20, 24
      return ['00', '04', '08', '12', '16', '20', '24']
    } else if (activeTimeframe === 'Semana') {
      // Siempre mostrar los 7 días de la semana
      return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    } else {
      // Para meses, mostrar días distribuidos: 1, 8, 15, 22, 30
      // Si hay datos, usar los días reales, si no, usar días estándar
      const dias = Object.keys(ventas.ventasPorDia).map(d => parseInt(d)).sort((a, b) => a - b)
      if (dias.length === 0) {
        return ['1', '8', '15', '22', '30']
      }
      // Calcular distribución de 5 puntos
      const primerDia = Math.max(1, dias[0])
      const ultimoDia = Math.min(31, dias[dias.length - 1])
      const rango = ultimoDia - primerDia
      const paso = rango / 4
      const labels = []
      for (let i = 0; i < 5; i++) {
        const dia = Math.round(primerDia + (paso * i))
        labels.push(Math.min(31, Math.max(1, dia)).toString())
      }
      return labels
    }
  }

  const formatCurrency = (value: number) => {
    return `Bs. ${value.toFixed(2)}`
  }

  const getPeriodoTexto = () => {
    if (activeTimeframe === 'Día') {
      if (fechaSeleccionada) {
        const fecha = new Date(fechaSeleccionada)
        const hoy = new Date()
        const esHoy = fecha.toDateString() === hoy.toDateString()
        return esHoy ? 'hoy' : `el ${fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`
      }
      return 'hoy'
    } else if (activeTimeframe === 'Semana') {
      return 'esta semana'
    } else {
      return 'este mes'
    }
  }

  const getDateInputType = () => {
    // Usar 'date' para todos, ya que week y month no tienen buen soporte en todos los navegadores
    return 'date'
  }

  const handleFechaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value
    if (activeTimeframe === 'Día') {
      setFechaSeleccionada(valor)
    } else if (activeTimeframe === 'Semana') {
      // Para semana, usar la fecha seleccionada como referencia y calcular el lunes de esa semana
      const fecha = new Date(valor)
      const diaSemana = fecha.getDay()
      const diff = fecha.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1) // Ajustar al lunes
      fecha.setDate(diff)
      setFechaSeleccionada(fecha.toISOString().split('T')[0])
    } else {
      // Para mes, usar el primer día del mes de la fecha seleccionada
      const fecha = new Date(valor)
      fecha.setDate(1)
      setFechaSeleccionada(fecha.toISOString().split('T')[0])
    }
  }

  const getDateInputValue = () => {
    if (!fechaSeleccionada) {
      const hoy = new Date()
      return hoy.toISOString().split('T')[0]
    }
    // Siempre devolver la fecha en formato date (YYYY-MM-DD)
    return fechaSeleccionada
  }

  const getDateInputPlaceholder = () => {
    if (activeTimeframe === 'Día') {
      return 'Seleccionar día'
    } else if (activeTimeframe === 'Semana') {
      return 'Seleccionar semana (elige cualquier día)'
    } else {
      return 'Seleccionar mes (elige cualquier día)'
    }
  }

  const labels = generateLabels()

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div className={styles.headerTop}>
            <h2 className={styles.title}>Resumen de Ventas</h2>
            <div className={styles.controls}>
              {timeframes.map((timeframe) => (
                <button
                  key={timeframe}
                  className={`${styles.button} ${activeTimeframe === timeframe ? styles.active : ''}`}
                  onClick={() => setActiveTimeframe(timeframe)}
                >
                  {timeframe}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.dateSelector}>
            <label className={styles.dateLabel}>
              {activeTimeframe === 'Día' ? 'Fecha:' : activeTimeframe === 'Semana' ? 'Semana:' : 'Mes:'}
            </label>
            <input
              type={getDateInputType()}
              value={getDateInputValue()}
              onChange={handleFechaChange}
              className={styles.dateInput}
              placeholder={getDateInputPlaceholder()}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className={styles.valueContainer}>
            <div className={styles.value}>
              {loading ? 'Cargando...' : formatCurrency(ventas.total)}
            </div>
            <div className={styles.change}>
              {loading ? '' : `${ventas.cambio >= 0 ? '+' : ''}${ventas.cambio.toFixed(1)}% vs ${activeTimeframe === 'Día' ? 'ayer' : activeTimeframe === 'Semana' ? 'semana anterior' : 'mes anterior'}`}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.chart}>
        <div className={styles.chartArea}>
          <svg viewBox="0 0 478 150" preserveAspectRatio="none" className={styles.svg} style={{ width: '100%', height: '100%' }}>
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#137fec" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#137fec" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`${generateChartPath()} L 478 150 L 0 150 Z`}
              fill="url(#gradient)"
            />
            <path
              d={generateChartPath()}
              fill="none"
              stroke="#137fec"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className={styles.labels}>
          {labels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

