'use client'

import type { ReactNode } from 'next'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import './globals.css'
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Server, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  LogOut
} from 'lucide-react'

const navigation = [
  { name: 'Ana Sayfa', href: '/', icon: Home },
  { name: 'Siparişler', href: '/orders', icon: ShoppingCart },
  { name: 'Ürünler', href: '/products', icon: Package },
  { name: 'Ürün Yönetimi', href: '/product-management', icon: Package },
  { name: 'Distribütörler', href: '/providers', icon: Server },
  { name: 'Kanallar', href: '/channels', icon: Users },
  { name: 'Raporlar', href: '/reports', icon: TrendingUp },
  { name: 'Stok Uyarıları', href: '/stock-alerts', icon: AlertTriangle },
  { name: 'Fazlalık Kodlar', href: '/excess-codes', icon: AlertTriangle },
  { name: 'Sistem Sağlığı', href: '/system-health', icon: Server },
]

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  
  // Show layout only on /products path, not on other directories
  const showLayout = pathname === '/products' || pathname?.startsWith('/products/')

  if (!showLayout) {
    return (
      <html lang="tr">
        <body>{children}</body>
      </html>
    )
  }

  const currentPage = navigation.find(item => item.href === pathname)

  return (
    <html lang="tr">
      <body style={{ margin: 0, padding: 0 }}>
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8F9FC' }}>
          {/* Sidebar */}
          <div style={{ 
            width: '256px', 
            backgroundColor: '#FFFFFF', 
            borderRight: '1px solid #E5E7EB',
            position: 'fixed',
            height: '100vh',
            overflowY: 'auto',
            zIndex: 10,
            left: 0,
            top: 0
          }}>
            {/* Logo */}
            <div style={{ padding: '24px', borderBottom: '1px solid #E5E7EB' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                Omega Digital
              </h1>
              <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', margin: 0 }}>
                CMS v1.0
              </p>
            </div>
            
            {/* Navigation */}
            <nav style={{ padding: '16px' }}>
              {navigation.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <div key={item.name} style={{ marginBottom: '4px' }}>
                    <Link
                      href={item.href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: isActive ? '#FFFFFF' : '#6B7280',
                        backgroundColor: isActive ? '#E94560' : 'transparent',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = '#F3F4F6'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                    >
                      <Icon size={18} />
                      {item.name}
                    </Link>
                  </div>
                )
              })}
            </nav>
          </div>
          
          {/* Main Content */}
          <div style={{ flex: 1, marginLeft: '256px', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{ 
              backgroundColor: '#FFFFFF', 
              borderBottom: '1px solid #E5E7EB',
              padding: '16px 24px',
              position: 'sticky',
              top: 0,
              zIndex: 5
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                    {currentPage?.name || 'Sayfa'}
                  </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0' }}>
                      Hoş geldiniz
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: 0 }}>
                      Admin User
                    </p>
                  </div>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    backgroundColor: '#E94560',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}>
                    A
                  </div>
                </div>
              </div>
            </header>
            
            {/* Page Content */}
            <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}