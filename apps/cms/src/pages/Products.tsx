import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, DollarSign, Percent, ToggleLeft, ToggleRight, Save } from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { toast } from 'sonner'
import api from '../lib/api'

interface Product {
  id: string
  name: string
  sku: string
  providerName: string
  purchasePrice: number
  sellingPrice: number
  marginPct: number
  stock: number
  isActive: boolean
}

interface Channel {
  id: string
  name: string
  commissionPct: number
}

export function Products() {
  const [selectedProvider, setSelectedProvider] = useState<string>('all')
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [editingPrices, setEditingPrices] = useState<Record<string, { sellingPrice: number; marginPct: number }>>({})
  const [editingCommissions, setEditingCommissions] = useState<Record<string, number>>({})
  
  const queryClient = useQueryClient()

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products', selectedProvider, showActiveOnly],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(selectedProvider !== 'all' && { provider: selectedProvider }),
        ...(showActiveOnly && { isActive: 'true' }),
      })
      const response = await api.get(`/products?${params}`)
      return response.data as Product[]
    },
  })

  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const response = await api.get('/channels')
      return response.data as Channel[]
    },
  })

  const { data: providers } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const response = await api.get('/providers')
      return response.data as Array<{ id: string; name: string; isActive: boolean }>
    },
  })

  const toggleProductMutation = useMutation({
    mutationFn: async ({ productId, isActive }: { productId: string; isActive: boolean }) => {
      await api.patch(`/products/${productId}/toggle`, { isActive })
    },
    onSuccess: () => {
      toast.success('Ürün durumu güncellendi')
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'İşlem başarısız')
    },
  })

  const updatePriceMutation = useMutation({
    mutationFn: async ({ productId, sellingPrice, marginPct }: { productId: string; sellingPrice: number; marginPct: number }) => {
      await api.patch(`/products/${productId}/price`, { sellingPrice, marginPct })
    },
    onSuccess: () => {
      toast.success('Fiyatlar güncellendi')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setEditingPrices({})
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fiyat güncelleme başarısız')
    },
  })

  const updateCommissionMutation = useMutation({
    mutationFn: async ({ channelId, commissionPct }: { channelId: string; commissionPct: number }) => {
      await api.patch(`/channels/${channelId}/commission`, { commissionPct })
    },
    onSuccess: () => {
      toast.success('Komisyon güncellendi')
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      setEditingCommissions({})
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Komisyon güncelleme başarısız')
    },
  })

  const handlePriceEdit = (productId: string, field: 'sellingPrice' | 'marginPct', value: string) => {
    const numValue = parseFloat(value) || 0
    setEditingPrices(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: numValue
      }
    }))
  }

  const handleCommissionEdit = (channelId: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setEditingCommissions(prev => ({
      ...prev,
      [channelId]: numValue
    }))
  }

  const savePrice = (productId: string) => {
    const edits = editingPrices[productId]
    if (edits) {
      updatePriceMutation.mutate({
        productId,
        sellingPrice: edits.sellingPrice,
        marginPct: edits.marginPct
      })
    }
  }

  const saveCommission = (channelId: string) => {
    const commission = editingCommissions[channelId]
    if (commission !== undefined) {
      updateCommissionMutation.mutate({
        channelId,
        commissionPct: commission
      })
    }
  }

  if (productsLoading) {
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
          <h1 className="text-2xl font-bold">Fiyat Kontrol</h1>
          <p className="text-textSecondary">Ürün fiyatları ve kar marjları yönetimi</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label block mb-2">Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="select"
            >
              <option value="all">Tüm Providerlar</option>
              {providers?.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="activeOnly"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="activeOnly" className="text-sm">
              Sadece aktif ürünleri göster
            </label>
          </div>

          <div className="flex items-center text-sm text-textSecondary">
            <Package className="h-4 w-4 mr-2" />
            {products?.length} ürün
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Ürün Fiyatları</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="table-header">
                <th className="table-head">SKU</th>
                <th className="table-head">Ürün Adı</th>
                <th className="table-head">Provider</th>
                <th className="table-head">Provider Fiyatı</th>
                <th className="table-head">Omega Fiyatı</th>
                <th className="table-head">Marj %</th>
                <th className="table-head">Stok</th>
                <th className="table-head">Durum</th>
              </tr>
            </thead>
            <tbody>
              {products?.map((product) => {
                const isEditing = editingPrices[product.id]
                return (
                  <tr key={product.id} className="table-row">
                    <td className="table-cell font-mono text-sm">{product.sku}</td>
                    <td className="table-cell">{product.name}</td>
                    <td className="table-cell">{product.providerName}</td>
                    <td className="table-cell">{formatCurrency(product.purchasePrice)}</td>
                    <td className="table-cell">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={isEditing.sellingPrice}
                            onChange={(e) => handlePriceEdit(product.id, 'sellingPrice', e.target.value)}
                            className="input w-24 text-sm"
                          />
                          <button
                            onClick={() => savePrice(product.id)}
                            disabled={updatePriceMutation.isPending}
                            className="btn btn-sm btn-primary"
                          >
                            <Save className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => setEditingPrices(prev => ({
                            ...prev,
                            [product.id]: {
                              sellingPrice: product.sellingPrice,
                              marginPct: product.marginPct
                            }
                          }))}
                          className="cursor-pointer hover:bg-surface px-2 py-1 rounded"
                        >
                          {formatCurrency(product.sellingPrice)}
                        </div>
                      )}
                    </td>
                    <td className="table-cell">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={isEditing.marginPct}
                            onChange={(e) => handlePriceEdit(product.id, 'marginPct', e.target.value)}
                            className="input w-16 text-sm"
                          />
                          <span className="text-textSecondary">%</span>
                        </div>
                      ) : (
                        <div
                          onClick={() => setEditingPrices(prev => ({
                            ...prev,
                            [product.id]: {
                              sellingPrice: product.sellingPrice,
                              marginPct: product.marginPct
                            }
                          }))}
                          className="cursor-pointer hover:bg-surface px-2 py-1 rounded"
                        >
                          {product.marginPct.toFixed(2)}%
                        </div>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className={`font-medium ${product.stock > 0 ? 'text-success' : 'text-error'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => toggleProductMutation.mutate({
                          productId: product.id,
                          isActive: !product.isActive
                        })}
                        className="p-2 hover:bg-surface rounded-lg transition-colors"
                      >
                        {product.isActive ? (
                          <ToggleRight className="h-5 w-5 text-success" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-error" />
                        )}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Channel Commissions */}
      <div className="card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Kanal Marjları</h2>
        </div>
        <div className="space-y-3">
          {channels?.map((channel) => {
            const isEditing = editingCommissions[channel.id] !== undefined
            return (
              <div key={channel.id} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                <div>
                  <p className="font-medium">{channel.name}</p>
                  <p className="text-sm text-textSecondary">Komisyon oranı</p>
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <input
                        type="number"
                        step="0.01"
                        value={editingCommissions[channel.id]}
                        onChange={(e) => handleCommissionEdit(channel.id, e.target.value)}
                        className="input w-20 text-sm"
                      />
                      <span className="text-textSecondary">%</span>
                      <button
                        onClick={() => saveCommission(channel.id)}
                        disabled={updateCommissionMutation.isPending}
                        className="btn btn-sm btn-primary"
                      >
                        <Save className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <div
                      onClick={() => setEditingCommissions(prev => ({
                        ...prev,
                        [channel.id]: channel.commissionPct
                      }))}
                      className="cursor-pointer hover:bg-surface px-3 py-1 rounded"
                    >
                      <Percent className="h-4 w-4 inline mr-1" />
                      {channel.commissionPct.toFixed(2)}%
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
