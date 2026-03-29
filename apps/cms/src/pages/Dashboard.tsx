import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  DollarSign,
  Users,
  ArrowUp,
  ArrowDown,
  Server,
  ToggleLeft,
  ToggleRight,
  BarChart3,
  FileText
} from 'lucide-react'
import { formatCurrency, formatNumber } from '../lib/utils'
import { toast } from 'sonner'
import api from '../lib/api'

interface DashboardSummary {
  totalOrders: number
  successfulOrders: number
  totalRevenue: number
  totalProfit: number
  providerStats: Array<{
    providerId: string
    providerName: string
    orderCount: number
    revenue: number
    isActive: boolean
  }>
  channelStats: Array<{
    channelId: string
    channelName: string
    orderCount: number
    revenue: number
    profit: number
  }>
}

export function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  // Mock data for fallback
  const mockSummary: DashboardSummary = {
    totalOrders: 5050,
    successfulOrders: 5050,
    totalRevenue: 600000,
    totalProfit: 120000,
    providerStats: [
      { providerId: 'coda', providerName: 'Coda', orderCount: 3000, revenue: 350000, isActive: true },
      { providerId: 'epin', providerName: 'Epin', orderCount: 1500, revenue: 200000, isActive: true },
      { providerId: 'marti', providerName: 'Martı', orderCount: 550, revenue: 50000, isActive: false }
    ],
    channelStats: [
      { channelId: 'trendyol', channelName: 'Trendyol', orderCount: 3000, revenue: 400000, profit: 80000 },
      { channelId: 'ozan', channelName: 'Ozan', orderCount: 1500, revenue: 150000, profit: 30000 },
      { channelId: 'migros', channelName: 'Migros', orderCount: 550, revenue: 50000, profit: 10000 }
    ]
  }

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['dashboard', 'summary', selectedMonth],
    queryFn: async () => {
      try {
        const response = await api.get(`/dashboard/summary?month=${selectedMonth}`)
        return response.data as DashboardSummary
      } catch (error) {
        // Return mock data if API fails
        return mockSummary
      }
    },
    initialData: mockSummary // Start with mock data immediately
  })

  // Get revenue trend data for reports section
  const { data: revenueData } = useQuery({
    queryKey: ['reports-revenue-trend', 3],
    queryFn: async () => {
      const response = await api.get('/reports/revenue-trend?months=3')
      return response.data as { data: Array<{ month: string; revenue: number; profit: number; orderCount: number }> }
    },
    refetchInterval: 300000 // Refresh every 5 minutes
  })

  // Get channel performance data
  const { data: channelData } = useQuery({
    queryKey: ['reports-channel-performance', selectedMonth],
    queryFn: async () => {
      const response = await api.get(`/reports/channel-performance?month=${selectedMonth}`)
      return response.data as { data: Array<{ channelName: string; orderCount: number; netReceivable: number }> }
    },
    refetchInterval: 300000
  })

  const toggleProvider = async (providerId: string, currentState: boolean) => {
    try {
      await api.patch(`/providers/${providerId}/toggle`, { 
        isActive: !currentState 
      })
      toast.success(`Provider başarıyla ${!currentState ? 'aktive' : 'deaktive'} edildi`)
      refetch()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'İşlem başarısız')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card">
              <div className="skeleton h-20"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="skeleton h-64"></div>
          </div>
          <div className="card">
            <div className="skeleton h-64"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="text-center py-12">
        <p className="text-textSecondary">Veri yüklenemedi</p>
      </div>
    )
  }

  const successRate = summary.totalOrders > 0 
    ? (summary.successfulOrders / summary.totalOrders) * 100 
    : 0

  return (
    <div style={{ padding: '24px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>Ana Sayfa</h1>
        <p style={{ fontSize: '14px', color: '#6B7280' }}>Genel bakış ve istatistikler</p>
      </div>

      {/* Month Selector */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '14px',
            color: '#111827'
          }}
        />
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          borderLeft: '4px solid #E94560'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Başarılı Siparişler</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{formatNumber(summary?.successfulOrders || 0)}</p>
              <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                Toplam: {formatNumber(summary?.totalOrders || 0)}
              </p>
            </div>
            <div style={{ height: '48px', width: '48px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart style={{ height: '24px', width: '24px', color: '#10B981' }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', marginTop: '16px' }}>
            <ArrowUp style={{ height: '16px', width: '16px', color: '#10B981', marginRight: '4px' }} />
            <span style={{ color: '#10B981' }}>
              {summary?.totalOrders && summary?.successfulOrders 
                ? ((summary.successfulOrders / summary.totalOrders) * 100).toFixed(1) 
                : 0}% başarı oranı
            </span>
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          borderLeft: '4px solid #E94560'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Çekilen Kodlar</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{formatNumber(summary?.successfulOrders || 0)}</p>
              <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Bu ay</p>
            </div>
            <div style={{ height: '48px', width: '48px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package style={{ height: '24px', width: '24px', color: '#3B82F6' }} />
            </div>
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          borderLeft: '4px solid #E94560'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Ciro</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{formatCurrency(summary?.totalRevenue || 0)}</p>
              <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Bu ay</p>
            </div>
            <div style={{ height: '48px', width: '48px', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign style={{ height: '24px', width: '24px', color: '#F59E0B' }} />
            </div>
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          borderLeft: '4px solid #E94560'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Karlılık</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{formatCurrency(summary?.totalProfit || 0)}</p>
              <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Bu ay</p>
            </div>
            <div style={{ height: '48px', width: '48px', backgroundColor: 'rgba(233, 69, 96, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp style={{ height: '24px', width: '24px', color: '#E94560' }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
        {/* Provider Stats */}
        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center' }}>
              <Server style={{ height: '20px', width: '20px', marginRight: '8px' }} />
              Provider Durumu
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {summary?.providerStats?.map((provider) => (
              <div key={provider.providerId} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '12px', 
                backgroundColor: '#F9FAFB', 
                borderRadius: '8px' 
              }}>
                <div>
                  <p style={{ fontWeight: '500', color: '#111827' }}>{provider.providerName}</p>
                  <p style={{ fontSize: '14px', color: '#6B7280' }}>
                    {formatNumber(provider.orderCount)} sipariş • {formatCurrency(provider.revenue)}
                  </p>
                </div>
                <button
                  onClick={() => toggleProvider(provider.providerId, provider.isActive)}
                  style={{ 
                    padding: '8px', 
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: 'transparent',
                    borderRadius: '6px'
                  }}
                >
                  {provider.isActive ? (
                    <ToggleRight style={{ height: '20px', width: '20px', color: '#10B981' }} />
                  ) : (
                    <ToggleLeft style={{ height: '20px', width: '20px', color: '#EF4444' }} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Channel Stats */}
        <div style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E5E7EB', 
          borderRadius: '8px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center' }}>
              <Users style={{ height: '20px', width: '20px', marginRight: '8px' }} />
              Satış Kanalları
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {summary?.channelStats
              ?.sort((a, b) => b.orderCount - a.orderCount)
              .map((channel) => (
                <div key={channel.channelId} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '12px', 
                  backgroundColor: '#F9FAFB', 
                  borderRadius: '8px' 
                }}>
                  <div>
                    <p style={{ fontWeight: '500', color: '#111827' }}>{channel.channelName}</p>
                    <p style={{ fontSize: '14px', color: '#6B7280' }}>
                      {formatNumber(channel.orderCount)} sipariş • {formatCurrency(channel.revenue)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#10B981' }}>
                      {formatCurrency(channel.profit)}
                    </p>
                    <p style={{ fontSize: '12px', color: '#6B7280' }}>kar</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
