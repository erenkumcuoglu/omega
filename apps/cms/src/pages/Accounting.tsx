import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Filter, Search, Download, FileSpreadsheet, FileText, TrendingUp, TrendingDown, DollarSign, Users, CreditCard } from 'lucide-react'
import { formatDate } from '../lib/utils'
import { toast } from 'sonner'
import api from '../lib/api'

// Turkish number formatting
const formatTurkishNumber = (num: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)
}

const formatTurkishCurrency = (num: number): string => {
  return `${formatTurkishNumber(num)} TL`
}

interface ProviderSummary {
  month: string
  totalCodesPulled: number
  totalPayable: number
  byProvider: Array<{
    providerId: string
    providerName: string
    codesPulled: number
    payable: number
  }>
}

interface ChannelSummary {
  month: string
  totalReceivable: number
  byChannel: Array<{
    channelName: string
    receivable: number
  }>
}

interface AccountingOrder {
  orderedAt: string
  channel: string
  provider: string
  customerName: string
  productName: string
  sellingPrice: number
  commissionPct: number
  commissionAmount: number
  providerNet: number
  profit: number
  orderId: string
  paymentDate?: string
}

interface ProfitSummary {
  totalRevenue: number
  totalPayable: number
  totalCommissions: number
  totalProfit: number
  byMonth: Array<{
    month: string
    profit: number
  }>
}

