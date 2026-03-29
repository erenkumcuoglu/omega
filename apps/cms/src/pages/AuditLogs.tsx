import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Calendar, Filter, FileText } from 'lucide-react'
import { formatDate } from '../lib/utils'
import api from '../lib/api'

interface AuditLog {
  id: string
  action: string
  entity: string
  entityId?: string
  meta: any
  ip: string
  createdAt: string
}

export function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', actionFilter, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(actionFilter !== 'all' && { action: actionFilter }),
        ...(fromDate && { from: fromDate }),
        ...(toDate && { to: toDate }),
      })
      const response = await api.get(`/audit-logs?${params}`)
      return response.data as AuditLog[]
    },
  })

  const filteredLogs = logs?.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.ip.includes(searchTerm)
  ) || []

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LOGIN': return 'badge-success'
      case 'LOGOUT': return 'badge-info'
      case 'CODE_FETCH': return 'badge-warning'
      case 'WEBHOOK_BLOCKED': return 'badge-error'
      case 'RATE_LIMIT_HIT': return 'badge-error'
      default: return 'badge-info'
    }
  }

  const getActionText = (action: string) => {
    switch (action) {
      case 'LOGIN': return 'Giriş'
      case 'LOGOUT': return 'Çıkış'
      case 'CODE_FETCH': return 'Kod Çekme'
      case 'PRICE_UPDATE': return 'Fiyat Güncelleme'
      case 'MARGIN_UPDATE': return 'Marj Güncelleme'
      case 'TOGGLE_CHANGE': return 'Durum Değişikliği'
      case 'WEBHOOK_BLOCKED': return 'Webhook Engellendi'
      case 'DUPLICATE_ORDER': return 'Mükerrer Sipariş'
      case 'RATE_LIMIT_HIT': return 'Rate Limit Aşıldı'
      default: return action
    }
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
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-textSecondary">Sistem olayları ve güvenlik kayıtları</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-textSecondary" />
            <input
              type="text"
              placeholder="Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="select"
          >
            <option value="all">Tüm Eylemler</option>
            <option value="LOGIN">Giriş</option>
            <option value="LOGOUT">Çıkış</option>
            <option value="CODE_FETCH">Kod Çekme</option>
            <option value="PRICE_UPDATE">Fiyat Güncelleme</option>
            <option value="WEBHOOK_BLOCKED">Webhook Engellendi</option>
            <option value="RATE_LIMIT_HIT">Rate Limit</option>
          </select>

          <div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="input"
              placeholder="Başlangıç"
            />
          </div>

          <div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="input"
              placeholder="Bitiş"
            />
          </div>

          <div className="flex items-center text-sm text-textSecondary">
            <FileText className="h-4 w-4 mr-2" />
            {filteredLogs.length} kayıt
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="table-header">
                <th className="table-head">Tarih</th>
                <th className="table-head">Eylem</th>
                <th className="table-head">Varlık</th>
                <th className="table-head">IP</th>
                <th className="table-head">Detaylar</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="table-row">
                  <td className="table-cell">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${getActionColor(log.action)}`}>
                      {getActionText(log.action)}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div>
                      <div>{log.entity}</div>
                      {log.entityId && (
                        <div className="text-xs text-textSecondary font-mono">
                          {log.entityId.slice(0, 8)}...
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="table-cell font-mono text-sm">
                    {log.ip}
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-textSecondary max-w-xs truncate">
                      {JSON.stringify(log.meta)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-textSecondary">Kayıt bulunamadı</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
