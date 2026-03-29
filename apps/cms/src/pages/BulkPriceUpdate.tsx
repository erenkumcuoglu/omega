import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowRight, Package, DollarSign, Percent, TrendingUp, TrendingDown, Save, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { toast } from 'sonner'
import api from '../lib/api'

interface Product {
  id: string
  name: string
  sku: string
  sellingPrice: number
  marginPct: number
  purchasePrice: number
  provider: string
}

interface Channel {
  id: string
  name: string
  commissionPct: number
}

interface ChannelCommission {
  channelId: string
  commissionPct: number
}

interface ChannelProfit {
  channelId: string
  commissionPct: number
  profit: number
}

export function BulkPriceUpdate() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    sellingPrice: 0,
    marginPct: 0,
    channelCommissions: [] as ChannelCommission[]
  })

  // Mock providers data
  const providers = [
    { id: 'coda', name: 'Coda' },
    { id: 'epin', name: 'Epin' },
    { id: 'marti', name: 'Martı' }
  ]

  // Mock products data
  const mockProducts: Product[] = [
    {
      id: 'prod1',
      name: 'PUBG Mobile 60 UC',
      sku: 'PUBGMTR60',
      sellingPrice: 100,
      marginPct: 14,
      purchasePrice: 80,
      provider: 'Coda'
    },
    {
      id: 'prod2',
      name: 'Valorant 950 RP',
      sku: 'VALOR950',
      sellingPrice: 150,
      marginPct: 12,
      purchasePrice: 120,
      provider: 'Coda'
    },
    {
      id: 'prod3',
      name: 'Free Fire 1000 Diamonds',
      sku: 'FF1000',
      sellingPrice: 80,
      marginPct: 10,
      purchasePrice: 65,
      provider: 'Epin'
    }
  ]

  // Get product channels
  const { data: productData, refetch: refetchChannels } = useQuery({
    queryKey: ['product-channels', selectedProduct?.id],
    queryFn: async () => {
      if (!selectedProduct) return null
      const response = await api.get(`/products/${selectedProduct.id}/channels`)
      return response.data
    },
    enabled: !!selectedProduct
  })

  // Bulk price update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!selectedProduct) throw new Error('No product selected')
      const response = await api.patch(`/products/${selectedProduct.id}/price-bulk`, data)
      return response.data
    },
    onSuccess: (data) => {
      toast.success('Fiyat güncelleme kaydedildi!')
      
      if (data.warning?.type === 'negative_profit') {
        toast.warning(`Negatif karlılık: ${data.warning.channels.length} kanalda`)
      }
      
      // Refresh data
      refetchChannels()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Güncelleme başarısız')
    }
  })

  // Initialize form when product is selected
  React.useEffect(() => {
    if (productData?.product && productData?.channels) {
      setFormData({
        sellingPrice: productData.product.sellingPrice,
        marginPct: productData.product.marginPct,
        channelCommissions: productData.channels.map((channel: Channel) => ({
          channelId: channel.id,
          commissionPct: channel.commissionPct
        }))
      })
    }
  }, [productData])

  // Calculate profit for each channel
  const calculateChannelProfits = (): ChannelProfit[] => {
    if (!selectedProduct || !formData.channelCommissions.length) return []

    return formData.channelCommissions.map(commission => {
      const purchasePrice = selectedProduct.purchasePrice
      const marginAmount = purchasePrice * (formData.marginPct / 100)
      const commissionAmount = formData.sellingPrice * (commission.commissionPct / 100)
      const profit = formData.sellingPrice - purchasePrice - marginAmount - commissionAmount

      return {
        channelId: commission.channelId,
        commissionPct: commission.commissionPct,
        profit
      }
    })
  }

  const channelProfits = calculateChannelProfits()

  // Handle form submission
  const handleSubmit = () => {
    bulkUpdateMutation.mutate(formData)
  }

  // Get filtered products
  const filteredProducts = selectedProvider 
    ? mockProducts.filter(p => p.provider.toLowerCase() === selectedProvider.toLowerCase())
    : mockProducts

  // Render Step 1: Provider Selection
  if (step === 1) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Toplu Fiyat Güncelleme</h1>
          <p className="text-gray-400">Ürün fiyatlarını ve tüm kanal komisyonlarını aynı anda güncelleyin</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">ADIM 1 — Provider Seç</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {providers.map(provider => (
              <button
                key={provider.id}
                onClick={() => setSelectedProvider(provider.id)}
                className={`p-4 rounded-lg border transition-colors ${
                  selectedProvider === provider.id
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <Package className="w-8 h-8 text-red-500 mb-2" />
                <h3 className="text-gray-100 font-medium">{provider.name}</h3>
              </button>
            ))}
          </div>

          {selectedProvider && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="btn btn-primary flex items-center"
              >
                Devam Et
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render Step 2: Product Selection
  if (step === 2) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Toplu Fiyat Güncelleme</h1>
            <p className="text-gray-400">Provider: {providers.find(p => p.id === selectedProvider)?.name}</p>
          </div>
          <button
            onClick={() => setStep(1)}
            className="btn btn-secondary"
          >
            Geri
          </button>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">ADIM 2 — Ürün Seç</h2>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="SKU veya ürün adına göre ara..."
              className="input"
            />
          </div>

          <div className="space-y-2">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className={`w-full p-4 rounded-lg border transition-colors text-left ${
                  selectedProduct?.id === product.id
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-gray-100 font-medium">{product.name}</h3>
                    <p className="text-gray-400 text-sm">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-100">{formatCurrency(product.sellingPrice)}</p>
                    <p className="text-gray-400 text-sm">Marj: %{product.marginPct}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedProduct && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep(3)}
                className="btn btn-primary flex items-center"
              >
                Devam Et
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render Step 3: Channel Prices
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Toplu Fiyat Güncelleme</h1>
          <p className="text-gray-400">Ürün: {selectedProduct?.name}</p>
        </div>
        <button
          onClick={() => setStep(2)}
          className="btn btn-secondary"
        >
          Geri
        </button>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">ADIM 3 — Kanal Fiyatları</h2>
        
        {/* Product Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 p-4 rounded-lg">
            <label className="text-gray-400 text-sm">Provider Fiyatı (Turkpin)</label>
            <p className="text-gray-100 text-lg font-medium">
              {formatCurrency(selectedProduct?.purchasePrice || 0)}
            </p>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <label className="text-gray-400 text-sm">Omega Satış Fiyatı</label>
            <input
              type="number"
              value={formData.sellingPrice}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                sellingPrice: Number(e.target.value)
              }))}
              className="w-full mt-1 p-2 bg-gray-700 text-gray-100 rounded border border-gray-600 focus:border-red-500 focus:outline-none"
            />
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <label className="text-gray-400 text-sm">Provider Marjı %</label>
            <input
              type="number"
              value={formData.marginPct}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                marginPct: Number(e.target.value)
              }))}
              className="w-full mt-1 p-2 bg-gray-700 text-gray-100 rounded border border-gray-600 focus:border-red-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Channel Commissions */}
        <div className="space-y-4">
          <h3 className="text-gray-100 font-medium">Kanal Komisyonları</h3>
          
          {productData?.channels?.map((channel: Channel, index: number) => {
            const profit = channelProfits.find(p => p.channelId === channel.id)?.profit || 0
            const isNegativeProfit = profit < 0
            
            return (
              <div
                key={channel.id}
                className={`p-4 rounded-lg border ${
                  isNegativeProfit 
                    ? 'border-red-500 bg-red-500/10' 
                    : 'border-gray-700 bg-gray-800'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div>
                    <label className="text-gray-400 text-sm">Kanal Adı</label>
                    <p className="text-gray-100 font-medium">{channel.name}</p>
                  </div>
                  
                  <div>
                    <label className="text-gray-400 text-sm">Komisyon %</label>
                    <input
                      type="number"
                      value={formData.channelCommissions[index]?.commissionPct || 0}
                      onChange={(e) => {
                        const newCommissions = [...formData.channelCommissions]
                        newCommissions[index] = {
                          channelId: channel.id,
                          commissionPct: Number(e.target.value)
                        }
                        setFormData(prev => ({
                          ...prev,
                          channelCommissions: newCommissions
                        }))
                      }}
                      className="w-full mt-1 p-2 bg-gray-700 text-gray-100 rounded border border-gray-600 focus:border-red-500 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="text-gray-400 text-sm">Hesaplanan Net Kar</label>
                    <div className={`flex items-center mt-1 ${isNegativeProfit ? 'text-red-400' : 'text-green-400'}`}>
                      {isNegativeProfit ? <TrendingDown className="w-4 h-4 mr-1" /> : <TrendingUp className="w-4 h-4 mr-1" />}
                      <span className="font-medium">{formatCurrency(profit)}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-gray-400 text-sm">Durum</label>
                    <div className={`mt-1 flex items-center ${isNegativeProfit ? 'text-red-400' : 'text-green-400'}`}>
                      {isNegativeProfit && <AlertTriangle className="w-4 h-4 mr-1" />}
                      <span className="text-sm">{isNegativeProfit ? 'Negatif Kar' : 'Pozitif Kar'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Negative Profit Warning */}
        {channelProfits.some(p => p.profit < 0) && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500 rounded-lg">
            <div className="flex items-center text-red-400">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <span>
                {channelProfits.filter(p => p.profit < 0).length} kanalda negatif karlılık hesaplandı. 
                Yine de kaydetmek istiyor musunuz?
              </span>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={bulkUpdateMutation.isPending}
            className="btn btn-primary flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {bulkUpdateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}
