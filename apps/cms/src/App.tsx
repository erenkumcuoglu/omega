import React, { useEffect, useState } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Server, 
  Users, 
  TrendingUp, 
  AlertTriangle 
} from 'lucide-react'
import { ToggleSwitch, MonthFilter, formatCurrency, DateRangeFilter, Pagination, formatDate, formatTime, PriceEditModal } from './components/UIComponents'
import { mockProviders, mockChannels, months, activeMonth, years, activeYear, mockOrders, mockProducts } from './mock/data'
import api from './lib/api'
import { SystemHealth } from './pages/SystemHealth'
import { ExcessCodes } from './pages/ExcessCodes'
import ProductManagement from './pages/ProductManagement'
import Products from './pages/Products'

// Layout with Sidebar
function LayoutWithSidebar({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  
  // Navigation items
  const navigation = [
    // Ana navigasyon
    { name: 'Ana Sayfa', href: '/dashboard', icon: Home },
    { name: 'Siparişler', href: '/orders', icon: ShoppingCart },
    { name: 'Ürünler', href: '/products', icon: Package },
    { name: 'Ürün Yönetimi', href: '/product-management', icon: Package },
    { name: 'Distribütörler', href: '/providers', icon: Server },
    { name: 'Kanallar', href: '/channels', icon: Users },
    
    // Phase 4
    { name: 'Raporlar', href: '/reports', icon: TrendingUp },
    { name: 'Stok Uyarıları', href: '/stock-alerts', icon: AlertTriangle },
    { name: 'Fazlalık Kodlar', href: '/excess-codes', icon: AlertTriangle },
    { name: 'Sistem Sağlığı', href: '/system-health', icon: Server },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8F9FC' }}>
      {/* Sidebar */}
      <div style={{ 
        width: '256px', 
        backgroundColor: '#FFFFFF', 
        borderRight: '1px solid #E5E7EB',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto',
        zIndex: 10
      }}>
        {/* Logo */}
        <div style={{ padding: '24px', borderBottom: '1px solid #E5E7EB' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
            Omega Digital
          </h1>
          <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            CMS v1.0
          </p>
        </div>
        
        {/* Navigation */}
        <nav style={{ padding: '16px' }}>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <div key={item.name} style={{ marginBottom: '4px' }}>
                <a
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault()
                    window.history.pushState({}, '', item.href)
                    window.dispatchEvent(new PopStateEvent('popstate'))
                  }}
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
                    transition: 'all 0.2s'
                  }}
                >
                  <item.icon size={18} />
                  {item.name}
                </a>
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
                {navigation.find(item => item.href === location.pathname)?.name || 'Sayfa'}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
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
                fontWeight: 'bold'
              }}>
                A
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main style={{ flex: 1, padding: '24px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

// Simple Dashboard
function SimpleDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(activeMonth)
  const [selectedYear, setSelectedYear] = useState(activeYear)
  const [dateFilter, setDateFilter] = useState('monthly') // monthly, yearly, all, custom
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [providers, setProviders] = useState(mockProviders)
  
  const handleProviderToggle = (providerId: string) => {
    setProviders(prev => prev.map(p => 
      p.id === providerId ? { ...p, deliveryEnabled: !p.deliveryEnabled } : p
    ))
  }

  // KPI hesaplamaları - filtreye göre
  const getFilteredData = () => {
    const totalOrders = mockOrders.length
    const successfulOrders = mockOrders.filter(o => o.status === 'completed').length
    const pendingOrders = mockOrders.filter(o => o.status === 'pending').length
    const cancelledOrders = mockOrders.filter(o => o.status === 'cancelled').length
    
    const totalRevenue = mockOrders.reduce((sum, order) => sum + order.salePrice, 0)
    const totalCost = mockOrders.reduce((sum, order) => sum + order.distPrice, 0)
    const totalProfit = totalRevenue - totalCost
    
    return {
      totalOrders,
      successfulOrders,
      pendingOrders,
      cancelledOrders,
      totalRevenue,
      totalCost,
      totalProfit,
      successRate: totalOrders > 0 ? (successfulOrders / totalOrders * 100) : 0
    }
  }

  const filteredData = getFilteredData()

  return (
    <div>
      {/* Header with Month Filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* Tarih Filtreleri */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setDateFilter('monthly')}
              style={{
                padding: '6px 12px',
                backgroundColor: dateFilter === 'monthly' ? '#E94560' : '#F3F4F6',
                color: dateFilter === 'monthly' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Aylık
            </button>
            <button
              onClick={() => setDateFilter('yearly')}
              style={{
                padding: '6px 12px',
                backgroundColor: dateFilter === 'yearly' ? '#E94560' : '#F3F4F6',
                color: dateFilter === 'yearly' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Yıllık
            </button>
            <button
              onClick={() => setDateFilter('all')}
              style={{
                padding: '6px 12px',
                backgroundColor: dateFilter === 'all' ? '#E94560' : '#F3F4F6',
                color: dateFilter === 'all' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Tüm Zamanlar
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              style={{
                padding: '6px 12px',
                backgroundColor: dateFilter === 'custom' ? '#E94560' : '#F3F4F6',
                color: dateFilter === 'custom' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Özel Tarih
            </button>
          </div>
          
          {/* Dinamik Filtreler */}
          {dateFilter === 'monthly' && (
            <MonthFilter 
              months={months} 
              activeMonth={selectedMonth}
              years={years}
              activeYear={selectedYear}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
            />
          )}
          
          {dateFilter === 'yearly' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {years.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: year === selectedYear ? '#E94560' : '#F3F4F6',
                    color: year === selectedYear ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
          
          {dateFilter === 'custom' && (
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Toplam Sipariş
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{filteredData.totalOrders.toLocaleString('tr-TR')}</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Seçili dönem</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Başarılı Sipariş
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>{filteredData.successfulOrders.toLocaleString('tr-TR')}</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>%{filteredData.successRate.toFixed(1)} başarı</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Toplam Ciro
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{formatCurrency(filteredData.totalRevenue)}</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Seçili dönem</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Toplam Kar
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>{formatCurrency(filteredData.totalProfit)}</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>%{((filteredData.totalProfit/filteredData.totalRevenue)*100).toFixed(1)} marj</p>
        </div>
      </div>

      {/* Provider Performansı */}
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E5E7EB', 
        borderRadius: '8px', 
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
          Provider Performansı
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          {providers.map(provider => (
            <div key={provider.id} style={{ 
              border: '1px solid #E5E7EB', 
              borderRadius: '8px', 
              padding: '20px',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                  {provider.name}
                </h4>
                <ToggleSwitch
                  isActive={provider.deliveryEnabled}
                  onToggle={() => handleProviderToggle(provider.id)}
                  activeLabel="Aktif"
                  inactiveLabel="Pasif"
                  confirmMessage={`${provider.name} provider gönderim durumunu değiştirmek istediğinizden emin misiniz?`}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '14px' }}>
                <div>
                  <span style={{ color: '#6B7280' }}>Başarılı Sipariş:</span>
                  <span style={{ display: 'block', fontWeight: '600', color: '#111827' }}>
                    {provider.orders.toLocaleString('tr-TR')}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#6B7280' }}>Çekilen Kodlar:</span>
                  <span style={{ display: 'block', fontWeight: '600', color: '#111827' }}>
                    {provider.codesDelivered.toLocaleString('tr-TR')}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#6B7280' }}>Başarı Oranı:</span>
                  <span style={{ display: 'block', fontWeight: '600', color: provider.successRate > 95 ? '#10B981' : '#F59E0B' }}>
                    %{provider.successRate}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#6B7280' }}>Ciro:</span>
                  <span style={{ display: 'block', fontWeight: '600', color: '#111827' }}>
                    {formatCurrency(provider.revenue)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Satış Kanalı Performansı */}
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E5E7EB', 
        borderRadius: '8px', 
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
          Satış Kanalı Performansı
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Kanal
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Başarılı Sipariş
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ciro
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Karlılık
                </th>
              </tr>
            </thead>
            <tbody>
              {mockChannels.map(channel => (
                <tr key={channel.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                    {channel.name}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#111827', textAlign: 'right' }}>
                    {channel.orders.toLocaleString('tr-TR')}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#111827', textAlign: 'right' }}>
                    {formatCurrency(channel.revenue)}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#111827', textAlign: 'right' }}>
                    {formatCurrency(channel.profit || 0)}
                  </td>
                </tr>
              ))}
              <tr style={{ backgroundColor: '#F9FAFB', fontWeight: '600' }}>
                <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>
                  Toplam
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#111827', textAlign: 'right' }}>
                  {mockChannels.reduce((sum, c) => sum + (c.profit || 0), 0).toLocaleString('tr-TR')}
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#111827', textAlign: 'right' }}>
                  {formatCurrency(mockChannels.reduce((sum, c) => sum + c.revenue, 0))}
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#111827', textAlign: 'right' }}>
                  {formatCurrency(mockChannels.reduce((sum, c) => sum + (c.profit || 0), 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

// Simple Reports (placeholder)
function SimpleReports() {
  return (
    <div>
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E5E7EB', 
        borderRadius: '8px', 
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <p style={{ color: '#6B7280' }}>
          Raporlama özellikleri yakında eklenecek...
        </p>
      </div>
    </div>
  )
}

// Simple Stock Alerts
function SimpleStockAlerts() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Aktif Uyarılar
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#E94560' }}>12</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Bu hafta</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Düşük Stok
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#F59E0B' }}>5</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Ürün</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Stokta Yok
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#EF4444' }}>3</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Ürün</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Bildirimler
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>28</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Gönderildi</p>
        </div>
      </div>

      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E5E7EB', 
        borderRadius: '8px', 
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
          Son Uyarılar
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ 
            border: '1px solid #E5E7EB', 
            borderRadius: '8px', 
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                PUBG Mobile 100 TL
              </h4>
              <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                Mevcut: 15 adet | Eşik: 50 adet | Provider: Coda
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ padding: '4px 8px', backgroundColor: '#F59E0B', color: 'white', borderRadius: '4px', fontSize: '12px' }}>
                DÜŞÜK
              </span>
              <button style={{ padding: '8px 16px', backgroundColor: '#3B82F6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                Düzenle
              </button>
              <button style={{ padding: '8px 16px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                Sil
              </button>
            </div>
          </div>

          <div style={{ 
            border: '1px solid #E5E7EB', 
            borderRadius: '8px', 
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                Valorant 500 TL
              </h4>
              <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                Mevcut: 0 adet | Eşik: 25 adet | Provider: Epin
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ padding: '4px 8px', backgroundColor: '#EF4444', color: 'white', borderRadius: '4px', fontSize: '12px' }}>
                YOK
              </span>
              <button style={{ padding: '8px 16px', backgroundColor: '#3B82F6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                Düzenle
              </button>
              <button style={{ padding: '8px 16px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                Sil
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

// Simple Excess Codes
function SimpleExcessCodes() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Bekleyen
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>8</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Kod</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Gönderildi
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>24</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Bu ay</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            İptal Edildi
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#EF4444' }}>3</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Bu ay</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Toplam Değer
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>₺12,500</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Bekleyen</p>
        </div>
      </div>

      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E5E7EB', 
        borderRadius: '8px', 
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
          Bekleyen Kodlar
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ 
            border: '1px solid #E5E7EB', 
            borderRadius: '8px', 
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                PUBG Mobile 100 TL
              </h4>
              <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                Kanal: Trendyol | Provider: Coda | Tarih: 28.03.2026 14:30:00
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ padding: '8px 16px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                Gönder
              </button>
              <button style={{ padding: '8px 16px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                Zarar Yaz
              </button>
            </div>
          </div>

          <div style={{ 
            border: '1px solid #E5E7EB', 
            borderRadius: '8px', 
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                Valorant 500 TL
              </h4>
              <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                Kanal: Ozan | Provider: Epin | Tarih: 28.03.2026 14:25:00
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ padding: '8px 16px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                Gönder
              </button>
              <button style={{ padding: '8px 16px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                Zarar Yaz
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple Orders
function SimpleOrders() {
  const [orders, setOrders] = useState(mockOrders)
  const [filteredOrders, setFilteredOrders] = useState(mockOrders)
  const [dateFilter, setDateFilter] = useState('monthly') // monthly, yearly, all, custom
  const [selectedMonth, setSelectedMonth] = useState(activeMonth)
  const [selectedYear, setSelectedYear] = useState(activeYear)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  
  // Filtreleme fonksiyonu
  const filterOrders = () => {
    let filtered = [...orders]
    
    if (dateFilter === 'monthly') {
      // Seçili aya göre filtrele
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.date)
        const orderMonth = orderDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
        return orderMonth === selectedMonth
      })
    } else if (dateFilter === 'yearly') {
      // Seçili yıla göre filtrele
      filtered = filtered.filter(order => {
        const orderYear = new Date(order.date).getFullYear().toString()
        return orderYear === selectedYear
      })
    } else if (dateFilter === 'custom' && startDate && endDate) {
      // Özel tarih aralığına göre filtrele
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.date)
        return orderDate >= new Date(startDate) && orderDate <= new Date(endDate)
      })
    }
    // 'all' için tüm siparişleri göster
    
    setFilteredOrders(filtered)
    setCurrentPage(1) // Filtre değişince ilk sayfaya dön
  }
  
  // Filtreleme değişince çalış
  React.useEffect(() => {
    filterOrders()
  }, [dateFilter, selectedMonth, selectedYear, startDate, endDate])
  
  // KPI hesaplamaları
  const totalOrders = filteredOrders.length
  const successfulOrders = filteredOrders.filter(o => o.status === 'completed').length
  const pendingOrders = filteredOrders.filter(o => o.status === 'pending').length
  const cancelledOrders = filteredOrders.filter(o => o.status === 'cancelled').length
  
  // Pagination hesaplamaları
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)
  
  // Satır genişletme/kapama fonksiyonu
  const toggleRowExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedRows(newExpanded)
  }
  
  // Export fonksiyonu
  const handleExport = (format: 'excel' | 'pdf') => {
    let filename = `siparişler_${format}`
    if (dateFilter === 'monthly') filename += `_${selectedMonth}`
    else if (dateFilter === 'yearly') filename += `_${selectedYear}`
    else if (dateFilter === 'custom' && startDate && endDate) filename += `_${startDate}_${endDate}`
    
    console.log(`Exporting to ${format}:`, filename, filteredOrders)
    // Burada gerçek export işlemi yapılacak
  }
  
  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Toplam Sipariş
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{totalOrders.toLocaleString('tr-TR')}</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Seçili dönem</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Başarılı
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>{successfulOrders.toLocaleString('tr-TR')}</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>{totalOrders > 0 ? `%${((successfulOrders/totalOrders)*100).toFixed(1)}` : '%0'}</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Bekleyen
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#F59E0B' }}>{pendingOrders.toLocaleString('tr-TR')}</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>İşlemde</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            İptal Edildi
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#EF4444' }}>{cancelledOrders.toLocaleString('tr-TR')}</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Seçili dönem</p>
        </div>
      </div>

      {/* Filtreler ve Export */}
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E5E7EB', 
        borderRadius: '8px', 
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
            Sipariş Filtreleri
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => handleExport('excel')}
              style={{ padding: '6px 12px', backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
            >
              Excel
            </button>
            <button 
              onClick={() => handleExport('pdf')}
              style={{ padding: '6px 12px', backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
            >
              PDF
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Tarih Filtreleri */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setDateFilter('monthly')}
              style={{
                padding: '6px 12px',
                backgroundColor: dateFilter === 'monthly' ? '#E94560' : '#F3F4F6',
                color: dateFilter === 'monthly' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Aylık
            </button>
            <button
              onClick={() => setDateFilter('yearly')}
              style={{
                padding: '6px 12px',
                backgroundColor: dateFilter === 'yearly' ? '#E94560' : '#F3F4F6',
                color: dateFilter === 'yearly' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Yıllık
            </button>
            <button
              onClick={() => setDateFilter('all')}
              style={{
                padding: '6px 12px',
                backgroundColor: dateFilter === 'all' ? '#E94560' : '#F3F4F6',
                color: dateFilter === 'all' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Tüm Zamanlar
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              style={{
                padding: '6px 12px',
                backgroundColor: dateFilter === 'custom' ? '#E94560' : '#F3F4F6',
                color: dateFilter === 'custom' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Özel Tarih
            </button>
          </div>
          
          {/* Dinamik Filtreler */}
          {dateFilter === 'monthly' && (
            <MonthFilter 
              months={months} 
              activeMonth={selectedMonth}
              years={years}
              activeYear={selectedYear}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
            />
          )}
          
          {dateFilter === 'yearly' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {years.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: year === selectedYear ? '#E94560' : '#F3F4F6',
                    color: year === selectedYear ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
          
          {dateFilter === 'custom' && (
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          )}
        </div>
      </div>

      {/* Siparişler Tablosu */}
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E5E7EB', 
        borderRadius: '8px', 
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
          Son Siparişler ({filteredOrders.length.toLocaleString('tr-TR')} kayıt)
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tarih
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Saat
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Satış Kanalı
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Distribütör
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ürün Adı
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Dist. Fiyatı
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Satış Fiyatı
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Durum
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map(order => (
                <React.Fragment key={order.id}>
                  <tr 
                    style={{ 
                      borderBottom: '1px solid #F3F4F6',
                      cursor: 'pointer',
                      backgroundColor: expandedRows.has(order.id) ? '#F9FAFB' : 'transparent'
                    }}
                    onClick={() => toggleRowExpansion(order.id)}
                  >
                    <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>
                      {formatDate(order.date)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>
                      {formatTime(order.date)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>
                      {order.channel}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>
                      {order.provider}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>
                      {order.product}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#111827', fontWeight: '500', textAlign: 'right' }}>
                      {formatCurrency(order.distPrice)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#111827', fontWeight: '500', textAlign: 'right' }}>
                      {formatCurrency(order.salePrice)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        backgroundColor: order.status === 'completed' ? '#10B981' : 
                                         order.status === 'pending' ? '#F59E0B' : '#EF4444', 
                        color: 'white', 
                        borderRadius: '4px', 
                        fontSize: '12px' 
                      }}>
                        {order.status === 'completed' ? 'Başarılı' : 
                         order.status === 'pending' ? 'Bekleyen' : 'İptal'}
                      </span>
                    </td>
                  </tr>
                  
                  {/* Genişletilmiş Detay Satırı */}
                  {expandedRows.has(order.id) && (
                    <tr>
                      <td colSpan={8} style={{ padding: '0', backgroundColor: '#F9FAFB' }}>
                        <div style={{
                          padding: '16px 24px',
                          fontSize: '12px',
                          borderLeft: '4px solid #E94560'
                        }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                            <div>
                              <span style={{ color: '#6B7280', fontWeight: '500' }}>Sipariş ID:</span>
                              <span style={{ marginLeft: '8px', color: '#111827', fontWeight: '600' }}>{order.id}</span>
                            </div>
                            <div>
                              <span style={{ color: '#6B7280', fontWeight: '500' }}>Müşteri Adı:</span>
                              <span style={{ marginLeft: '8px', color: '#111827', fontWeight: '600' }}>{order.customer}</span>
                            </div>
                            <div>
                              <span style={{ color: '#6B7280', fontWeight: '500' }}>Ürün Kodu:</span>
                              <span style={{ marginLeft: '8px', color: '#111827', fontWeight: '600', fontFamily: 'monospace' }}>{order.productCode}</span>
                            </div>
                            <div>
                              <span style={{ color: '#6B7280', fontWeight: '500' }}>Dijital Kod:</span>
                              <span style={{ marginLeft: '8px', color: '#111827', fontWeight: '600', fontFamily: 'monospace' }}>
                                {order.digitalCode || 'Henüz atanmadı'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
    </div>
  )
}

// Simple Products
function SimpleProducts() {
  const [selectedProvider, setSelectedProvider] = useState<'turkpin' | 'coda'>('turkpin')
  const [products, setProducts] = useState(mockProducts)
  const [editModal, setEditModal] = useState<{ isOpen: boolean; denom: any; productName: string }>({
    isOpen: false,
    denom: null,
    productName: ''
  })
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [syncSummary, setSyncSummary] = useState<any>(null)
  
  // Seçili distribütörün ürünlerini al
  const currentProducts = products[selectedProvider] || []
  
  // KPI hesaplamaları
  const calculateKPIs = () => {
    let totalProducts = 0
    let inStock = 0
    let lowStock = 0
    let outOfStock = 0
    
    currentProducts.forEach((productGroup: any) => {
      productGroup.denoms.forEach((denom: any) => {
        totalProducts++
        if (denom.stock === 0) {
          outOfStock++
        } else if (denom.stock < 50) {
          lowStock++
        } else {
          inStock++
        }
      })
    })
    
    return { totalProducts, inStock, lowStock, outOfStock }
  }
  
  const kpis = calculateKPIs()
  
  // Fiyat güncelleme fonksiyonu
  const handlePriceUpdate = (newPrice: number) => {
    const updatedProducts = { ...products }
    const providerProducts = updatedProducts[selectedProvider]
    
    // İlgili denom'u bul ve güncelle
    for (const productGroup of providerProducts) {
      const denomIndex = productGroup.denoms.findIndex((d: any) => d.id === editModal.denom.id)
      if (denomIndex !== -1) {
        productGroup.denoms[denomIndex].salePrice = newPrice
        // Yeni marjı hesapla
        const margin = ((newPrice - productGroup.denoms[denomIndex].purchasePrice) / productGroup.denoms[denomIndex].purchasePrice) * 100
        productGroup.denoms[denomIndex].margin = parseFloat(margin.toFixed(1))
        break
      }
    }
    
    setProducts(updatedProducts)
    console.log(`Fiyat güncellendi: ${editModal.productName} - ${editModal.denom.denom} - Yeni fiyat: ₺${newPrice}`)
  }
  
  // Modal açma fonksiyonu
  const openEditModal = (productGroup: any, denom: any) => {
    setEditModal({
      isOpen: true,
      denom,
      productName: productGroup.product
    })
  }
  
  // Modal kapatma fonksiyonu
  const closeEditModal = () => {
    setEditModal({
      isOpen: false,
      denom: null,
      productName: ''
    })
  }

  // Ürün senkronizasyon fonksiyonu
  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const response = await api.get('/api/products/sync')
      const data = response.data
      
      if (data.status === 'success') {
        // Convert Turkpin data to our format and merge with existing products
        const turkpinProducts = data.data.categories.map((category: any) => ({
          product: category.epinName,
          denoms: category.products.map((product: any) => ({
            id: product.id,
            denom: product.name,
            purchasePrice: product.price * 0.85, // Assume 15% margin
            salePrice: product.price,
            margin: 15,
            stock: product.stock,
            isActive: product.stock > 0
          }))
        }))
        
        // Update products state with new Turkpin data
        setProducts(prev => ({
          ...prev,
          turkpin: turkpinProducts
        }))
        
        // Cache bilgilerini kaydet
        setLastSyncTime(new Date().toISOString())
        setSyncSummary(data.data.summary)
        
        // Show success message
        alert(`${data.data.summary.totalProducts} ürün senkronize edildi`)
      } else {
        alert(`Senkronizasyon başarısız: ${data.message}`)
      }
    } catch (error: any) {
      console.error('Sync error:', error)
      alert(`Senkronizasyon başarısız: ${error.message || 'Bilinmeyen hata'}`)
    } finally {
      setIsSyncing(false)
    }
  }
  
  return (
    <div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Toplam Ürün
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{kpis.totalProducts}</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Aktif</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Stokta Var
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>{kpis.inStock}</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>{kpis.totalProducts > 0 ? `%${((kpis.inStock/kpis.totalProducts)*100).toFixed(1)}` : '%0'}</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Düşük Stok
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#F59E0B' }}>{kpis.lowStock}</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Uyarı</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Stokta Yok
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#EF4444' }}>{kpis.outOfStock}</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Tükendi</p>
        </div>
      </div>

      {/* Cache Bilgisi */}
      {lastSyncTime && (
        <div style={{ 
          backgroundColor: '#F0FDF4', 
          border: '1px solid #22C55E', 
          borderRadius: '8px', 
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#166534', marginBottom: '4px' }}>
                Son Senkronizasyon
              </h4>
              <p style={{ fontSize: '12px', color: '#15803D', margin: 0 }}>
                {new Date(lastSyncTime).toLocaleString('tr-TR')} - {syncSummary?.totalProducts || 0} ürün
              </p>
              <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0 0' }}>
                Veriler cache'den geliyor, tekrar senkronize etmenize gerek yok
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/product-management'}
              style={{
                padding: '8px 16px',
                backgroundColor: '#22C55E',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Ürün Yönetimi
            </button>
          </div>
        </div>
      )}

      {/* Distribütör Seçimi */}
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E5E7EB', 
        borderRadius: '8px', 
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
          Distribütör Seçimi
        </h3>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {(['turkpin', 'coda'] as const).map((provider) => (
            <button
              key={provider}
              onClick={() => setSelectedProvider(provider)}
              style={{
                padding: '10px 20px',
                backgroundColor: provider === selectedProvider ? '#E94560' : '#F3F4F6',
                color: provider === selectedProvider ? 'white' : '#374151',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {provider === 'turkpin' ? 'Turkpin' : 'Coda'}
            </button>
          ))}
        </div>
      </div>

      {/* Ürün Listesi */}
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E5E7EB', 
        borderRadius: '8px', 
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
            Ürün Listesi - {selectedProvider === 'turkpin' ? 'Turkpin' : 'Coda'}
          </h3>
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: isSyncing ? '#9CA3AF' : '#10B981', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: '14px',
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isSyncing ? (
              <>
                <div style={{ 
                  width: '16px', 
                  height: '16px', 
                  border: '2px solid #ffffff', 
                  borderTop: '2px solid transparent', 
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Senkronize Ediliyor...
              </>
            ) : (
              <>
                ↻ Senkronize Et
              </>
            )}
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {currentProducts.map((productGroup: any, index: number) => (
            <div key={index} style={{ 
              border: '1px solid #E5E7EB', 
              borderRadius: '8px', 
              overflow: 'hidden'
            }}>
              {/* Ürün Başlığı */}
              <div style={{ 
                backgroundColor: '#F9FAFB', 
                padding: '16px 20px',
                borderBottom: '1px solid #E5E7EB'
              }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                  {productGroup.product}
                </h4>
              </div>
              
              {/* Denom Listesi */}
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {productGroup.denoms.map((denom: any) => (
                    <div key={denom.id} style={{ 
                      border: '1px solid #E5E7EB', 
                      borderRadius: '6px', 
                      padding: '16px',
                      backgroundColor: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                            {denom.denom}
                          </span>
                          <span style={{ 
                            padding: '4px 8px', 
                            backgroundColor: denom.stock === 0 ? '#EF4444' : 
                                             denom.stock < 50 ? '#F59E0B' : '#10B981', 
                            color: 'white', 
                            borderRadius: '4px', 
                            fontSize: '11px',
                            fontWeight: '500'
                          }}>
                            {denom.stock === 0 ? 'Tükendi' : denom.stock < 50 ? 'Düşük' : 'Stokta'}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '24px', fontSize: '14px' }}>
                          <div>
                            <span style={{ color: '#6B7280', marginRight: '4px' }}>Alış:</span>
                            <span style={{ color: '#111827', fontWeight: '600' }}>
                              {formatCurrency(denom.purchasePrice)}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: '#6B7280', marginRight: '4px' }}>Satış:</span>
                            <span style={{ color: '#111827', fontWeight: '600' }}>
                              {formatCurrency(denom.salePrice)}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: '#6B7280', marginRight: '4px' }}>Marj:</span>
                            <span style={{ color: denom.margin > 15 ? '#10B981' : '#F59E0B', fontWeight: '600' }}>
                              %{denom.margin}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: '#6B7280', marginRight: '4px' }}>Stok:</span>
                            <span style={{ color: '#111827', fontWeight: '600' }}>
                              {denom.stock} adet
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => openEditModal(productGroup, denom)}
                          style={{ 
                            padding: '6px 12px', 
                            backgroundColor: '#3B82F6', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px', 
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Düzenle
                        </button>
                        <button style={{ 
                          padding: '6px 12px', 
                          backgroundColor: '#F59E0B', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px', 
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}>
                          Stok
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Price Edit Modal */}
      <PriceEditModal
        isOpen={editModal.isOpen}
        onClose={closeEditModal}
        onSave={handlePriceUpdate}
        denom={editModal.denom}
        productName={editModal.productName}
      />
    </div>
  )
}

// Simple Providers
function SimpleProviders() {
  const [providers, setProviders] = useState(mockProviders)
  
  const handleProviderToggle = (providerId: string) => {
    setProviders(prev => prev.map(p => 
      p.id === providerId ? { ...p, deliveryEnabled: !p.deliveryEnabled } : p
    ))
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Toplam Provider
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>8</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Sistemde</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Aktif
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>6</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>%75</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Pasif
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#F59E0B' }}>2</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Bakımda</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Toplam Ciro
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>₺450K</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Bu ay</p>
        </div>
      </div>

      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E5E7EB', 
        borderRadius: '8px', 
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
          Provider Listesi
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {providers.map(provider => (
            <div key={provider.id} style={{ 
              border: '1px solid #E5E7EB', 
              borderRadius: '8px', 
              padding: '20px',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                  {provider.name}
                </h4>
                <span style={{ padding: '4px 8px', backgroundColor: provider.isActive ? '#10B981' : '#F59E0B', color: 'white', borderRadius: '4px', fontSize: '12px' }}>
                  {provider.isActive ? 'Aktif' : 'Pasif'}
                </span>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>API Anahtarı</p>
                <p style={{ fontSize: '12px', color: '#111827', fontFamily: 'monospace', backgroundColor: '#F3F4F6', padding: '4px 8px', borderRadius: '4px' }}>
                  {provider.apiKey}
                </p>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                <span style={{ color: '#6B7280' }}>Siparişler:</span>
                <span style={{ fontWeight: '500', color: '#111827' }}>{provider.orders.toLocaleString('tr-TR')}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                <span style={{ color: '#6B7280' }}>Çekilen Kodlar:</span>
                <span style={{ fontWeight: '500', color: '#111827' }}>{provider.codesDelivered.toLocaleString('tr-TR')}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                <span style={{ color: '#6B7280' }}>Başarı Oranı:</span>
                <span style={{ fontWeight: '500', color: provider.successRate > 95 ? '#10B981' : '#F59E0B' }}>
                  {provider.successRate}%
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '16px' }}>
                <span style={{ color: '#6B7280' }}>Ciro:</span>
                <span style={{ fontWeight: '500', color: '#111827' }}>{formatCurrency(provider.revenue)}</span>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ 
                  flex: 1, 
                  padding: '8px', 
                  backgroundColor: '#3B82F6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  fontSize: '12px',
                  cursor: 'pointer'
                }}>
                  Detaylar
                </button>
                <button style={{ 
                  flex: 1, 
                  padding: '8px', 
                  backgroundColor: '#F59E0B', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  fontSize: '12px',
                  cursor: 'pointer'
                }}>
                  Test Et
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Simple Channels
function SimpleChannels() {
  const [channelsData, setChannelsData] = useState<Array<{
    id: string
    name: string
    countryCode?: string | null
    isActive: boolean
    commissionPct: number
  }> | null>(null)
  const [busyChannelId, setBusyChannelId] = useState<string | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [webhookModalOpen, setWebhookModalOpen] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<{ id: string; name: string } | null>(null)
  const [detailData, setDetailData] = useState<any | null>(null)
  const [settingsCommission, setSettingsCommission] = useState('')
  const [webhookData, setWebhookData] = useState<any | null>(null)
  const [modalError, setModalError] = useState('')

  useEffect(() => {
    let mounted = true

    const loadChannels = async () => {
      try {
        const response = await api.get('/channels')
        const rows = Array.isArray(response.data)
          ? response.data.map((row: any) => ({
              id: row.id,
              name: row.name,
              countryCode: row.countryCode ?? null,
              isActive: Boolean(row.isActive),
              commissionPct: Number(row.commissionPct ?? 0)
            }))
          : []

        if (mounted) {
          setChannelsData(rows)
        }
      } catch {
        if (mounted) {
          setChannelsData([])
        }
      }
    }

    loadChannels()

    return () => {
      mounted = false
    }
  }, [])

  const list = channelsData ?? []
  const totalChannels = list.length
  const activeChannels = list.filter((ch) => ch.isActive).length
  const topChannel = list[0]?.name || ''

  const updateLocalChannel = (id: string, patch: Partial<{ isActive: boolean; commissionPct: number }>) => {
    setChannelsData((prev) => {
      if (!prev) return prev
      return prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    })
  }

  const handleToggleStatus = async (channel: { id: string; name: string; isActive: boolean }) => {
    const next = !channel.isActive
    setBusyChannelId(channel.id)
    try {
      await api.patch(`/channels/${channel.id}/status`, { isActive: next })
      updateLocalChannel(channel.id, { isActive: next })
    } catch {
      window.alert('Durum güncellenemedi')
    } finally {
      setBusyChannelId(null)
    }
  }

  const handleDetails = async (channelId: string) => {
    setModalError('')
    setDetailData(null)
    setDetailModalOpen(true)
    try {
      const response = await api.get(`/channels/${channelId}`)
      setDetailData(response.data)
    } catch {
      setModalError('Kanal detayı alınamadı')
    }
  }

  const handleSettings = async (channel: { id: string; name: string; commissionPct: number }) => {
    setModalError('')
    setSelectedChannel({ id: channel.id, name: channel.name })
    setSettingsCommission(String(channel.commissionPct))
    setSettingsModalOpen(true)
  }

  const submitSettings = async () => {
    if (!selectedChannel) return
    const value = Number(settingsCommission)
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setModalError('Lütfen 0-100 arasında geçerli bir komisyon yüzdesi girin')
      return
    }

    setBusyChannelId(selectedChannel.id)
    try {
      await api.patch(`/channels/${selectedChannel.id}`, { commissionPct: value })
      updateLocalChannel(selectedChannel.id, { commissionPct: value })
      setSettingsModalOpen(false)
    } catch {
      setModalError('Komisyon güncellenemedi')
    } finally {
      setBusyChannelId(null)
    }
  }

  const handleWebhookTest = async (channel: { id: string; name: string }) => {
    setModalError('')
    setWebhookData(null)
    setSelectedChannel({ id: channel.id, name: channel.name })
    setWebhookModalOpen(true)
    setBusyChannelId(channel.id)
    try {
      const response = await api.post(`/channels/${channel.id}/webhook-test`)
      setWebhookData(response.data)
    } catch {
      setModalError('Webhook testi başarısız')
    } finally {
      setBusyChannelId(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Toplam Kanal
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{totalChannels}</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>{activeChannels} Aktif</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            En Popüler
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{topChannel || '—'}</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>{topChannel ? '' : 'Veri yok'}</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Toplam Ciro
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>—</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Veri yok</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Ort. Sipariş
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>—</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Veri yok</p>
        </div>
      </div>

      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E5E7EB', 
        borderRadius: '8px', 
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
            Kanal Performansları
          </h3>
          <button style={{ 
            padding: '8px 16px', 
            backgroundColor: '#10B981', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            Yeni Kanal
          </button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  KANAL
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ÜLKE
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  DURUM
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  SİPARİŞLER
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  CİRO
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  KOMİSYON %
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  PERFORMANS
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  İŞLEMLER
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map(channel => (
                <tr key={channel.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', backgroundColor: channel.isActive ? '#10B981' : '#F59E0B', borderRadius: '50%' }}></div>
                      {channel.name}
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>
                    {channel.countryCode || ''}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => handleToggleStatus(channel)}
                      disabled={busyChannelId === channel.id}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: channel.isActive ? '#10B981' : '#F59E0B',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                        border: 'none',
                        cursor: busyChannelId === channel.id ? 'not-allowed' : 'pointer',
                        opacity: busyChannelId === channel.id ? 0.7 : 1
                      }}
                    >
                      {channel.isActive ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                    {'—'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                    {'—'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>
                    {channel.commissionPct}%
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '100px', height: '8px', backgroundColor: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: '0%', height: '100%', backgroundColor: '#10B981' }}></div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}></span>
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleDetails(channel.id)}
                        style={{ padding: '4px 8px', backgroundColor: '#3B82F6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Detay
                      </button>
                      <button
                        onClick={() => handleSettings(channel)}
                        style={{ padding: '4px 8px', backgroundColor: '#F59E0B', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Ayarlar
                      </button>
                      <button
                        onClick={() => handleWebhookTest(channel)}
                        style={{ padding: '4px 8px', backgroundColor: '#8B5CF6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Webhook Test
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {/* Total Row */}
              <tr style={{ backgroundColor: '#F9FAFB', fontWeight: 'bold' }}>
                <td style={{ padding: '12px', fontSize: '14px', color: '#111827', fontWeight: '600' }}>
                  TOPLAM
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#111827', fontWeight: '600' }}>
                  —
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#111827', fontWeight: '600' }}>
                  —
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#111827', fontWeight: '600' }}>
                  {'—'}
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#111827', fontWeight: '600' }}>
                  {'—'}
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#111827', fontWeight: '600' }}>
                  —
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#111827', fontWeight: '600' }}>
                  —
                </td>
                <td style={{ padding: '12px', fontSize: '14px', color: '#111827', fontWeight: '600' }}>
                  —
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {detailModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(17,24,39,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '520px', backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Kanal Detayi</h4>
              <button onClick={() => setDetailModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px' }}>x</button>
            </div>
            {modalError ? (
              <div style={{ color: '#B91C1C', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '10px' }}>{modalError}</div>
            ) : !detailData ? (
              <p style={{ color: '#6B7280' }}>Yukleniyor...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                <div><strong>Kanal:</strong> {detailData.name ?? '-'}</div>
                <div><strong>Durum:</strong> {detailData.isActive ? 'Aktif' : 'Pasif'}</div>
                <div><strong>Komisyon:</strong> {detailData.commissionPct ?? '-'}%</div>
                <div><strong>Ulke:</strong> {detailData.countryCode ?? '-'}</div>
                <div style={{ gridColumn: '1 / span 2' }}><strong>Webhook IP:</strong> {Array.isArray(detailData.webhookIps) ? detailData.webhookIps.join(', ') : '-'}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {settingsModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(17,24,39,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '480px', backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Kanal Ayarlari</h4>
              <button onClick={() => setSettingsModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px' }}>x</button>
            </div>
            <p style={{ marginTop: 0, color: '#374151', fontSize: '14px' }}>{selectedChannel?.name ?? ''} komisyon guncellemesi</p>
            <label style={{ fontSize: '13px', color: '#6B7280', display: 'block', marginBottom: '6px' }}>Komisyon %</label>
            <input
              value={settingsCommission}
              onChange={(e) => setSettingsCommission(e.target.value)}
              type="number"
              min="0"
              max="100"
              step="0.01"
              style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '10px 12px', fontSize: '14px' }}
            />
            {modalError && (
              <div style={{ marginTop: '10px', color: '#B91C1C', fontSize: '13px' }}>{modalError}</div>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setSettingsModalOpen(false)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', background: '#fff', cursor: 'pointer' }}>Iptal</button>
              <button onClick={submitSettings} disabled={!!busyChannelId} style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', background: '#10B981', color: '#fff', cursor: 'pointer' }}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {webhookModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(17,24,39,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '520px', backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Webhook Test</h4>
              <button onClick={() => setWebhookModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px' }}>x</button>
            </div>
            <p style={{ marginTop: 0, color: '#374151', fontSize: '14px' }}>{selectedChannel?.name ?? ''}</p>
            {modalError ? (
              <div style={{ color: '#B91C1C', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '10px' }}>{modalError}</div>
            ) : !webhookData ? (
              <p style={{ color: '#6B7280' }}>Test calistiriliyor...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '14px' }}>
                <div><strong>IP:</strong> {webhookData.ipCheck ?? '-'}</div>
                <div><strong>HMAC:</strong> {webhookData.hmacCheck ?? '-'}</div>
                <div><strong>Idempotency:</strong> {webhookData.idempotency ?? '-'}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Simple System Health
function SimpleSystemHealth() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '24px', marginBottom: '24px' }}>
        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Sistem Durumu
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>Sağlam</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>99.9%</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            CPU Kullanımı
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#F59E0B' }}>45%</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Normal</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Bellek
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>8.2GB</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>/16GB</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Uptime
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>45d</p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Sürekli</p>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          position: 'relative'
        }}>
          {996501.23 < 1000 && (
            <div style={{ 
              position: 'absolute', 
              top: '-8px', 
              right: '-8px', 
              width: '24px', 
              height: '24px', 
              backgroundColor: '#EF4444', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              !
            </div>
          )}
          <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            TURKPIN BAKİYESİ
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
            {formatCurrency(996501.23)}
          </p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
            Son güncelleme: 16:20
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '24px' }}>
        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
            Servis Durumu
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%' }}></div>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>API Server</span>
              </div>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Çalışıyor</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%' }}></div>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>Database</span>
              </div>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Sağlam</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%' }}></div>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>Redis Cache</span>
              </div>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Aktif</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%' }}></div>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>Queue (BullMQ)</span>
              </div>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>
                Waiting: 0 | Active: 2 | Failed: 0
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', backgroundColor: '#F59E0B', borderRadius: '50%' }}></div>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>Email Service</span>
              </div>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Yavaş</span>
            </div>
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
            Webhook İstatistikleri
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', color: '#6B7280' }}>Son 24 Saat</span>
            <button style={{ padding: '4px 8px', backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
              ▾
            </button>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB' }}>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#6B7280' }}>KANAL</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontWeight: '600', color: '#6B7280' }}>ALINDI</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontWeight: '600', color: '#6B7280' }}>TAMAMLANDI</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontWeight: '600', color: '#6B7280' }}>BAŞARISIZ</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontWeight: '600', color: '#6B7280' }}>DUPLICATE</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontWeight: '600', color: '#6B7280' }}>ENGELLENDİ</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ backgroundColor: '#FEF3C7' }}>
                  <td style={{ padding: '8px', fontWeight: '500' }}>Trendyol</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>320</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>318</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#D97706' }}>1</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#D97706' }}>1</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>0</td>
                </tr>
                <tr style={{ backgroundColor: '#FEF3C7' }}>
                  <td style={{ padding: '8px', fontWeight: '500' }}>Ozan</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>180</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>179</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>0</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#D97706' }}>1</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>0</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: '500' }}>Migros</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>90</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>90</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>0</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>0</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>0</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E5E7EB', 
        borderRadius: '8px', 
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
            Performans Metrikleri
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: '#6B7280' }}>
              Otomatik yenileme: 60sn
            </span>
            <button style={{ 
              padding: '8px 16px', 
              backgroundColor: '#3B82F6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: '14px',
              cursor: 'pointer'
            }}>
              ↻ Yenile
            </button>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>Response Time</h4>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981', marginBottom: '8px' }}>124ms</div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: '85%', height: '100%', backgroundColor: '#10B981' }}></div>
            </div>
            <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>Avg: 156ms</p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>Throughput</h4>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3B82F6', marginBottom: '8px' }}>1,245/s</div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: '75%', height: '100%', backgroundColor: '#3B82F6' }}></div>
            </div>
            <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>Peak: 1,890/s</p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>Error Rate</h4>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981', marginBottom: '8px' }}>0.2%</div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: '2%', height: '100%', backgroundColor: '#10B981' }}></div>
            </div>
            <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>24 errors/hr</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <LayoutWithSidebar>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<SimpleDashboard />} />
        <Route path="/orders" element={<SimpleOrders />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products2" element={<ProductManagement />} />
        <Route path="/product-management" element={<ProductManagement />} />
        <Route path="/providers" element={<SimpleProviders />} />
        <Route path="/channels" element={<SimpleChannels />} />
        <Route path="/excess-codes" element={<ExcessCodes />} />
        <Route path="/system-health" element={<SystemHealth />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </LayoutWithSidebar>
  )
}

export default App
