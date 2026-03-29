import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  DollarSign,
  Users,
  ArrowUp,
  Server,
  ToggleLeft,
  ToggleRight,
  BarChart3,
  FileText
} from 'lucide-react'
import { formatCurrency, formatNumber } from '../lib/utils'
import { toast } from 'sonner'
import api from '../lib/api'

export function Reports() {
  const [activeTab, setActiveTab] = useState('revenue-trend')
  const [months, setMonths] = useState(6)

  // Revenue trend query
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['reports-revenue-trend', months],
    queryFn: async () => {
      const response = await api.get(`/reports/revenue-trend?months=${months}`)
      return response.data as { data: Array<{ month: string; revenue: number; profit: number; orderCount: number }> }
    }
  })

  const tabs = [
    { id: 'revenue-trend', label: 'Gelir Trendi', icon: TrendingUp },
    { id: 'channel-performance', label: 'Kanal Performansı', icon: Users },
    { id: 'provider-cost', label: 'Provider Maliyeti', icon: Package },
    { id: 'product-performance', label: 'Ürün Analizi', icon: ShoppingCart },
    { id: 'hourly-distribution', label: 'Sipariş Yoğunluğu', icon: BarChart3 }
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', color: '#1e293b', padding: '24px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>Raporlar</h1>
          <p style={{ color: '#64748b' }}>Gelişmiş analiz ve raporlama</p>
        </div>

        {/* Debug Info */}
        <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <p style={{ color: '#1e293b', margin: '4px 0' }}>Active Tab: {activeTab}</p>
          <p style={{ color: '#1e293b', margin: '4px 0' }}>Revenue Data Length: {revenueData?.data?.length || 0}</p>
          <p style={{ color: '#1e293b', margin: '4px 0' }}>Loading: {revenueLoading ? 'Yes' : 'No'}</p>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <nav style={{ display: 'flex', gap: '32px' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 4px',
                  borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                  fontWeight: '500',
                  fontSize: '14px',
                  color: activeTab === tab.id ? '#3b82f6' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <tab.icon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  {tab.label}
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '24px', border: '1px solid #e2e8f0' }}>
          {activeTab === 'revenue-trend' && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Gelir Trendi</h2>
              {revenueLoading ? (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <div style={{ color: '#1e293b' }}>Yükleniyor...</div>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', color: '#1e293b', marginBottom: '8px' }}>Periyot:</label>
                    <select
                      value={months}
                      onChange={(e) => setMonths(Number(e.target.value))}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#1e293b'
                      }}
                    >
                      <option value={3}>Son 3 Ay</option>
                      <option value={6}>Son 6 Ay</option>
                      <option value={12}>Son 12 Ay</option>
                    </select>
                  </div>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ textAlign: 'left', padding: '12px 16px', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ay</th>
                          <th style={{ textAlign: 'left', padding: '12px 16px', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gelir</th>
                          <th style={{ textAlign: 'left', padding: '12px 16px', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kar</th>
                          <th style={{ textAlign: 'left', padding: '12px 16px', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sipariş</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueData?.data?.map((item) => (
                          <tr key={item.month} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '12px 16px', color: '#1e293b' }}>{item.month}</td>
                            <td style={{ padding: '12px 16px', color: '#1e293b' }}>{formatCurrency(item.revenue)}</td>
                            <td style={{ padding: '12px 16px', color: '#1e293b' }}>{formatCurrency(item.profit)}</td>
                            <td style={{ padding: '12px 16px', color: '#1e293b' }}>{item.orderCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'channel-performance' && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Kanal Performansı</h2>
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <p style={{ color: '#1e293b' }}>Kanal performans verileri burada gösterilecek</p>
              </div>
            </div>
          )}

          {activeTab === 'provider-cost' && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Provider Maliyeti</h2>
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <p style={{ color: '#1e293b' }}>Provider maliyet verileri burada gösterilecek</p>
              </div>
            </div>
          )}

          {activeTab === 'product-performance' && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Ürün Performansı</h2>
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <p style={{ color: '#1e293b' }}>Ürün performans verileri burada gösterilecek</p>
              </div>
            </div>
          )}

          {activeTab === 'hourly-distribution' && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Sipariş Yoğunluğu</h2>
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <p style={{ color: '#1e293b' }}>Saatlik sipariş dağılımı burada gösterilecek</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
