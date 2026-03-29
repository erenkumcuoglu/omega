import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Package, AlertTriangle, Search, Download, FileSpreadsheet, FileText } from 'lucide-react'
import { toast } from 'sonner'
import api from '../lib/api'

interface StockSummary {
  [denomination: string]: number
}

interface MartiProduct {
  id: string
  name: string
  price: number
  productCode: string
}

export function MartiCodes() {
  const [searchTerm, setSearchTerm] = useState('')

  // Get stock summary
  const { data: stockSummary, isLoading: stockLoading } = useQuery({
    queryKey: ['marti-stock-summary'],
    queryFn: async () => {
      const response = await api.get('/marti/stock-summary')
      return response.data as StockSummary
    }
  })

  // Mock products data
  const mockProducts: MartiProduct[] = [
    { id: '1', name: 'Martı 25 TL', price: 25, productCode: 'MARTI25-001' },
    { id: '2', name: 'Martı 50 TL', price: 50, productCode: 'MARTI50-001' },
    { id: '3', name: 'Martı 100 TL', price: 100, productCode: 'MARTI100-001' },
    { id: '4', name: 'Martı 25 TL', price: 25, productCode: 'MARTI25-002' },
    { id: '5', name: 'Martı 50 TL', price: 50, productCode: 'MARTI50-002' },
    { id: '6', name: 'Martı 100 TL', price: 100, productCode: 'MARTI100-002' }
  ]

  // Filter products based on search
  const filteredProducts = mockProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.productCode.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Check if stock is low (threshold: 50)
  const isLowStock = (count: number) => count < 50

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
    const data = filteredProducts.map(p => `${p.name}\t${p.price}\t${p.productCode}`).join('\n')
    navigator.clipboard.writeText(data)
    toast.success('Panoya kopyalandı')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Martı Kodları</h1>
        <p className="text-gray-400">Martı stok durumu ve ürün kodları</p>
      </div>

      {/* Stock Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(stockSummary || {}).map(([denomination, count]) => (
          <div
            key={denomination}
            className={`p-6 rounded-lg border ${
              isLowStock(count)
                ? 'border-red-500 bg-red-500/10'
                : 'border-gray-700 bg-gray-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-100 font-medium">Martı {denomination} TL</h3>
                <p className={`text-2xl font-bold mt-2 ${
                  isLowStock(count) ? 'text-red-400' : 'text-green-400'
                }`}>
                  Stok: {count}
                </p>
              </div>
              <div className={`p-3 rounded-full ${
                isLowStock(count) ? 'bg-red-500/20' : 'bg-green-500/20'
              }`}>
                {isLowStock(count) ? (
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                ) : (
                  <Package className="w-6 h-6 text-green-400" />
                )}
              </div>
            </div>
            
            {isLowStock(count) && (
              <div className="mt-4 text-red-400 text-sm flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Düşük stok seviyesi
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-100">Ürün Listesi</h2>
          
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
              placeholder="Ürün adı veya kod ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Ürün ID</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Ürün</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Fiyat</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Ürün Kodu</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => (
                <tr
                  key={product.id}
                  className={`border-b ${
                    index % 2 === 0 ? 'border-gray-800' : 'border-gray-700'
                  } hover:bg-gray-800/50 transition-colors`}
                >
                  <td className="py-3 px-4 text-gray-100">{product.id}</td>
                  <td className="py-3 px-4 text-gray-100 font-medium">{product.name}</td>
                  <td className="py-3 px-4 text-gray-100">₺{product.price}</td>
                  <td className="py-3 px-4 text-gray-100 font-mono text-sm">{product.productCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              Arama kriterlerinize uygun ürün bulunamadı
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            Toplam {filteredProducts.length} ürün gösteriliyor
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
