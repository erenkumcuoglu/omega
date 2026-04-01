'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

interface Game {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  stock: string
  min_order: string
  max_order: string
  price: string
}

interface Server {
  id: string
  name: string
  min_order: string
  max_order: string
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

export default function CatalogPage() {
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | Server | null>(null)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [orderData, setOrderData] = useState({
    qty: 1,
    character: ''
  })
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null)
  const [orderError, setOrderError] = useState('')

  useEffect(() => {
    fetchGames()
    fetchBalance()
  }, [])

  useEffect(() => {
    if (selectedGame) {
      fetchProducts(selectedGame.id)
    }
  }, [selectedGame])

  const fetchGames = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/turkpin/epin/games', {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_TURKPIN_API_SECRET || ''
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Fetched games data:', data)
        setGames(data)
        if (data.length > 0) {
          setSelectedGame(data[0])
        }
      }
    } catch (error) {
      console.error('Games fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async (gameId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/turkpin/epin/products?gameId=${gameId}`, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_TURKPIN_API_SECRET || ''
        }
      })

      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Products fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/turkpin/balance', {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_TURKPIN_API_SECRET || ''
        }
      })

      if (response.ok) {
        const data = await response.json()
        setBalance(data)
      }
    } catch (error) {
      console.error('Balance fetch error:', error)
    }
  }

  const openOrderModal = (product: Product | Server) => {
    setSelectedProduct(product)
    setOrderData({ qty: 1, character: '' })
    setOrderResult(null)
    setOrderError('')
    setOrderModalOpen(true)
  }

  const submitOrder = async () => {
    if (!selectedProduct || !selectedGame) return

    try {
      const endpoint = '/api/turkpin/epin/order'
      const payload = {
        gameId: selectedGame.id,
        productId: selectedProduct.id,
        qty: orderData.qty,
        ...(orderData.character.trim() ? { character: orderData.character } : {})
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_TURKPIN_API_SECRET || ''
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const result = await response.json()
        setOrderResult(result)
        setOrderError('')
      } else {
        const error = await response.json()
        setOrderError(error.error || 'Sipariş oluşturulamadı')
      }
    } catch (error) {
      console.error('Order error:', error)
      setOrderError('Sipariş oluşturulurken hata oluştu')
    }
  }

  const getStockBadgeColor = (stock: string) => {
    const stockNum = parseInt(stock)
    if (stockNum === 0) return 'destructive'
    if (stockNum <= 10) return 'secondary'
    return 'default'
  }

  const currentItems = Array.isArray(products) ? products : []

  // Calculate statistics
  const totalProducts = currentItems.length
  const activeProducts = currentItems.filter(item => parseInt(item.stock || '0') > 0).length
  const outOfStockProducts = currentItems.filter(item => parseInt(item.stock || '0') === 0).length
  const avgMargin = 15.0 // Fixed for now, can be calculated from API later

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Omega Digital</h1>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">CMS v1.0</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Hoş geldiniz</span>
              <span className="text-sm font-medium text-gray-900">Admin User</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 py-3">
            <Link href="/products2" className="text-gray-900 font-medium border-b-2 border-blue-500 pb-2">
              Ana Sayfa
            </Link>
            <Link href="/products2/siparisler" className="text-gray-600 hover:text-gray-900 pb-2">
              Siparişler
            </Link>
            <Link href="/products2" className="text-gray-600 hover:text-gray-900 pb-2">
              Ürünler
            </Link>
            <Link href="/products2/bakiye" className="text-gray-600 hover:text-gray-900 pb-2">
              Bakiye
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Ürünler</h2>
          <p className="text-gray-600 mt-2">Dijital ürün katalogunuzu yönetin</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">∑</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Toplam Ürün</p>
                  <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Aktif</p>
                  <p className="text-2xl font-bold text-gray-900">{activeProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">✗</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Stokta Yok</p>
                  <p className="text-2xl font-bold text-gray-900">{outOfStockProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">%</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ortalama Marj %</p>
                  <p className="text-2xl font-bold text-gray-900">{avgMargin.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Balance Card */}
        {balance && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Turkpin Bakiyesi</span>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  ₺{parseFloat(balance.balance).toLocaleString('tr-TR')}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Bakiye</p>
                  <p className="text-lg font-semibold">₺{parseFloat(balance.balance).toLocaleString('tr-TR')}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Kredi</p>
                  <p className="text-lg font-semibold">₺{parseFloat(balance.credit).toLocaleString('tr-TR')}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Bonus</p>
                  <p className="text-lg font-semibold">₺{parseFloat(balance.bonus).toLocaleString('tr-TR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Product Catalog */}
        <Card>
          <CardHeader>
            <CardTitle>Dijital Ürün Kataloğu</CardTitle>
            <p className="text-sm text-gray-600">Oyun seçin ve ürün siparişini oluşturun</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Panel - Game List */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Oyunlar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      {loading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {games.map((game) => (
                            <Button
                              key={game.id}
                              variant={selectedGame?.id === game.id ? 'default' : 'ghost'}
                              className="w-full justify-start"
                              onClick={() => setSelectedGame(game)}
                            >
                              {game.name}
                            </Button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Right Panel - Product Grid */}
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {selectedGame ? `${selectedGame.name} - Ürünler` : 'Oyun Seçin'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                      {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <Card key={i}>
                              <CardContent className="p-4">
                                <Skeleton className="h-4 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2 mb-2" />
                                <Skeleton className="h-8 w-full" />
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : currentItems.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-3 font-medium">Ürün Adı</th>
                                <th className="text-left p-3 font-medium">Alış Fiyatı</th>
                                <th className="text-left p-3 font-medium">Satış Fiyatı</th>
                                <th className="text-left p-3 font-medium">Marj %</th>
                                <th className="text-left p-3 font-medium">Stok</th>
                                <th className="text-left p-3 font-medium">Durum</th>
                                <th className="text-left p-3 font-medium">İşlemler</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentItems.map((item) => (
                                <tr key={item.id} className="border-b hover:bg-gray-50">
                                  <td className="p-3 font-medium">{item.name}</td>
                                  <td className="p-3">₺{(parseFloat(item.price) * 0.85).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="p-3">₺{parseFloat(item.price).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="p-3">{avgMargin.toFixed(1)}%</td>
                                  <td className="p-3">
                                    <Badge variant={getStockBadgeColor(item.stock)}>
                                      {item.stock}
                                    </Badge>
                                  </td>
                                  <td className="p-3">
                                    <Badge variant={parseInt(item.stock) > 0 ? 'default' : 'destructive'}>
                                      {parseInt(item.stock) > 0 ? 'Aktif' : 'Pasif'}
                                    </Badge>
                                  </td>
                                  <td className="p-3">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          size="sm"
                                          onClick={() => openOrderModal(item)}
                                          disabled={parseInt(item.stock) === 0}
                                        >
                                          {parseInt(item.stock) === 0 ? 'Stok Yok' : 'Sipariş Ver'}
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Sipariş Oluştur</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div>
                                            <Label>Ürün</Label>
                                            <p className="font-medium">{selectedProduct?.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                              ₺{selectedProduct ? parseFloat((selectedProduct as any).price).toLocaleString('tr-TR') : ''}
                                            </p>
                                          </div>

                                          <div>
                                            <Label htmlFor="qty">Adet</Label>
                                            <Input
                                              id="qty"
                                              type="number"
                                              min={selectedProduct ? (selectedProduct as any).min_order : 1}
                                              max={selectedProduct ? (selectedProduct as any).max_order : 1}
                                              value={orderData.qty}
                                              onChange={(e) => setOrderData({ ...orderData, qty: parseInt(e.target.value) || 1 })}
                                            />
                                          </div>

                                          <div>
                                            <Label htmlFor="character">Karakter Adı (İsteğe Bağlı)</Label>
                                            <Input
                                              id="character"
                                              value={orderData.character}
                                              onChange={(e) => setOrderData({ ...orderData, character: e.target.value })}
                                              placeholder="Karakter adı (opsiyonel)"
                                            />
                                          </div>

                                          {orderError && (
                                            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                              {orderError}
                                            </div>
                                          )}

                                          {orderResult ? (
                                            <div className="space-y-2">
                                              <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                                                <p><strong>Sipariş No:</strong> {orderResult.order_no}</p>
                                                <p><strong>Toplam Tutar:</strong> ₺{parseFloat(orderResult.total_amount).toLocaleString('tr-TR')}</p>
                                              </div>
                                              {orderResult.list && orderResult.list.length > 0 && (
                                                <div>
                                                  <Label>Kodlar:</Label>
                                                  <div className="bg-muted p-2 rounded text-sm max-h-32 overflow-y-auto">
                                                    {orderResult.list.map((code, index) => (
                                                      <div key={index}>
                                                        <strong>{code.code}:</strong> {code.desc}
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <Button onClick={submitOrder} className="w-full">
                                              Siparişi Tamamla
                                            </Button>
                                          )}
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          {selectedGame ? 'Bu oyun için ürün bulunamadı' : 'Lütfen bir oyun seçin'}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
