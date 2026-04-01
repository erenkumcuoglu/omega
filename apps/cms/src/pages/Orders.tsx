import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Download, Calendar, Filter, Eye, Copy } from 'lucide-react'
import { formatDate, formatCurrency, copyToClipboard } from '../lib/utils'
import { toast } from 'sonner'
import api from '../lib/api'

interface Order {
  id: string
  customerName?: string
  channelName: string
  providerName: string
  productName: string
  sellingPrice: number
  status: 'PENDING' | 'FULFILLED' | 'FAILED' | 'DUPLICATE'
  digitalCodeEnc?: string
  orderedAt: string
  fulfilledAt?: string
}

export function Orders() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [channelFilter, setChannelFilter] = useState<string>('all')

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', selectedMonth, statusFilter, channelFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        month: selectedMonth,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(channelFilter !== 'all' && { channel: channelFilter }),
      })
      const response = await api.get(`/orders?${params}`)
      return response.data as Order[]
    },
  })

  const filteredOrders = orders?.filter(order =>
    order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FULFILLED': return 'badge-success'
      case 'PENDING': return 'badge-warning'
      case 'FAILED': return 'badge-error'
      case 'DUPLICATE': return 'badge-info'
      default: return 'badge-info'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'FULFILLED': return 'Teslim Edildi'
      case 'PENDING': return 'Beklemede'
      case 'FAILED': return 'Başarısız'
      case 'DUPLICATE': return 'Mükerrer'
      default: return status
    }
  }

  const copyCode = async (code: string) => {
    try {
      await copyToClipboard(code)
      toast.success('Kod kopyalandı')
    } catch (error) {
      toast.error('Kopyalama başarısız')
    }
  }

  const exportData = async (format: 'excel' | 'pdf' | 'copy') => {
    try {
      const response = await api.post('/orders/export', {
        format,
        filters: {
          month: selectedMonth,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          channel: channelFilter !== 'all' ? channelFilter : undefined,
        }
      })
      
      if (format === 'copy') {
        await copyToClipboard(response.data.data)
        toast.success('Veriler kopyalandı')
      } else {
        // Download file
        const blob = new Blob([response.data])
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `orders-${selectedMonth}.${format}`
        a.click()
        window.URL.revokeObjectURL(url)
        toast.success(`${format.toUpperCase()} dosyası indirildi`)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'İhracat başarısız')
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
          <h1 className="text-2xl font-bold">Teslim Edilenler</h1>
          <p className="text-textSecondary">Sipariş geçmişi ve kod teslimatları</p>
        </div>
        <div className="flex gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input"
          />
          <button
            onClick={() => exportData('excel')}
            className="btn btn-outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Excel
          </button>
          <button
            onClick={() => exportData('pdf')}
            className="btn btn-outline"
          >
            <Download className="h-4 w-4 mr-2" />
            PDF
          </button>
          <button
            onClick={() => exportData('copy')}
            className="btn btn-outline"
          >
            <Copy className="h-4 w-4 mr-2" />
            Kopyala
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-textSecondary" />
            <input
              type="text"
              placeholder="İsim veya sipariş ID ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="FULFILLED">Teslim Edildi</option>
            <option value="PENDING">Beklemede</option>
            <option value="FAILED">Başarısız</option>
            <option value="DUPLICATE">Mükerrer</option>
          </select>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="select"
          >
            <option value="all">Tüm Kanallar</option>
            <option value="trendyol">Trendyol</option>
            <option value="hepsiburada">Hepsiburada</option>
            <option value="ozan">Ozan</option>
            <option value="ozon">Ozon</option>
          </select>

          <div className="flex items-center text-sm text-textSecondary">
            <Calendar className="h-4 w-4 mr-2" />
            {filteredOrders.length} sipariş
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="table-header">
                <th className="table-head">Sipariş Tarihi</th>
                <th className="table-head">Kanal</th>
                <th className="table-head">Provider</th>
                <th className="table-head">İsim</th>
                <th className="table-head">Ürün</th>
                <th className="table-head">Fiyat</th>
                <th className="table-head">Durum</th>
                <th className="table-head">Kod</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="table-row">
                  <td className="table-cell">
                    <div>
                      <div>{formatDate(order.orderedAt)}</div>
                      {order.fulfilledAt && (
                        <div className="text-xs text-textSecondary">
                          Teslim: {formatDate(order.fulfilledAt)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">{order.channelName}</td>
                  <td className="table-cell">{order.providerName}</td>
                  <td className="table-cell">{order.customerName || '-'}</td>
                  <td className="table-cell">{order.productName}</td>
                  <td className="table-cell">{formatCurrency(order.sellingPrice)}</td>
                  <td className="table-cell">
                    <span className={`badge ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className="table-cell">
                    {order.digitalCodeEnc ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono bg-surface px-2 py-1 rounded">
                          ••••••••
                        </span>
                        <button
                          onClick={() => copyCode(order.digitalCodeEnc!)}
                          className="btn btn-ghost btn-sm"
                          title="Kodu kopyala"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-textSecondary">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-textSecondary">Kayıt bulunamadı</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
