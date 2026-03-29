import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Server, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import api from '../lib/api'

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'down'
  timestamp: string
  services: {
    turkpin: {
      status: 'healthy' | 'error'
      latencyMs: number
      balance?: number
    }
    api: {
      status: 'healthy'
      uptime: number
    }
  }
}

export function SystemHealth() {
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Public health check (no auth required)
  const { data: publicHealth, isLoading, refetch } = useQuery({
    queryKey: ['system-health-public'],
    queryFn: async () => {
      const response = await api.get('/system/health')
      return response.data as HealthCheck
    },
    refetchInterval: 60000 // Refresh every 60 seconds
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'error':
      case 'down':
        return <XCircle className="w-5 h-5 text-red-400" />
      default:
        return <RefreshCw className="w-5 h-5 text-yellow-400" />
    }
  }

  const getLatencyColor = (latency: number) => {
    if (latency < 200) return 'text-green-400'
    if (latency < 500) return 'text-yellow-400'
    return 'text-red-400'
  }

  const handleRefresh = async () => {
    await refetch()
    setLastRefresh(new Date())
    toast.success('Sistem durumu güncellendi')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Sistem Sağlığı</h1>
          <p className="text-gray-400">Son güncelleme: {lastRefresh.toLocaleString('tr-TR')}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {/* Turkpin API */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Server className="w-5 h-5 text-green-400 mr-2" />
            <span className="text-gray-100 font-medium">Turkpin API</span>
          </div>
          {publicHealth?.services.turkpin && getStatusIcon(publicHealth.services.turkpin.status)}
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${getLatencyColor(publicHealth?.services.turkpin?.latencyMs || 0)}`}>
            {publicHealth?.services.turkpin?.latencyMs || 0}ms
          </div>
          <div className="text-sm text-gray-400">
            Bakiye: {publicHealth?.services.turkpin?.balance ? 
              new Intl.NumberFormat('tr-TR').format(publicHealth.services.turkpin.balance) + ' TL' : 
              'Yok'
            }
          </div>
        </div>
      </div>

      {/* API Status */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Server className="w-5 h-5 text-green-400 mr-2" />
            <span className="text-gray-100 font-medium">Backend API</span>
          </div>
          {publicHealth?.services.api && getStatusIcon(publicHealth.services.api.status)}
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">
            {Math.floor(publicHealth?.services.api?.uptime || 0)}s
          </div>
          <div className="text-sm text-gray-400">
            Çalışma Süresi
          </div>
        </div>
      </div>
    </div>
  )
}
