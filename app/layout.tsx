import type { Metadata } from 'next'
import Sidebar from '@/components/Sidebar'
import FontLoader from '@/components/FontLoader'
import './globals.css'
import styles from './layout.module.css'

export const metadata: Metadata = {
  title: 'SOLHANA - Panel de Administración',
  description: 'Panel de administración para tienda de ropa',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <FontLoader />
        <div className={styles.container}>
          <Sidebar />
          <main className={styles.main}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
