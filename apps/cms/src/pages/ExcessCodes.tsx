import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Send, Trash2, Package, TrendingUp, Search, Filter } from 'lucide-react'
import { toast } from 'sonner'
import api from '../lib/api'

interface ExcessCode {
  id: string
  productId: string
  channelId: string | null
  digitalCode: string
  providerOrderNo: string
  reason: string
  status: 'PENDING' | 'SENT_TO_CUSTOMER' | 'RETURNED_TO_PROVIDER' | 'WRITTEN_OFF'
  resolvedAt: string | null
  resolvedBy: string | null
  createdAt: string
  product: {
    id: string
    name: string
    sku: string
  }
  channel: {
    id: string
    name: string
  } | null
}

interface Summary {
  pending: number
  sentToCustomer: number
  returnedToProvider: number
  writtenOff: number
}

export function ExcessCodes() {
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [isWriteOffModalOpen, setIsWriteOffModalOpen] = useState(false)
  const [selectedCode, setSelectedCode] = useState<ExcessCode | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [writeOffReason, setWriteOffReason] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    productId: '',
    channelId: ''
  })
  const [searchTerm, setSearchTerm] = useState('')

  const queryClient = useQueryClient()

  // Get excess codes
  const { data: excessCodesData, isLoading: codesLoading } = useQuery({
    queryKey: ['excess-codes', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.productId) params.append('productId', filters.productId)
      if (filters.channelId) params.append('channelId', filters.channelId)
      
      const response = await api.get(`/excess-codes?${params.toString()}`)
      return response.data
    }
  })

  // Get summary
  const { data: summary } = useQuery({
    queryKey: ['excess-codes-summary'],
    queryFn: async () => {
      const response = await api.get('/excess-codes/summary')
      return response.data as Summary
    }
  })

  // Mock orders for send modal (in real app this would come from API)
  const { data: mockOrders } = useQuery({
    queryKey: ['pending-orders'],
    queryFn: async () => {
      // Mock pending orders
      return [
        { id: 'order1', customerName: 'Ahmet Yılmaz', productName: 'PUBG Mobile 60 UC', externalId: 'TRD123456' },
        { id: 'order2', customerName: 'Mehmet Kaya', productName: 'Valorant 950 RP', externalId: 'OZN789012' },
        { id: 'order3', customerName: 'Ayşe Demir', productName: 'PUBG Mobile 60 UC', externalId: 'TRD456789' }
      ]
    }
  })

  // Send to customer mutation
  const sendToCustomerMutation = useMutation({
    mutationFn: async ({ codeId, orderId }: { codeId: string; orderId: string }) => {
      const response = await api.post(`/excess-codes/${codeId}/send`, { orderId })
      return response.data
    },
    onSuccess: () => {
      toast.success('Fazlalık kod müşteriye gönderildi')
      setIsSendModalOpen(false)
      setSelectedCode(null)
      setSelectedOrderId('')
      queryClient.invalidateQueries({ queryKey: ['excess-codes'] })
      queryClient.invalidateQueries({ queryKey: ['excess-codes-summary'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Kod gönderilemedi')
    }
  })

  // Write off mutation
  const writeOffMutation = useMutation({
    mutationFn: async ({ codeId, reason }: { codeId: string; reason: string }) => {
      const response = await api.post(`/excess-codes/${codeId}/write-off`, { reason })
      return response.data
    },
    onSuccess: () => {
      toast.success('Fazlalık kod zarar olarak yazıldı')
      setIsWriteOffModalOpen(false)
      setSelectedCode(null)
      setWriteOffReason('')
      queryClient.invalidateQueries({ queryKey: ['excess-codes'] })
      queryClient.invalidateQueries({ queryKey: ['excess-codes-summary'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Kod zarar olarak yazılamadı')
    }
  })

  // Form handlers
  const handleSendToCustomer = () => {
    if (!selectedCode || !selectedOrderId) return
    sendToCustomerMutation.mutate({ codeId: selectedCode.id, orderId: selectedOrderId })
  }

  const handleWriteOff = () => {
    if (!selectedCode || !writeOffReason.trim()) return
    writeOffMutation.mutate({ codeId: selectedCode.id, reason: writeOffReason })
  }

  const openSendModal = (code: ExcessCode) => {
    setSelectedCode(code)
    setSelectedOrderId('')
    setIsSendModalOpen(true)
  }

  const openWriteOffModal = (code: ExcessCode) => {
    setSelectedCode(code)
    setWriteOffReason('')
    setIsWriteOffModalOpen(true)
  }

  // Filter codes based on search
  const filteredCodes = excessCodesData?.excessCodes?.filter((code: ExcessCode) =>
    code.digitalCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    code.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    code.product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'SENT_TO_CUSTOMER':
        return 'bg-green-500/20 text-green-400'
      case 'RETURNED_TO_PROVIDER':
        return 'bg-blue-500/20 text-blue-400'
      case 'WRITTEN_OFF':
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Bekleyen'
      case 'SENT_TO_CUSTOMER':
        return 'Müşteriye Gönderilen'
      case 'RETURNED_TO_PROVIDER':
        return 'Provider\'a İade'
      case 'WRITTEN_OFF':
        return 'Zarar Yazılan'
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Fazlalık Kod Yönetimi</h1>
          <p className="text-gray-400">Fulfillment başarısız olan kodları yönetin</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-500/20 rounded-full mr-4">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Bekleyen</p>
              <p className="text-2xl font-bold text-gray-100">{summary?.pending || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-500/20 rounded-full mr-4">
              <Send className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Gönderilen</p>
              <p className="text-2xl font-bold text-gray-100">{summary?.sentToCustomer || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-500/20 rounded-full mr-4">
              <Package className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">İade</p>
              <p className="text-2xl font-bold text-gray-100">{summary?.returnedToProvider || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-red-500/20 rounded-full mr-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Zarar Yazılan</p>
              <p className="text-2xl font-bold text-gray-100">{summary?.writtenOff || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-gray-400 text-sm block mb-2">Durum</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="input"
            >
              <option value="">Tümü</option>
              <option value="PENDING">Bekleyen</option>
              <option value="SENT_TO_CUSTOMER">Müşteriye Gönderilen</option>
              <option value="RETURNED_TO_PROVIDER">Provider'a İade</option>
              <option value="WRITTEN_OFF">Zarar Yazılan</option>
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-sm block mb-2">Ürün</label>
            <input
              type="text"
              value={filters.productId}
              onChange={(e) => setFilters(prev => ({ ...prev, productId: e.target.value }))}
              className="input"
              placeholder="Ürün ID"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm block mb-2">Kanal</label>
            <input
              type="text"
              value={filters.channelId}
              onChange={(e) => setFilters(prev => ({ ...prev, channelId: e.target.value }))}
              className="input"
              placeholder="Kanal ID"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm block mb-2">Arama</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Kod, ürün adı veya SKU ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Excess Codes Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Ürün</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Kanal</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Kod</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Sebep</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Oluşturma</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Durum</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredCodes.map((code: ExcessCode, index: number) => (
                <tr
                  key={code.id}
                  className={`border-b ${
                    index % 2 === 0 ? 'border-gray-800' : 'border-gray-700'
                  } hover:bg-gray-800/50 transition-colors`}
                >
                  <td className="py-3 px-4">
                    <div>
                      <div className="text-gray-100 font-medium">{code.product.name}</div>
                      <div className="text-sm text-gray-400">{code.product.sku}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-100">
                    {code.channel ? code.channel.name : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-mono text-sm text-gray-100 bg-gray-800 px-2 py-1 rounded">
                      {code.digitalCode}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-100">
                    {code.reason === 'FULFILLMENT_FAILED' ? 'Fulfillment Başarısız' : 'Sipariş İptal'}
                  </td>
                  <td className="py-3 px-4 text-gray-100">
                    {new Date(code.createdAt).toLocaleString('tr-TR')}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(code.status)}`}>
                      {getStatusLabel(code.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      {code.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => openSendModal(code)}
                            className="btn btn-secondary btn-sm"
                            title="Müşteriye Gönder"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => openWriteOffModal(code)}
                            className="btn btn-secondary btn-sm"
                            title="Zarar Yaz"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      {code.status !== 'PENDING' && (
                        <span className="text-gray-500 text-sm">
                          {code.resolvedAt && `Çözüldü: ${new Date(code.resolvedAt).toLocaleDateString('tr-TR')}`}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {codesLoading && (
            <div className="text-center py-8 text-gray-400">
              Yükleniyor...
            </div>
          )}
          
          {!codesLoading && filteredCodes.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              {searchTerm || filters.status || filters.productId || filters.channelId
                ? 'Arama kriterlerinize uygun fazlalık kod bulunamadı'
                : 'Henüz fazlalık kod bulunmuyor'
              }
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            Toplam {filteredCodes.length} fazlalık kod gösteriliyor
          </div>
          <div className="flex space-x-2">
            <button className="btn btn-secondary" disabled>Önceki</button>
            <button className="btn btn-primary">1</button>
            <button className="btn btn-secondary" disabled>Sonraki</button>
          </div>
        </div>
      </div>

      {/* Send to Customer Modal */}
      {isSendModalOpen && selectedCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Müşteriye Kod Gönder</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-2">Fazlalık Kod</label>
                <div className="bg-gray-700 p-3 rounded">
                  <div className="font-mono text-sm text-gray-100">{selectedCode.digitalCode}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Ürün: {selectedCode.product.name}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-gray-400 text-sm block mb-2">Bekleyen Sipariş</label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="input"
                >
                  <option value="">Sipariş seçin...</option>
                  {mockOrders?.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.externalId} - {order.customerName} ({order.productName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setIsSendModalOpen(false)}
                className="btn btn-secondary"
              >
                İptal
              </button>
              <button
                onClick={handleSendToCustomer}
                disabled={!selectedOrderId || sendToCustomerMutation.isPending}
                className="btn btn-primary"
              >
                {sendToCustomerMutation.isPending ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Write Off Modal */}
      {isWriteOffModalOpen && selectedCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Zarar Yaz</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-2">Fazlalık Kod</label>
                <div className="bg-gray-700 p-3 rounded">
                  <div className="font-mono text-sm text-gray-100">{selectedCode.digitalCode}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Ürün: {selectedCode.product.name}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-gray-400 text-sm block mb-2">Zarar Sebepi</label>
                <textarea
                  value={writeOffReason}
                  onChange={(e) => setWriteOffReason(e.target.value)}
                  className="input h-24"
                  placeholder="Zarar yazma sebebini açıklayın..."
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setIsWriteOffModalOpen(false)}
                className="btn btn-secondary"
              >
                İptal
              </button>
              <button
                onClick={handleWriteOff}
                disabled={!writeOffReason.trim() || writeOffMutation.isPending}
                className="btn btn-red-600"
              >
                {writeOffMutation.isPending ? 'Yazılıyor...' : 'Zarar Yaz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
