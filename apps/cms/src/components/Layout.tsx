import React, { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { 
  Menu, 
  X, 
  Home, 
  ShoppingCart, 
  Package, 
  Server, 
  Users, 
  FileText, 
  Settings,
  LogOut,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { System } from '../pages/System'
import { ApiTest } from '../pages/ApiTest'
import { BulkPriceUpdate } from '../pages/BulkPriceUpdate'
import { MartiCodes } from '../pages/MartiCodes'
import { MartiOrders } from '../pages/MartiOrders'
import { OzanOrders } from '../pages/OzanOrders'
import { Accounting } from '../pages/Accounting'
import { UserManagement } from '../pages/UserManagement'
import { ChannelManagement } from '../pages/ChannelManagement'
import { Reports } from '../pages/Reports'
import { StockAlerts } from '../pages/StockAlerts'
import { ExcessCodes } from '../pages/ExcessCodes'
import { SystemHealth } from '../pages/SystemHealth'
import { cn } from '../lib/utils'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Geçici user data
  const user = { id: '1', email: 'admin@omega.com', role: 'ADMIN' as const }
  const logout = () => {
    // Geçici logout - sadece console log
    console.log('Logout clicked')
  }
  const location = useLocation()

  // Role-based navigation
  const getNavigationByRole = () => {
    if (!user) return []
    
    switch (user.role) {
      case 'ACCOUNTING':
        return [
          { name: 'Muhasebe', href: '/accounting', icon: Package },
          { name: 'Raporlar', href: '/reports', icon: TrendingUp }
        ]
      
      case 'PRICING':
        return [
          { name: 'Fiyat Yönetimi', href: '/bulk-price-update', icon: Settings },
          { name: 'Raporlar', href: '/reports', icon: TrendingUp }
        ]
      
      case 'OPERATIONS':
        return [
          { name: 'Ana Sayfa', href: '/dashboard', icon: Home },
          { name: 'Siparişler', href: '/orders', icon: ShoppingCart },
          { name: 'Ürünler', href: '/products', icon: Package },
          { name: 'Fazlalık Kodlar', href: '/excess-codes', icon: AlertTriangle },
          { name: 'Sistem Sağlığı', href: '/system-health', icon: Server }
        ]
      
      case 'ADMIN':
      default:
        return [
          // Ana navigasyon
          { name: 'Ana Sayfa', href: '/dashboard', icon: Home },
          { name: 'Siparişler', href: '/orders', icon: ShoppingCart },
          { name: 'Ürünler', href: '/products', icon: Package },
          { name: 'Providerlar', href: '/providers', icon: Server },
          { name: 'Kanallar', href: '/channels', icon: Users },
          
          // Phase 2 - Martı
          { name: 'MARTI – MİGROS', href: '#', icon: Package, section: true },
          { name: 'Martı Kodlar', href: '/marti-codes', icon: Package },
          { name: 'Martı Siparişler', href: '/marti-orders', icon: ShoppingCart },
          
          // Phase 2 - Ozan
          { name: 'OZANAPP', href: '#', icon: Package, section: true },
          { name: 'Ozan Siparişler', href: '/ozan-orders', icon: ShoppingCart },
          { name: 'Ozan Fiyat', href: '/bulk-price-update', icon: Settings },
          
          // Phase 3
          { name: 'Muhasebe', href: '/accounting', icon: Package },
          { name: 'Kullanıcılar', href: '/users', icon: Users },
          { name: 'Kanal Yönetimi', href: '/channel-management', icon: Settings },
          
          // Phase 4
          { name: 'Raporlar', href: '/reports', icon: TrendingUp },
          { name: 'Stok Uyarıları', href: '/stock-alerts', icon: AlertTriangle },
          { name: 'Fazlalık Kodlar', href: '/excess-codes', icon: AlertTriangle },
          { name: 'Sistem Sağlığı', href: '/system-health', icon: Server },
          
          // Ayarlar
          { name: 'AYARLAR', href: '#', icon: Settings, section: true },
          { name: 'Audit Log', href: '/audit', icon: FileText },
          { name: 'Sistem', href: '/system', icon: Server },
          { name: 'API Test', href: '/api-test', icon: Settings }
        ]
    }
  }

  const navigation = getNavigationByRole()

  const handleLogout = () => {
    logout()
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FC' }}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div style={{
        position: sidebarOpen ? 'fixed' : 'relative',
        insetY: 0,
        left: 0,
        zIndex: 50,
        width: '256px',
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E5E7EB',
        transition: 'transform 0.3s ease-in-out',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
      }}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div style={{ 
            display: 'flex', 
            height: '64px', 
            alignItems: 'center', 
            padding: '0 24px',
            borderBottom: '1px solid #E5E7EB',
            backgroundColor: '#FFFFFF'
          }}>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#E94560' }}>Omega Digital</h1>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, padding: '16px 12px' }}>
            {navigation.map((item, index) => {
              const isActive = location.pathname === item.href
              
              // Section header
              if ((item as any).section) {
                return (
                  <div key={item.name} style={{ 
                    color: '#9CA3AF', 
                    fontSize: '11px', 
                    fontWeight: '500', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '8px 24px',
                    marginBottom: '8px'
                  }}>
                    {item.name}
                  </div>
                )
              }
              
              // Regular nav item
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '500',
                    borderRadius: '6px',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    color: isActive ? '#E94560' : '#374151',
                    backgroundColor: isActive ? '#FEF2F4' : 'transparent',
                    borderLeft: isActive ? '4px solid #E94560' : '4px solid transparent',
                    marginLeft: isActive ? '0' : '4px'
                  }}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon style={{ width: '20px', height: '20px', marginRight: '12px' }} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div style={{ borderTop: '1px solid #E5E7EB', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: 0 }}>
                  {user?.email || 'User'}
                </p>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                  {user?.role || 'GUEST'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                style={{ 
                  padding: '8px', 
                  color: '#9CA3AF', 
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: 'transparent',
                  borderRadius: '4px'
                }}
              >
                <LogOut style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: '256px' }}>
        {/* Header */}
        <header style={{ 
          backgroundColor: '#FFFFFF', 
          borderBottom: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
          <div style={{ padding: '16px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{ 
                  padding: '8px', 
                  color: '#6B7280', 
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: 'transparent',
                  borderRadius: '4px',
                  display: 'none'
                }}
              >
                {sidebarOpen ? <X style={{ width: '24px', height: '24px' }} /> : <Menu style={{ width: '24px', height: '24px' }} />}
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '14px', color: '#6B7280' }}>
                  {new Date().toLocaleDateString('tr-TR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ padding: '24px', backgroundColor: '#F8F9FC', minHeight: 'calc(100vh - 65px)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
