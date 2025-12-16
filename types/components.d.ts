// Declaraciones de tipos para componentes
declare module '@/components/KPICard' {
  import { ComponentType } from 'react'
  
  interface KPICardProps {
    title: string
    value: string
    change: string
    isPositive: boolean
  }
  
  const KPICard: ComponentType<KPICardProps>
  export default KPICard
}

declare module '@/components/Header' {
  import { ComponentType } from 'react'
  const Header: ComponentType
  export default Header
}

declare module '@/components/OrdersTable' {
  import { ComponentType } from 'react'
  const OrdersTable: ComponentType
  export default OrdersTable
}

declare module '@/components/TopProducts' {
  import { ComponentType } from 'react'
  const TopProducts: ComponentType
  export default TopProducts
}

declare module '@/components/SalesChart' {
  import { ComponentType } from 'react'
  const SalesChart: ComponentType
  export default SalesChart
}

declare module '@/components/LowStockProducts' {
  import { ComponentType } from 'react'
  const LowStockProducts: ComponentType
  export default LowStockProducts
}

