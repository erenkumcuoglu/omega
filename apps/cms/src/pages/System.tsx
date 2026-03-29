import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Settings, Database, Server, Clock, CheckCircle, XCircle } from 'lucide-react'
import api from '../lib/api'

interface SystemHealth {
  database: {
    status: 'healthy' | 'error'
    connectionCount: number
    responseTime: number
  }
  redis: {
    status: 'healthy' | 'error'
    memory: string
    connectedClients: number
  }
  queue: {
    status: 'healthy' | 'error'
    activeJobs: number
    failedJobs: number
    completedJobs: number
  }
  uptime: number
  version: string
}

export function System() {
  const { data: health, isLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await api.get('/system/health')
      return response.data as SystemHealth
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) {
      return `${days} gün ${hours} saat`
    } else if (hours > 0) {
      return `${hours} saat ${minutes} dakika`
    } else {
      return `${minutes} dakika`
    }
  }

  const getStatusIcon = (status: string) => {
    return status === 'healthy' ? (
      <CheckCircle className="h-5 w-5 text-success" />
    ) : (
      <XCircle className="h-5 w-5 text-error" />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-20"></div>
        <div className="card">
          <div className="skeleton h-96"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Sistem</h1>
          <p className="text-textSecondary">Sistem durumu ve performans metrikleri</p>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-textSecondary">Sistem Durumu</p>
              <p className="text-lg font-semibold">Aktif</p>
            </div>
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-textSecondary">Çalışma Süresi</p>
              <p className="text-lg font-semibold">
                {health ? formatUptime(health.uptime) : '-'}
              </p>
            </div>
            <Clock className="h-8 w-8 text-info" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-textSecondary">Versiyon</p>
              <p className="text-lg font-semibold">v{health?.version || '1.0.0'}</p>
            </div>
            <Settings className="h-8 w-8 text-warning" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-textSecondary">Son Güncelleme</p>
              <p className="text-lg font-semibold">Şimdi</p>
            </div>
            <div className="h-8 w-8 bg-accent/10 rounded-full flex items-center justify-center">
              <span className="text-accent font-bold">Ω</span>
            </div>
          </div>
        </div>
      </div>

      {/* Service Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Database */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Veritabanı
            </h2>
            {health && getStatusIcon(health.database.status)}
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-textSecondary">Durum</span>
              <span className={`font-medium ${health?.database.status === 'healthy' ? 'text-success' : 'text-error'}`}>
                {health?.database.status === 'healthy' ? 'Sağlıklı' : 'Hatalı'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-textSecondary">Bağlantı Sayısı</span>
              <span className="font-medium">{health?.database.connectionCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textSecondary">Yanıt Süresi</span>
              <span className="font-medium">{health?.database.responseTime}ms</span>
            </div>
          </div>
        </div>

        {/* Redis */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Server className="h-5 w-5 mr-2" />
              Redis
            </h2>
            {health && getStatusIcon(health.redis.status)}
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-textSecondary">Durum</span>
              <span className={`font-medium ${health?.redis.status === 'healthy' ? 'text-success' : 'text-error'}`}>
                {health?.redis.status === 'healthy' ? 'Sağlıklı' : 'Hatalı'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-textSecondary">Bellek Kullanımı</span>
              <span className="font-medium">{health?.redis.memory}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textSecondary">Bağlı İstemciler</span>
              <span className="font-medium">{health?.redis.connectedClients}</span>
            </div>
          </div>
        </div>

        {/* Queue */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Kuyruk
            </h2>
            {health && getStatusIcon(health.queue.status)}
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-textSecondary">Durum</span>
              <span className={`font-medium ${health?.queue.status === 'healthy' ? 'text-success' : 'text-error'}`}>
                {health?.queue.status === 'healthy' ? 'Sağlıklı' : 'Hatalı'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-textSecondary">Aktif İşler</span>
              <span className="font-medium">{health?.queue.activeJobs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textSecondary">Tamamlanan</span>
              <span className="font-medium">{health?.queue.completedJobs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textSecondary">Başarısız</span>
              <span className="font-medium text-error">{health?.queue.failedJobs}</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Sistem Bilgileri</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-2">Yapılandırma</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-textSecondary">Ortam</span>
                <span>Production</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSecondary">Node.js</span>
                <span>v20.x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSecondary">Platform</span>
                <span>Linux</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Özellikler</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-textSecondary">JWT Doğrulama</span>
                <span className="text-success">Aktif</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSecondary">Rate Limiting</span>
                <span className="text-success">Aktif</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSecondary">IP Whitelist</span>
                <span className="text-success">Aktif</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSecondary">HMAC Doğrulama</span>
                <span className="text-success">Aktif</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
