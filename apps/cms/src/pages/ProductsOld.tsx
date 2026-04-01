import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, ToggleLeft, ToggleRight, Save, RefreshCw, Clock } from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { toast } from 'sonner'
import api from '../lib/api'

interface Product {
  id: string
  name: string
  price: number
  stock: number
  minOrder: number
  maxOrder: number
  isActive: boolean
}

interface Channel {
  id: string
  name: string
  commissionPct: number
}

interface Category {
  epinId: string
  epinName: string
  products: Product[]
}

interface SyncData {
  categories: Category[]
  summary: {
    totalCategories: number
    totalProducts: number
    syncedAt: string
    source: string
    batchNumber?: number
    totalBatches?: number
    remainingGames?: number
  }
}

export function Products() {
  const [selectedProvider, setSelectedProvider] = useState<string>('all')
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [showOutOfStockOnly, setShowOutOfStockOnly] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all')
  const [editingPrices, setEditingPrices] = useState<Record<string, { sellingPrice: number; marginPct: number }>>({})
  const [editingCommissions, setEditingCommissions] = useState<Record<string, number>>({})
  
  const queryClient = useQueryClient()

  // Update commission mutation
  const updateCommissionMutation = useMutation({
    mutationFn: async ({ channelId, commission }: { channelId: string; commission: number }) => {
      const response = await api.patch(`/channels/${channelId}`, { commissionPct: commission })
      return response.data
    },
    onSuccess: () => {
      toast.success('Komisyon güncellendi')
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
    onError: () => {
      toast.error('Komisyon güncellenemedi')
    }
  })

  // Sync products mutation
  const syncProductsMutation = useMutation({
    mutationFn: async () => {
      // 10 dakika timeout ile isteği yap
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 600000) // 10 dakika
      
      try {
        const response = await fetch('/api/products/sync', {
          signal: controller.signal,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          throw new Error('Senkronizasyon başarısız')
        }
        
        return response.json()
      } catch (error) {
        clearTimeout(timeoutId)
        throw error
      }
    },
    onSuccess: (data: any) => {
      const totalProducts = data.data?.summary?.totalProducts || 0
      const totalCategories = data.data?.summary?.totalCategories || 0
      const source = data.data?.summary?.source || 'unknown'
      
      if (source === 'cached') {
        toast.info(`Önbellekten yüklendi: ${totalCategories} kategori, ${totalProducts} ürün`)
      } else {
        toast.success(`Senkronizasyon tamamlandı: ${totalCategories} kategori, ${totalProducts} ürün`)
      }
      
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error: any) => {
      if (error.name === 'AbortError') {
        toast.error('Senkronizasyon zaman aşımına uğradı. Lütfen tekrar deneyin.')
      } else {
        toast.error(error.response?.data?.message || 'Senkronizasyon başarısız')
      }
    },
  })

  // Batch sync mutations
  const batchSyncProductsMutation = useMutation({
    mutationFn: async (batchNumber: number) => {
      const response = await api.get(`/products/sync/batch/${batchNumber}`)
      return response.data
    },
    onSuccess: (data: any, batchNumber: number) => {
      const totalProducts = data.data?.summary?.totalProducts || 0
      const totalCategories = data.data?.summary?.totalCategories || 0
      const remainingGames = data.data?.summary?.remainingGames || 0
      const totalBatches = data.data?.summary?.totalBatches || 0
      
      toast.success(`Parti ${batchNumber}/${totalBatches} tamamlandı: ${totalCategories} kategori, ${totalProducts} ürün (${remainingGames} oyun kaldı)`)
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => {
      toast.error('Parti senkronizasyonu başarısız')
    },
  })

  // Force sync mutation
  const forceSyncProductsMutation = useMutation({
    mutationFn: async () => {
      const response = await api.get('/products/sync/force')
      return response.data
    },
    onSuccess: (data: any) => {
      const totalProducts = data.data?.summary?.totalProducts || 0
      const totalCategories = data.data?.summary?.totalCategories || 0
      toast.success(`Yeni senkronizasyon tamamlandı: ${totalCategories} kategori, ${totalProducts} ürün`)
      queryClient.invalidateQueries({ queryKey: ['products'] }) // Cache'i temizle ve yeniden yükle
    },
    onError: () => {
      toast.error('Yeni senkronizasyon başarısız')
    },
  })

  const { data: syncData, isLoading: syncLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        console.log('🔍 API çağrısı başlıyor...')
        const response = await api.get('/products/sync')
        console.log('📦 API response:', response.data)
        console.log('📊 Response data:', response.data.data)
        console.log('🔑 Response keys:', Object.keys(response.data))
        return response.data.data as SyncData
      } catch (error) {
        console.error('❌ API error:', error)
        throw error
      }
    },
    staleTime: 0,
    gcTime: 0
  })

  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const response = await api.get('/channels')
      return response.data as Channel[]
    },
  })

  // Popüler oyunları öncelikle sırala
  const popularGames = [
    'Steam', 'Xbox', 'PUBG Mobile', 'Google Play', 'iTunes', 'Razor Gold', 
    'Free Fire', 'Mobile Legends', 'VALORANT VP', 'Minecraft', 'Riot Points (LOL)',
    'Apple iTunes', 'PlayStation', 'Nintendo', 'Epic Games', 'Netflix', 'Spotify'
  ]

  // Para birimi ve marj hesaplama
  const getCurrencyInfo = (productName: string, categoryName: string) => {
    const name = productName.toLowerCase()
    const category = categoryName.toLowerCase()
    
    // Category adına göre para birimi belirle
    if (category.includes('tl') || category.includes('türk') || category.includes('try')) {
      return { currency: 'TL', symbol: '₺', allowed: true }
    } else if (category.includes('usd') || category.includes('$') || category.includes('dollar')) {
      return { currency: 'USD', symbol: '$', allowed: true }
    } else if (name.includes('inr') || name.includes('₹') || name.includes('rupee')) {
      return { currency: 'INR', symbol: '₹', allowed: false }
    } else if (name.includes('myr') || name.includes('rm') || name.includes('ringgit')) {
      return { currency: 'MYR', symbol: 'RM', allowed: false }
    } else if (name.includes('krw') || name.includes('₩') || name.includes('won')) {
      return { currency: 'KRW', symbol: '₩', allowed: false }
    } else if (name.includes('eur') || name.includes('€') || name.includes('euro')) {
      return { currency: 'EUR', symbol: '€', allowed: false }
    } else if (name.includes('gbp') || name.includes('£') || name.includes('pound')) {
      return { currency: 'GBP', symbol: '£', allowed: false }
    } else {
      // Varsayılan olarak TL kabul et (Türk pazarı için)
      return { currency: 'TL', symbol: '₺', allowed: true }
    }
  }

  const calculateSellingPrice = (purchasePrice: number, marginPct: number = 15) => {
    return purchasePrice * (1 + marginPct / 100)
  }

  // Debug logları
  console.log('🎯 SyncData:', syncData)
  console.log('📊 SyncLoading:', syncLoading)
  console.log('🔑 SyncData keys:', syncData ? Object.keys(syncData) : 'null')

  const sortedCategories = syncData?.categories ? [...syncData.categories].sort((a, b) => {
    const aIndex = popularGames.findIndex(game => a.epinName.toLowerCase().includes(game.toLowerCase()))
    const bIndex = popularGames.findIndex(game => b.epinName.toLowerCase().includes(game.toLowerCase()))
    
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    
    return a.epinName.localeCompare(b.epinName)
  }) : []

  console.log('📈 SortedCategories length:', sortedCategories.length)

  const providers = sortedCategories.map(cat => ({
    id: cat.epinId,
    name: cat.epinName
  }))

  const handlePriceEdit = (productId: string, sellingPrice: number, marginPct: number) => {
    setEditingPrices(prev => ({
      ...prev,
      [productId]: { sellingPrice, marginPct }
    }))
  }

  const handleCommissionEdit = (channelId: string, commission: number) => {
    setEditingCommissions(prev => ({
      ...prev,
      [channelId]: commission
    }))
  }

  const savePrice = async (productId: string) => {
    const price = editingPrices[productId]
    if (!price) return

    try {
      await api.patch(`/products/${productId}`, {
        sellingPrice: price.sellingPrice,
        marginPct: price.marginPct
      })
      
      setEditingPrices(prev => {
        const newPrices = { ...prev }
        delete newPrices[productId]
        return newPrices
      })
      
      toast.success('Fiyat güncellendi')
      queryClient.invalidateQueries({ queryKey: ['products'] })
    } catch (error) {
      toast.error('Fiyat güncellenemedi')
    }
  }

  const saveCommission = async (channelId: string) => {
    const commission = editingCommissions[channelId]
    if (!commission) return

    updateCommissionMutation.mutate({ channelId, commission })
    
    setEditingCommissions(prev => {
      const newCommissions = { ...prev }
      delete newCommissions[channelId]
      return newCommissions
    })
  }

  const toggleProduct = async (productId: string, isActive: boolean) => {
    try {
      await api.patch(`/products/${productId}`, { isActive })
      toast.success(`Ürün ${isActive ? 'aktifleştirildi' : 'deaktifleştirildi'}`)
      queryClient.invalidateQueries({ queryKey: ['products'] })
    } catch (error) {
      toast.error('Durum güncellenemedi')
    }
  }

  if (syncLoading) {
    console.log('⏳ Loading state - syncLoading:', syncLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Yükleniyor...</span>
      </div>
    )
  }

  console.log('🎬 Render ediliyor - syncData var mı:', !!syncData)
  console.log('🎬 Render ediliyor - syncData:', syncData)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Fiyat Kontrol</h1>
          <p className="text-textSecondary">Ürün fiyatları ve kar marjları yönetimi</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => forceSyncProductsMutation.mutate()}
            disabled={forceSyncProductsMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${forceSyncProductsMutation.isPending ? 'animate-spin' : ''}`} />
            {forceSyncProductsMutation.isPending ? 'Yeni Senkronize...' : 'Yeni Senkronize Et'}
          </button>
          <button
            onClick={() => syncProductsMutation.mutate()}
            disabled={syncProductsMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncProductsMutation.isPending ? 'animate-spin' : ''}`} />
            {syncProductsMutation.isPending ? 'Senkronize ediliyor...' : 'Yenile'}
          </button>
        </div>
      </div>

      {/* Sync Info */}
      {syncData?.summary && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">
                  Son Senkronizasyon: {syncData.summary.source === 'cached' ? 'Önbellekten' : syncData.summary.source === 'batch_sync' ? 'Parti Senkronizasyonu' : 'Canlı API'}
                </p>
                <p className="text-sm text-blue-700">
                  {new Date(syncData.summary.syncedAt).toLocaleString('tr-TR')}
                  {syncData.summary.source === 'batch_sync' && (
                    <span className="ml-2">
                      (Parti {syncData.summary.batchNumber}/{syncData.summary.totalBatches})
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-900">{syncData.summary.totalProducts}</p>
              <p className="text-sm text-blue-700">Ürün, {syncData.summary.totalCategories} Kategori</p>
              {syncData.summary.remainingGames !== undefined && (
                <p className="text-xs text-blue-600">
                  {syncData.summary.remainingGames} oyun kaldı
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch Sync Buttons */}
      {syncData?.summary?.source === 'batch_sync' && (syncData.summary.remainingGames ?? 0) > 0 && (
        <div className="card bg-orange-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-orange-900">
                Parti Senkronizasyonu Devam Ediyor
              </p>
              <p className="text-sm text-orange-700">
                {syncData.summary.remainingGames ?? 0} oyun daha senkronize edilebilir
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => batchSyncProductsMutation.mutate((syncData.summary.batchNumber ?? 0) + 1)}
                disabled={batchSyncProductsMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${batchSyncProductsMutation.isPending ? 'animate-spin' : ''}`} />
                Sonraki Parti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initial Batch Sync */}
      {!syncData && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-green-900">
                İlk Senkronizasyon
              </p>
              <p className="text-sm text-green-700">
                Önce popüler ürünleri, sonra parti parti diğerlerini çek
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => batchSyncProductsMutation.mutate(1)}
                disabled={batchSyncProductsMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${batchSyncProductsMutation.isPending ? 'animate-spin' : ''}`} />
                Parti 1 Başlat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
          
          <div>
            <label className="label block mb-2">Para Birimi</label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="select"
            >
              <option value="all">Tüm Para Birimleri</option>
              <option value="TL">Sadece TL</option>
              <option value="USD">Sadece USD</option>
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

          <div className="flex items-center">
            <input
              type="checkbox"
              id="outOfStockOnly"
              checked={showOutOfStockOnly}
              onChange={(e) => setShowOutOfStockOnly(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="outOfStockOnly" className="text-sm">
              Sadece tükenen ürünleri göster
            </label>
          </div>

          <div className="flex items-center text-sm text-textSecondary">
            <Package className="h-4 w-4 mr-2" />
            {sortedCategories.reduce((total, cat) => total + cat.products.length, 0)} ürün
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium">Ürün</th>
                <th className="text-left py-3 px-4 font-medium">SKU</th>
                <th className="text-right py-3 px-4 font-medium">Alış Fiyatı</th>
                <th className="text-right py-3 px-4 font-medium">Satış Fiyatı</th>
                <th className="text-right py-3 px-4 font-medium">Kar %</th>
                <th className="text-center py-3 px-4 font-medium">Stok</th>
                <th className="text-center py-3 px-4 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody>
              {sortedCategories.map((category) => (
                <React.Fragment key={category.epinId}>
                  {/* Category Header */}
                  <tr className="bg-surface">
                    <td colSpan={7} className="py-2 px-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{category.epinName}</h3>
                        <span className="text-sm text-textSecondary">
                          {category.products.length} ürün
                        </span>
                      </div>
                    </td>
                  </tr>
                  {/* Products */}
                  {category.products
                    .filter(product => {
                      const providerMatch = selectedProvider === 'all' || category.epinName === selectedProvider
                      const activeMatch = !showActiveOnly || product.isActive
                      const stockMatch = !showOutOfStockOnly || product.stock === 0
                      const currencyInfo = getCurrencyInfo(product.name, category.epinName)
                      const currencyMatch = selectedCurrency === 'all' || currencyInfo.currency === selectedCurrency
                      const allowedCurrency = currencyInfo.allowed // Sadece TL ve USD izin
                      return providerMatch && activeMatch && stockMatch && currencyMatch && allowedCurrency
                    })
                    .map((product) => {
                      const isEditing = editingPrices[product.id] !== undefined
                      const currencyInfo = getCurrencyInfo(product.name, category.epinName)
                      return (
                        <tr key={product.id} className="border-b">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-textSecondary">{category.epinName}</p>
                              <p className="text-xs text-gray-500">{currencyInfo.currency}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-mono bg-surface px-2 py-1 rounded">
                              {product.id}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div>
                              <p className="font-medium">{formatCurrency(product.price)}</p>
                              <p className="text-xs text-gray-500">Alış (Turkpin)</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editingPrices[product.id].sellingPrice}
                                onChange={(e) => handlePriceEdit(product.id, parseFloat(e.target.value), editingPrices[product.id].marginPct)}
                                className="input w-24 text-right"
                              />
                            ) : (
                              <div className="text-right">
                                <p className="font-medium">{formatCurrency(calculateSellingPrice(product.price))}</p>
                                <p className="text-sm text-textSecondary">Satış (+%15)</p>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editingPrices[product.id].marginPct}
                                onChange={(e) => handlePriceEdit(product.id, editingPrices[product.id].sellingPrice, parseFloat(e.target.value))}
                                className="input w-16 text-right"
                              />
                            ) : (
                              <span className="text-green-600 font-medium">15%</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 rounded text-sm ${
                              product.stock > 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {product.stock}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              {isEditing && (
                                <button
                                  onClick={() => savePrice(product.id)}
                                  className="p-1 hover:bg-surface rounded"
                                >
                                  <Save className="h-4 w-4 text-green-600" />
                                </button>
                              )}
                              <button
                                onClick={() => toggleProduct(product.id, !product.isActive)}
                                className="p-1 hover:bg-surface rounded"
                              >
                                {product.isActive ? (
                                  <ToggleRight className="h-5 w-5 text-green-600" />
                                ) : (
                                  <ToggleLeft className="h-5 w-5 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Channel Commissions */}
      <div className="card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Kanal Marjları</h2>
        </div>
        <div className="space-y-2">
          {channels?.map((channel) => {
            const isEditing = editingCommissions[channel.id] !== undefined
            return (
              <div key={channel.id} className="flex items-center justify-between p-3 bg-surface rounded">
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
                        onChange={(e) => handleCommissionEdit(channel.id, parseFloat(e.target.value))}
                        className="input w-20 text-right"
                      />
                      <span className="text-textSecondary">%</span>
                      <button
                        onClick={() => saveCommission(channel.id)}
                        disabled={updateCommissionMutation.isPending}
                        className="btn btn-sm btn-primary"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{channel.commissionPct}%</span>
                      <button
                        onClick={() => handleCommissionEdit(channel.id, channel.commissionPct)}
                        className="btn btn-sm btn-outline"
                      >
                        Düzenle
                      </button>
                    </>
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
