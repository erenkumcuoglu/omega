import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Filter, Search, Download, FileSpreadsheet, FileText, CheckCircle, XCircle } from 'lucide-react'
import { formatDate } from '../lib/utils'
import { toast } from 'sonner'
import api from '../lib/api'

interface OzanOrder {
  orderedAt: string
  provider: string
  productName: string
  sellingPrice: number
  commissionPct: number
  commissionAmount: number
  orderTotal: number
  status: 'Başarılı' | 'Başarısız'
  orderId: string
}

interface OzanSummary {
  totalCodes: number
  byProduct: Array<{
    productName: string
    count: number
  }>
}

export function OzanOrders() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [selectedWeek, setSelectedWeek] = useState<string>('')

  // Get orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['ozan-orders', selectedMonth, selectedWeek],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedMonth) params.append('month', selectedMonth)
      
      const response = await api.get(`/ozan/orders?${params.toString()}`)
      return response.data
    }
  })

  // Get summary
  const { data: summaryData } = useQuery({
    queryKey: ['ozan-summary', selectedMonth],
    queryFn: async () => {
      const response = await api.get(`/ozan/summary?month=${selectedMonth}`)
      return response.data as OzanSummary
    }
  })

  // Export functions
  const exportToExcel = () => {
    toast.success('Excel dışa aktarımı başlatıldı')
    // Implementation would go here
  }

  const exportToPDF = () => {
    toast.success('PDF dışa aktarımı başlatıldı')
    // Implementation would go here
  }

  const copyToClipboard = () => {
    const data = ordersData?.orders?.map((order: OzanOrder) => 
      `${order.orderedAt}\t${order.provider}\t${order.productName}\t${order.sellingPrice}\t${order.commissionPct}%\t${order.commissionAmount}\t${order.orderTotal}\t${order.status}\t${order.orderId}`
    ).join('\n') || ''
    
    navigator.clipboard.writeText(data)
    toast.success('Panoya kopyalandı')
  }

  // Filter orders based on search
  const filteredOrders = ordersData?.orders?.filter((order: OzanOrder) =>
    order.orderId.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  // Get week options
  const getWeekOptions = () => {
    const options = [
      { value: '', label: 'Tüm Haftalar' },
      { value: '1', label: '1. Hafta' },
      { value: '2', label: '2. Hafta' },
      { value: '3', label: '3. Hafta' },
      { value: '4', label: '4. Hafta' }
    ]
    return options
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Teslim Edilenler</h1>
        <p className="text-gray-400">Ozan App sipariş geçmişi</p>
      </div>

      {/* Summary Cards */}
      <div className="card">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Özet</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Satılan Kod Adedi</p>
              <p className="text-2xl font-bold text-gray-100">{summaryData?.totalCodes || 0}</p>
            </div>
          </div>
          
          {/* Product Breakdown */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="text-gray-400 text-sm mb-3">Ürün Kırılımı</p>
            <div className="space-y-2">
              {summaryData?.byProduct?.map((product, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-100">{product.productName}</span>
                  <span className="text-gray-100 font-medium">{product.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-100">Sipariş Detayları</h2>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={exportToExcel}
              className="btn btn-secondary flex items-center"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </button>
            <button
              onClick={exportToPDF}
              className="btn btn-secondary flex items-center"
            >
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </button>
            <button
              onClick={copyToClipboard}
              className="btn btn-secondary flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Kopyala
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-gray-400 text-sm block mb-2">Ay Filtresi</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm block mb-2">Hafta Filtresi</label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="input"
            >
              {getWeekOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-sm block mb-2">Arama</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Sipariş ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Sipariş Tarihi</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Provider</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Ürün Adı</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Fiyat</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Kanal Komisyonu %</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Komisyon Bedeli</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Sipariş Toplam</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Durum</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Sipariş ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order: OzanOrder, index: number) => (
                <tr
                  key={order.orderId}
                  className={`border-b ${
                    index % 2 === 0 ? 'border-gray-800' : 'border-gray-700'
                  } hover:bg-gray-800/50 transition-colors`}
                >
                  <td className="py-3 px-4 text-gray-100">{order.orderedAt}</td>
                  <td className="py-3 px-4 text-gray-100">{order.provider}</td>
                  <td className="py-3 px-4 text-gray-100 font-medium">{order.productName}</td>
                  <td className="py-3 px-4 text-gray-100">₺{order.sellingPrice}</td>
                  <td className="py-3 px-4 text-gray-100">%{order.commissionPct}</td>
                  <td className="py-3 px-4 text-gray-100">₺{order.commissionAmount}</td>
                  <td className="py-3 px-4 text-gray-100 font-medium">₺{order.orderTotal}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'Başarılı'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {order.status === 'Başarılı' ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-100 font-mono text-sm">{order.orderId}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredOrders.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              {ordersLoading ? 'Yükleniyor...' : 'Arama kriterlerinize uygun sipariş bulunamadı'}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            Toplam {filteredOrders.length} sipariş gösteriliyor
          </div>
          <div className="flex space-x-2">
            <button className="btn btn-secondary" disabled>Önceki</button>
            <button className="btn btn-primary">1</button>
            <button className="btn btn-secondary" disabled>Sonraki</button>
          </div>
        </div>
      </div>
    </div>
  )
}
