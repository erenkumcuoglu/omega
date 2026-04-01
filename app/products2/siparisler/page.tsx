'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface OrderStatus {
  status_code: string
  order_no: string
  order_status_description: string
  check_date: string
  extra?: string
}

export default function OrderStatusPage() {
  const [orderNo, setOrderNo] = useState('')
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const checkOrderStatus = async () => {
    if (!orderNo.trim()) {
      setError('Sipariş numarası gereklidir')
      return
    }

    setLoading(true)
    setError('')
    setOrderStatus(null)

    try {
      const response = await fetch(`/api/turkpin/order-status?orderNo=${encodeURIComponent(orderNo)}`, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_TURKPIN_API_SECRET || ''
        }
      })

      if (response.ok) {
        const data = await response.json()
        setOrderStatus(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Sipariş sorgulanamadı')
      }
    } catch (error) {
      console.error('Order status check error:', error)
      setError('Sipariş sorgulanırken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeColor = (statusCode: string) => {
    return statusCode === '000' ? 'default' : 'destructive'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sipariş Sorgula</h1>
        <p className="text-muted-foreground">Sipariş durumunu ve detaylarını görüntüle</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sipariş Sorgulama</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orderNo">Sipariş Numarası</Label>
            <Input
              id="orderNo"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              placeholder="Sipariş numarasını girin"
              onKeyPress={(e) => e.key === 'Enter' && checkOrderStatus()}
            />
          </div>

          <Button 
            onClick={checkOrderStatus} 
            disabled={loading || !orderNo.trim()}
            className="w-full"
          >
            {loading ? 'Sorgulanıyor...' : 'Sorgula'}
          </Button>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {orderStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Sipariş Bilgileri
              <Badge variant={getStatusBadgeColor(orderStatus.status_code)}>
                {orderStatus.status_code === '000' ? 'Tamamlandı' : 'İşlemde'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Sipariş Numarası</Label>
                <div className="font-mono text-lg">{orderStatus.order_no}</div>
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground">Durum Kodu</Label>
                <div className="font-mono text-lg">{orderStatus.status_code}</div>
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground">Durum Açıklaması</Label>
                <div className="text-lg">{orderStatus.order_status_description}</div>
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground">Kontrol Tarihi</Label>
                <div className="text-lg">{formatDate(orderStatus.check_date)}</div>
              </div>
            </div>

            {orderStatus.extra && (
              <div>
                <Label className="text-sm text-muted-foreground">Ek Bilgiler</Label>
                <div className="bg-muted p-3 rounded text-sm">
                  {orderStatus.extra}
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  orderStatus.status_code === '000' ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <span className="text-sm">
                  {orderStatus.status_code === '000' 
                    ? 'Siparişiniz başarıyla tamamlanmış.' 
                    : 'Siparişiniz işleniyor.'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
