'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getConfiguracionTienda } from '@/lib/supabase-queries'
import styles from './Sidebar.module.css'

interface NavItem {
  name: string
  href: string
  icon: string
}

const navItems: NavItem[] = [
  { name: 'Panel Principal', href: '/', icon: 'dashboard' },
  { name: 'Pedidos', href: '/pedidos', icon: 'shopping_cart' },
  { name: 'Productos', href: '/productos', icon: 'inventory_2' },
  { name: 'Clientes', href: '/clientes', icon: 'group' },
  { name: 'Analíticas', href: '/analiticas', icon: 'bar_chart' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [configuracion, setConfiguracion] = useState({
    nombre_tienda: 'SOLHANA',
    logo_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHmlv4XJYfCnAdJoCOc80W1E-Rp6Avl_qzcOyu5JEIOMyl5R5lOAJFvlCsOd04YxMwPITW7Z665iNAEU7VUyziqsvL898l9SCZ9GdcuQCdS6fTie_GEwX_ajcLtAWgskdsdIFubLTUvr9yAfYTnQjr6zohbNjj0nfJmI4ZtpHcPOf5ttU30DLVXl_6QdI6RWX1IaK05XfKHjP4-T0-3PagqUHenXltH6i9gHissl7x7k4j9XyZ1FX9NWF6trsfQ8_IdZ2Pa4xFmIu3'
  })

  useEffect(() => {
    async function loadConfiguracion() {
      try {
        const config = await getConfiguracionTienda()
        setConfiguracion(config)
      } catch (error) {
        console.error('Error cargando configuración:', error)
      }
    }
    loadConfiguracion()
  }, [])

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <div 
            className={styles.logoIcon}
            style={{
              backgroundImage: configuracion.logo_url ? `url(${configuracion.logo_url})` : undefined
            }}
          ></div>
          <div>
            <h1 className={styles.logoTitle}>{configuracion.nombre_tienda}</h1>
            <p className={styles.logoSubtitle}>Panel de Administración</p>
          </div>
        </div>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
          >
            <span className={`material-symbols-outlined ${pathname === item.href ? 'fill' : ''}`}>
              {item.icon}
            </span>
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.footer}>
        <Link 
          href="/diseno" 
          className={styles.viewStoreButton}
        >
          Ver tienda
        </Link>
        <div className={styles.footerLinks}>
          <Link href="/configuracion" className={styles.navItem}>
            <span className="material-symbols-outlined">settings</span>
            <span>Configuración</span>
          </Link>
        </div>
      </div>
    </aside>
  )
}

