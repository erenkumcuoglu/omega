import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Filter, Search, Download, FileSpreadsheet, FileText, CheckCircle, XCircle } from 'lucide-react'
import { formatDate } from '../lib/utils'
import { toast } from 'sonner'
import api from '../lib/api'

interface MartiOrder {
  orderedAt: string
  denomination: string
  transactionId: string
  merchantId: string
  martiCode: string
  status: 'Başarılı' | 'Başarısız'
}

interface MartiSummary {
  total: number
  byDenomination: {
    [denomination: string]: number
  }
}

export function MartiOrders() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [selectedDenomination, setSelectedDenomination] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  // Get orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['marti-orders', selectedMonth, selectedDenomination, selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedMonth) params.append('month', selectedMonth)
      if (selectedDenomination) params.append('denomination', selectedDenomination)
      if (selectedStatus) params.append('status', selectedStatus)
      
      const response = await api.get(`/marti/orders?${params.toString()}`)
      return response.data
    }
  })

  // Get summary
  const { data: summaryData } = useQuery({
    queryKey: ['marti-summary', selectedMonth],
    queryFn: async () => {
      const response = await api.get(`/marti/summary?month=${selectedMonth}`)
      return response.data as MartiSummary
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
    const data = ordersData?.orders?.map((order: MartiOrder) => 
      `${order.orderedAt}\t${order.denomination}\t${order.transactionId}\t${order.merchantId}\t${order.martiCode}\t${order.status}`
    ).join('\n') || ''
    
    navigator.clipboard.writeText(data)
    toast.success('Panoya kopyalandı')
  }

  // Filter orders based on search
  const filteredOrders = ordersData?.orders?.filter((order: MartiOrder) =>
    order.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.merchantId.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Teslim Edilenler</h1>
        <p className="text-gray-400">Martı teslimatları ve sipariş geçmişi</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-500/20 rounded-full mr-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Başarılı Siparişler</p>
              <p className="text-2xl font-bold text-gray-100">{summaryData?.total || 0}</p>
            </div>
          </div>
        </div>

        {Object.entries(summaryData?.byDenomination || {}).map(([denomination, count]) => (
          <div key={denomination} className="card">
            <div className="flex items-center">
              <div className="p-3 bg-blue-500/20 rounded-full mr-4">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Martı {denomination}</p>
                <p className="text-2xl font-bold text-gray-100">{count}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-100">Siparişler</h2>
          
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
            <label className="text-gray-400 text-sm block mb-2">Değer</label>
            <select
              value={selectedDenomination}
              onChange={(e) => setSelectedDenomination(e.target.value)}
              className="input"
            >
              <option value="">Tümü</option>
              <option value="25">25 TL</option>
              <option value="50">50 TL</option>
              <option value="100">100 TL</option>
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-sm block mb-2">Durum</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input"
            >
              <option value="">Tümü</option>
              <option value="Başarılı">Başarılı</option>
              <option value="Başarısız">Başarısız</option>
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-sm block mb-2">Arama</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Transaction ID veya Merchant ID"
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
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Transaction ID</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Ürün Adı</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Tarih</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Merchant ID</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Martı Kod</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order: MartiOrder, index: number) => (
                <tr
                  key={order.transactionId}
                  className={`border-b ${
                    index % 2 === 0 ? 'border-gray-800' : 'border-gray-700'
                  } hover:bg-gray-800/50 transition-colors`}
                >
                  <td className="py-3 px-4 text-gray-100 font-mono text-sm">{order.transactionId}</td>
                  <td className="py-3 px-4 text-gray-100 font-medium">{order.denomination}</td>
                  <td className="py-3 px-4 text-gray-100">{order.orderedAt}</td>
                  <td className="py-3 px-4 text-gray-100 font-mono text-sm">{order.merchantId}</td>
                  <td className="py-3 px-4 text-gray-100 font-mono text-sm">{order.martiCode}</td>
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