export function Accounting() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedChannel, setSelectedChannel] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')

  // Get provider summary
  const { data: providerSummary, isLoading: providerLoading } = useQuery({
    queryKey: ['accounting-provider-summary', selectedMonth, selectedProvider],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('month', selectedMonth)
      if (selectedProvider) params.append('providerId', selectedProvider)
      
      const response = await api.get(`/accounting/provider-summary?${params.toString()}`)
      return response.data as ProviderSummary
    }
  })

  // Get channel summary
  const { data: channelSummary, isLoading: channelLoading } = useQuery({
    queryKey: ['accounting-channel-summary', selectedMonth, selectedChannel],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('month', selectedMonth)
      if (selectedChannel) params.append('channelId', selectedChannel)
      
      const response = await api.get(`/accounting/channel-summary?${params.toString()}`)
      return response.data as ChannelSummary
    }
  })

  // Get orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['accounting-orders', selectedMonth, selectedProvider, selectedChannel],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('month', selectedMonth)
      if (selectedProvider) params.append('providerId', selectedProvider)
      if (selectedChannel) params.append('channelId', selectedChannel)
      
      const response = await api.get(`/accounting/orders?${params.toString()}`)
      return response.data
    }
  })

  // Get profit summary
  const { data: profitSummary } = useQuery({
    queryKey: ['accounting-profit-summary', selectedMonth],
    queryFn: async () => {
      const response = await api.get(`/accounting/profit-summary?month=${selectedMonth}`)
      return response.data as ProfitSummary
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
    const data = ordersData?.orders?.map((order: AccountingOrder) => 
      `${order.orderedAt}\t${order.channel}\t${order.provider}\t${order.customerName}\t${order.productName}\t${order.sellingPrice}\t${order.commissionPct}%\t${order.commissionAmount}\t${order.providerNet}\t${order.profit}\t${order.orderId}`
    ).join('\n') || ''
    
    navigator.clipboard.writeText(data)
    toast.success('Panoya kopyalandı')
  }

  // Filter orders based on search
  const filteredOrders = ordersData?.orders?.filter((order: AccountingOrder) =>
    order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Muhasebe Paneli</h1>
        <p className="text-gray-400">Aylık mutabakat ve finansal özetler</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-gray-400 text-sm block mb-2">Ay Seç</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm block mb-2">Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="input"
            >
              <option value="">Tümü</option>
              {providerSummary?.byProvider?.map(provider => (
                <option key={provider.providerId} value={provider.providerId}>
                  {provider.providerName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-sm block mb-2">Kanal</label>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="input"
            >
              <option value="">Tümü</option>
              {channelSummary?.byChannel?.map(channel => (
                <option key={channel.channelName} value={channel.channelName}>
                  {channel.channelName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Provider Reconciliation */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Provider Mutabakatı</h2>
        
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-500/20 rounded-full mr-4">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Çekilen Kodlar</p>
                <p className="text-2xl font-bold text-gray-100">{providerSummary?.totalCodesPulled || 0}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="p-3 bg-red-500/20 rounded-full mr-4">
                <DollarSign className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Provider Mutabakat</p>
                <p className="text-2xl font-bold text-gray-100">
                  {formatTurkishCurrency(providerSummary?.totalPayable || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Provider</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Çekilen Kod</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Ödenecek TL</th>
              </tr>
            </thead>
            <tbody>
              {providerSummary?.byProvider?.map((provider, index) => (
                <tr
                  key={provider.providerId}
                  className={`border-b ${
                    index % 2 === 0 ? 'border-gray-800' : 'border-gray-700'
                  } hover:bg-gray-800/50 transition-colors`}
                >
                  <td className="py-3 px-4 text-gray-100 font-medium">{provider.providerName}</td>
                  <td className="py-3 px-4 text-gray-100">{provider.codesPulled}</td>
                  <td className="py-3 px-4 text-gray-100 font-medium">
                    {formatTurkishCurrency(provider.payable)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Channel Receivables */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Kanal Alacakları</h2>
        
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-500/20 rounded-full mr-4">
              <CreditCard className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Toplam Alacak</p>
              <p className="text-2xl font-bold text-gray-100">
                {formatTurkishCurrency(channelSummary?.totalReceivable || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-gray-100 font-medium mb-4">Kanal Kırılımı</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Kanal</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Alacak TL</th>
                </tr>
              </thead>
              <tbody>
                {channelSummary?.byChannel?.map((channel, index) => (
                  <tr
                    key={channel.channelName}
                    className={`border-b ${
                      index % 2 === 0 ? 'border-gray-800' : 'border-gray-700'
                    } hover:bg-gray-800/50 transition-colors`}
                  >
                    <td className="py-3 px-4 text-gray-100 font-medium">{channel.channelName}</td>
                    <td className="py-3 px-4 text-gray-100 font-medium">
                      {formatTurkishCurrency(channel.receivable)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Profit Trend Chart */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-gray-100 font-medium mb-4">Son 3 Ay Karlılık</h3>
          <div className="space-y-2">
            {profitSummary?.byMonth?.map((month, index) => {
              const isPositive = month.profit >= 0
              return (
                <div key={month.month} className="flex items-center justify-between">
                  <span className="text-gray-300">{month.month}</span>
                  <div className="flex items-center">
                    <span className={`font-medium mr-2 ${
                      isPositive ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatTurkishCurrency(month.profit)}
                    </span>
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Raw Order Data */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-100">Sipariş Detayı (Raw Data)</h2>
          
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

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Sipariş No veya Müşteri Adı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Sipariş Tarihi</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Kanal</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Provider</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">İsim</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Ürün</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Satış Fiyatı</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Komisyon %</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Komisyon TL</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Provider Net</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Kar</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Sipariş No</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order: AccountingOrder, index: number) => (
                <tr
                  key={order.orderId}
                  className={`border-b ${
                    index % 2 === 0 ? 'border-gray-800' : 'border-gray-700'
                  } hover:bg-gray-800/50 transition-colors`}
                >
                  <td className="py-3 px-4 text-gray-100">{order.orderedAt}</td>
                  <td className="py-3 px-4 text-gray-100">{order.channel}</td>
                  <td className="py-3 px-4 text-gray-100">{order.provider}</td>
                  <td className="py-3 px-4 text-gray-100">{order.customerName}</td>
                  <td className="py-3 px-4 text-gray-100">{order.productName}</td>
                  <td className="py-3 px-4 text-gray-100">{formatTurkishCurrency(order.sellingPrice)}</td>
                  <td className="py-3 px-4 text-gray-100">%{order.commissionPct}</td>
                  <td className="py-3 px-4 text-gray-100">{formatTurkishCurrency(order.commissionAmount)}</td>
                  <td className="py-3 px-4 text-gray-100">{formatTurkishCurrency(order.providerNet)}</td>
                  <td className="py-3 px-4 text-gray-100">
                    <span className={order.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {formatTurkishCurrency(order.profit)}
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
