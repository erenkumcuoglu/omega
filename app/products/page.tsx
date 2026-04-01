'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Package, Loader2, Check, X, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface Game {
  id: string
  name: string
}

interface TurkpinProduct {
  id: string
  name: string
  stock: string
  min_order: string
  max_order: string
  price: string
}

interface ProductRow {
  id: string
  gameId: string
  gameName: string
  productId: string
  productName: string
  purchasePrice: number
  sellingPrice: number
  marginPct: number
  isActive: boolean
  stock: number
  minOrder: number
  maxOrder: number
}

interface OrderResult {
  status: string
  order_no: string
  total_amount: string
  list: { code: string; desc: string }[]
}

interface Balance {
  balance: string
  credit: string
  bonus: string
  spending: string
}

export default function ProductsPage() {
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null)
  const [orderData, setOrderData] = useState({ qty: 1, character: '' })
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null)
  const [orderError, setOrderError] = useState('')
  const [balance, setBalance] = useState<Balance | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  useEffect(() => {
    if (selectedGame) {
      loadProducts(selectedGame.id, selectedGame.name)
    }
  }, [selectedGame])

  const apiKeyHeader = { 'x-api-key': process.env.NEXT_PUBLIC_TURKPIN_API_SECRET || '' }

  const fetchGames = async () => {
    try {
      const res = await fetch('/api/turkpin/epin/games', { headers: apiKeyHeader })
      if (!res.ok) throw new Error('Oyun listesi alınamadı')
      const data = await res.json()
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Games fetch error:', error)
      return []
    }
  }

  const loadBalance = async () => {
    try {
      const res = await fetch('/api/turkpin/balance', { headers: apiKeyHeader })
      if (!res.ok) return null
      const data = await res.json()
      setBalance(data)
      return data
    } catch (error) {
      console.error('Balance fetch error', error)
      return null
    }
  }

  const loadProducts = async (gameId: string, gameName: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/turkpin/epin/products?gameId=${encodeURIComponent(gameId)}`, { headers: apiKeyHeader })
      if (!res.ok) {
        setProducts([])
        return
      }
      const data = await res.json()
      const rows = Array.isArray(data) ? data.map((item: TurkpinProduct) => {
        const sellingPrice = parseFloat(item.price || '0')
        const purchasePrice = Number((sellingPrice * 0.85).toFixed(2))
        const marginPct = purchasePrice > 0 ? Number((((sellingPrice - purchasePrice) / purchasePrice) * 100).toFixed(1)) : 0

        return {
          id: item.id,
          gameId,
          gameName,
          productId: item.id,
          productName: item.name,
          purchasePrice,
          sellingPrice,
          marginPct,
          isActive: Number(item.stock) > 0,
          stock: Number(item.stock),
          minOrder: Number(item.min_order || '1'),
          maxOrder: Number(item.max_order || '1')
        }
      }) : []
      setProducts(rows)
    } catch (error) {
      console.error('Products fetch error:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const loadDashboard = async () => {
    setSyncing(true)
    const gamesData = await fetchGames()
    setGames(gamesData)
    if (gamesData.length > 0) {
      setSelectedGame(gamesData[0])
    }
    await loadBalance()
    setSyncing(false)
  }

  const handleSync = async () => {
    await loadDashboard()
  }

  const kpis = useMemo(() => {
    const total = products.length
    const active = products.filter((p) => p.isActive).length
    const outOfStock = products.filter((p) => !p.isActive).length
    const avgMargin = products.length > 0 ? products.reduce((sum, p) => sum + p.marginPct, 0) / products.length : 0
    return { total, active, outOfStock, avgMargin }
  }, [products])

  const getStockStatus = (isActive: boolean) => {
    if (!isActive) {
      return { text: 'Tükendi', color: 'red', bgColor: 'bg-red-100 text-red-800' }
    }
    return { text: 'Stokta Var', color: 'green', bgColor: 'bg-green-100 text-green-800' }
  }

  const openOrderModal = (product: ProductRow) => {
    setSelectedProduct(product)
    setOrderData({ qty: 1, character: '' })
    setOrderResult(null)
    setOrderError('')
    setOrderModalOpen(true)
  }

  const submitOrder = async () => {
    if (!selectedProduct || !selectedGame) return
    try {
      const res = await fetch('/api/turkpin/epin/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...apiKeyHeader
        },
        body: JSON.stringify({ gameId: selectedGame.id, productId: selectedProduct.productId, qty: orderData.qty, character: orderData.character.trim() || undefined })
      })
      if (!res.ok) {
        const err = await res.json()
        setOrderError(err?.error || 'Sipariş hatası')
        return
      }
      const data = await res.json()
      setOrderResult(data)
      setOrderError('')
    } catch (error) {
      console.error('Order submit error', error)
      setOrderError('Sipariş gönderilirken hata oluştu')
    }
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam Ürün</p>
              <p className="text-2xl font-bold text-gray-900">{kpis.total}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Aktif</p>
              <p className="text-2xl font-bold text-green-600">{kpis.active}</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-green-600 rounded-full" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Stokta Yok</p>
              <p className="text-2xl font-bold text-red-600">{kpis.outOfStock}</p>
            </div>
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <X className="w-4 h-4 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ortalama Marj %</p>
              <p className="text-2xl font-bold text-blue-600">{kpis.avgMargin.toFixed(1)}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ürünler</h1>
        <Button onClick={handleSync} disabled={syncing} className="flex items-center gap-2">
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Yenile
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-8 gap-4 text-sm font-semibold text-gray-900">
            <div>Oyun</div>
            <div>Ürün Adı</div>
            <div>Alış Fiyatı</div>
            <div>Satış Fiyatı</div>
            <div>Marj %</div>
            <div>Stok</div>
            <div>Durum</div>
            <div>İşlemler</div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-6 text-center text-gray-600">Yükleniyor...</div>
          ) : products.length === 0 ? (
            <div className="p-6 text-center text-gray-600">Ürün bulunamadı</div>
          ) : (
            products.map((product) => {
              const stockStatus = getStockStatus(product.isActive)
              const isCanOrder = product.stock > 0

              return (
                <div
                  key={product.id}
                  className={`px-6 py-4 ${!product.isActive ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                  <div className="grid grid-cols-8 gap-4 items-center text-sm">
                    <div>{product.gameName}</div>
                    <div className="font-medium text-gray-900">{product.productName}</div>
                    <div>₺{product.purchasePrice.toFixed(2)}</div>
                    <div>₺{product.sellingPrice.toFixed(2)}</div>
                    <div>{product.marginPct.toFixed(1)}%</div>
                    <div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.bgColor}`}>
                        {product.stock}
                      </span>
                    </div>
                    <div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {product.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog open={orderModalOpen && selectedProduct?.id === product.id} onOpenChange={setOrderModalOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" disabled={!isCanOrder} onClick={() => openOrderModal(product)}>
                            {isCanOrder ? 'Sipariş Ver' : 'Stok Yok'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Sipariş Oluştur</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Ürün</Label>
                              <p className="font-medium">{selectedProduct?.productName}</p>
                              <p className="text-sm text-muted-foreground">
                                ₺{selectedProduct?.sellingPrice.toFixed(2)}
                              </p>
                            </div>

                            <div>
                              <Label htmlFor="qty">Adet</Label>
                              <Input
                                id="qty"
                                type="number"
                                min={selectedProduct?.minOrder || 1}
                                max={selectedProduct?.maxOrder || 1}
                                value={orderData.qty}
                                onChange={(e) => setOrderData({ ...orderData, qty: parseInt(e.target.value) || 1 })}
                              />
                            </div>

                            <div>
                              <Label htmlFor="character">Karakter Adı (Opsiyonel)</Label>
                              <Input
                                id="character"
                                value={orderData.character}
                                onChange={(e) => setOrderData({ ...orderData, character: e.target.value })}
                              />
                            </div>

                            {orderError && (
                              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{orderError}</div>
                            )}

                            {orderResult ? (
                              <div className="space-y-2">
                                <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                                  <p><strong>Sipariş No:</strong> {orderResult.order_no}</p>
                                  <p><strong>Toplam:</strong> ₺{parseFloat(orderResult.total_amount).toLocaleString('tr-TR')}</p>
                                </div>
                                {orderResult.list && orderResult.list.length > 0 && (
                                  <div>
                                    <Label>Kodlar:</Label>
                                    <div className="bg-muted p-2 rounded text-sm max-h-32 overflow-y-auto">
                                      {orderResult.list.map((code, idx) => (
                                        <div key={idx}>
                                          <strong>{code.code}:</strong> {code.desc}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Button onClick={submitOrder} className="w-full">Siparişi Tamamla</Button>
                            )}

                          </div>
                        </DialogContent>
                      </Dialog>

                      <button
                        onClick={() => {
                          setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, isActive: !p.isActive } : p))
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {product.isActive ? 'Pasife Al' : 'Aktifleştir'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {balance && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Bakiye</p>
            <p className="text-2xl font-bold">₺{parseFloat(balance.balance).toLocaleString('tr-TR')}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Kredi</p>
            <p className="text-2xl font-bold">₺{parseFloat(balance.credit).toLocaleString('tr-TR')}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Bonus</p>
            <p className="text-2xl font-bold">₺{parseFloat(balance.bonus).toLocaleString('tr-TR')}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Harcama</p>
            <p className="text-2xl font-bold text-red-600">₺{parseFloat(balance.spending).toLocaleString('tr-TR')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
