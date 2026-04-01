import React, { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Loader2, Package, RefreshCw, Search, X } from 'lucide-react'
import api from '../lib/api'
import { formatCurrency, formatNumber } from '../lib/utils'

interface Game {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  stock: number
  minOrder: number
  maxOrder: number
  price: number
  isActive: boolean
}

interface SyncProduct {
  id: string
  name: string
  price: number
  stock: number
  minOrder: number
  maxOrder: number
  isActive: boolean
}

interface SyncCategory {
  epinId: string
  epinName: string
  products: SyncProduct[]
}

interface Balance {
  balance: number
  credit: number
  bonus: number
  spending: number
}

interface BalanceApiResponse {
  success: boolean
  data?: {
    balance: number
    credit: number
    bonus: number
    spending: number
  }
}

interface StatCard {
  label: string
  value: number | string
  color: string
}

export default function ProductManagement() {
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [categories, setCategories] = useState<SyncCategory[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [gameSearchTerm, setGameSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'catalog' | 'search'>('catalog')
  const [loadedCount, setLoadedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void bootstrap()
  }, [])

  useEffect(() => {
    if (selectedGame) {
      const selectedCategory = categories.find((category) => category.epinId === selectedGame.id)
      const mappedProducts = mapCategoryProducts(selectedCategory?.products ?? [])
      setProducts(mappedProducts)
      setSelectedProduct(mappedProducts[0] ?? null)
    }
  }, [selectedGame, categories])

  const bootstrap = async () => {
    await Promise.all([fetchGames(), fetchBalance()])
  }

  const mapCategoryProducts = (categoryProducts: SyncProduct[]): Product[] => {
    return categoryProducts.map((product) => ({
      id: product.id,
      name: product.name,
      stock: product.stock ?? 0,
      minOrder: product.minOrder ?? 1,
      maxOrder: product.maxOrder ?? 0,
      price: product.price ?? 0,
      isActive: product.isActive ?? false
    }))
  }

  const fetchGames = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/products/sync')
      const syncCategories: SyncCategory[] = response.data?.data?.categories ?? []

      setCategories(syncCategories)

      const gameCategories = syncCategories.map((category) => ({
        id: category.epinId,
        name: category.epinName
      }))

      setGames(gameCategories)
      setLoadedCount(response.data?.data?.summary?.totalProducts ?? 0)

      if (gameCategories.length > 0) {
        setSelectedGame(gameCategories[0])
      }
    } catch (error) {
      console.error('Error fetching games:', error)
      setError('Ürünler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const syncProducts = async () => {
    setSyncing(true)
    setError(null)
    try {
      const response = await api.get('/products/sync/force')
      const syncCategories: SyncCategory[] = response.data?.data?.categories ?? []
      setCategories(syncCategories)
      const gameCategories = syncCategories.map((category) => ({
        id: category.epinId,
        name: category.epinName
      }))
      setGames(gameCategories)
      setLoadedCount(response.data?.data?.summary?.totalProducts ?? 0)
      if (!selectedGame && gameCategories.length > 0) {
        setSelectedGame(gameCategories[0])
      }
    } catch (error) {
      console.error('Error syncing products:', error)
      setError('Ürünler yüklenemedi')
    } finally {
      setSyncing(false)
    }
  }

  const fetchBalance = async () => {
    try {
      const response = await api.get('/products/balance')
      const payload = (response.data as BalanceApiResponse)?.data

      setBalance({
        balance: Number(payload?.balance ?? 0),
        credit: Number(payload?.credit ?? 0),
        bonus: Number(payload?.bonus ?? 0),
        spending: Number(payload?.spending ?? 0)
      })
    } catch (error) {
      const err = error as any
      const code = err?.response?.data?.code
      const upstreamStatus = err?.response?.data?.upstreamStatus
      if (code === 'TURKPIN_FORBIDDEN' || code === 'TURKPIN_IP_NOT_AUTHORIZED' || upstreamStatus === 403) {
        setError('Canli Turkpin baglantisi 403 Forbidden donuyor (IP whitelist/hesap yetkisi kontrol edilmeli)')
      } else {
        setError('Canli bakiye bilgisi alinamadi')
      }
    }
  }

  // İstatistik hesaplama
  const currentItems = Array.isArray(products) ? products : []
  const totalProducts = currentItems.length
  const activeProducts = currentItems.filter(item => item.stock > 0).length
  const outOfStockProducts = currentItems.filter(item => item.stock === 0).length
  const avgMargin = 15.0

  // Filtrelenmiş ürünler
  const filteredProducts = useMemo(() => {
    return currentItems.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [currentItems, searchTerm])

  // Filtrelenmiş oyunlar (arama için)
  const filteredGames = useMemo(() => {
    return games.filter(game =>
      game.name.toLowerCase().includes(gameSearchTerm.toLowerCase())
    )
  }, [games, gameSearchTerm])

  const formatAmount = (value: number) => {
    const numberValue = Number(value)
    if (Number.isNaN(numberValue)) return '0,00'
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numberValue)
  }

  const stats: StatCard[] = [
    { label: 'Toplam Ürün', value: totalProducts, color: '#3B82F6' },
    { label: 'Aktif', value: activeProducts, color: '#10B981' },
    { label: 'Stokta Yok', value: outOfStockProducts, color: '#EF4444' },
    { label: 'Ortalama Marj %', value: avgMargin.toFixed(1), color: '#8B5CF6' }
  ]

  if (loading && games.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Yükleniyor...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ürün Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">Kategori secildiginde urunler sag panelde otomatik listelenir.</p>
        </div>
        <button
          onClick={() => {
            void syncProducts()
            void fetchBalance()
          }}
          disabled={syncing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Senkronize ediliyor...' : 'Stok Senkronize Et'}</span>
        </button>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-lg p-4 border border-gray-200"
            style={{ borderTopColor: stat.color, borderTopWidth: '4px' }}
          >
            <div className="text-sm font-medium text-gray-600 mb-2">{stat.label}</div>
            <div className="text-2xl font-bold text-gray-900">
              {typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <div className="flex space-x-1 mb-4">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'catalog'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Oyun Seçin
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'search'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Ürün Adıyla Ara
          </button>
        </div>

        {activeTab === 'catalog' && (
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Oyun Seçin:</label>
            <select
              value={selectedGame?.id || ''}
              onChange={(e) => {
                const game = games.find(g => g.id === e.target.value)
                if (game) setSelectedGame(game)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Oyun Seçin</option>
              {games.map(game => (
                <option key={game.id} value={game.id}>{game.name}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-4">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Oyun adıyla ara..."
                value={gameSearchTerm}
                onChange={(e) => setGameSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {gameSearchTerm && (
              <div className="bg-white border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                {filteredGames.length > 0 ? (
                  filteredGames.map(game => (
                    <div
                      key={game.id}
                      onClick={() => {
                        setSelectedGame(game)
                        setActiveTab('catalog')
                        setGameSearchTerm('')
                      }}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{game.name}</div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-500 text-center">
                    Eşleşen oyun bulunamadı
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Banner */}
      {loadedCount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Package className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-800 font-medium">
              {loadedCount} ürün senkronize edildi
            </span>
          </div>
        </div>
      )}

      {/* Hata Mesajı */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <X className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800 font-medium">{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <aside className="xl:col-span-1 bg-white rounded-xl border border-gray-200 p-4 max-h-[640px] overflow-y-auto">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Kategoriler</h3>
          <div className="space-y-2">
            {games.map((game) => {
              const active = selectedGame?.id === game.id
              return (
                <button
                  key={game.id}
                  onClick={() => setSelectedGame(game)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition ${
                    active
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{game.name}</span>
                    <ChevronRight className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                </button>
              )
            })}
            {games.length === 0 && (
              <p className="text-sm text-gray-500">Kategori bulunamadi.</p>
            )}
          </div>
        </aside>

        <section className="xl:col-span-3 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedGame ? `${selectedGame.name} Urunleri` : 'Urunler'}
            </h3>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Urun ara..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
            {filteredProducts.map((item) => {
              const active = selectedProduct?.id === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedProduct(item)}
                  className={`text-left border rounded-lg p-3 transition ${
                    active
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">{item.name}</div>
                  <div className="text-xs text-gray-600">Fiyat: ₺{formatAmount(item.price)}</div>
                  <div className="text-xs text-gray-600">Stok: {formatNumber(item.stock)}</div>
                </button>
              )
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-500">Bu kategori icin urun bulunamadi.</div>
          )}

          {selectedProduct && (
            <div className="mt-5 border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h4 className="text-base font-semibold text-gray-900 mb-3">Alt Urun Bilgisi</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Urun:</span>
                  <div className="text-gray-900 font-medium mt-1">{selectedProduct.name}</div>
                </div>
                <div>
                  <span className="text-gray-500">Durum:</span>
                  <div className={`font-medium mt-1 ${selectedProduct.stock > 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {selectedProduct.stock > 0 ? 'Aktif' : 'Pasif'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Alis Fiyati:</span>
                  <div className="text-gray-900 mt-1">₺{formatAmount(selectedProduct.price)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Satis Fiyati:</span>
                  <div className="text-gray-900 mt-1">₺{formatAmount(selectedProduct.price * 1.15)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Minimum Adet:</span>
                  <div className="text-gray-900 mt-1">{formatNumber(selectedProduct.minOrder)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Maksimum Adet:</span>
                  <div className="text-gray-900 mt-1">{formatNumber(selectedProduct.maxOrder)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Stok:</span>
                  <div className="text-gray-900 mt-1">{formatNumber(selectedProduct.stock)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Marj:</span>
                  <div className="text-gray-900 mt-1">%{avgMargin.toFixed(1)}</div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Bakiye Kartları */}
      {balance && (
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-2">Bakiye</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(balance.balance)}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-2">Kredi</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(balance.credit)}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-2">Bonus</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(balance.bonus)}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-2">Harcama</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(balance.spending)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
