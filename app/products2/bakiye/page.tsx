'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface Balance {
  balance: string
  credit: string
  bonus: string
  spending: string
}

export default function BalancePage() {
  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchBalance()
  }, [])

  const fetchBalance = async () => {
    setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: string) => {
    return `₺${parseFloat(amount).toLocaleString('tr-TR')}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bakiye</h1>
          <p className="text-muted-foreground">Hesap bakiye ve finansal bilgiler</p>
        </div>
        <Button onClick={fetchBalance} disabled={loading}>
          {loading ? 'Yenileniyor...' : 'Yenile'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Main Balance Card */}
        <Card className="lg:col-span-2 bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl">Mevcut Bakiye</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-12 w-32" />
            ) : balance ? (
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(balance.balance)}
              </div>
            ) : (
              <div className="text-lg text-muted-foreground">Bilgi alınamadı</div>
            )}
          </CardContent>
        </Card>

        {/* Credit Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Kredi</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : balance ? (
              <div className="text-2xl font-semibold">
                {formatCurrency(balance.credit)}
              </div>
            ) : (
              <div className="text-muted-foreground">-</div>
            )}
          </CardContent>
        </Card>

        {/* Bonus Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bonus</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : balance ? (
              <div className="text-2xl font-semibold text-green-600">
                {formatCurrency(balance.bonus)}
              </div>
            ) : (
              <div className="text-muted-foreground">-</div>
            )}
          </CardContent>
        </Card>

        {/* Spending Card */}
        <Card className="md:col-span-2 lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-lg">Toplam Harcama</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : balance ? (
              <div className="text-2xl font-semibold text-red-600">
                {formatCurrency(balance.spending)}
              </div>
            ) : (
              <div className="text-muted-foreground">-</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Info */}
      <Card>
        <CardHeader>
          <CardTitle>Hesap Özeti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <div className="font-medium text-muted-foreground">Kullanılabilir Bakiye</div>
              <div className="text-lg">
                {loading ? (
                  <Skeleton className="h-6 w-20" />
                ) : balance ? (
                  formatCurrency(balance.balance)
                ) : (
                  '-'
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-muted-foreground">Toplam Kredi Limiti</div>
              <div className="text-lg">
                {loading ? (
                  <Skeleton className="h-6 w-20" />
                ) : balance ? (
                  formatCurrency(balance.credit)
                ) : (
                  '-'
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-muted-foreground">Bonus Bakiyesi</div>
              <div className="text-lg text-green-600">
                {loading ? (
                  <Skeleton className="h-6 w-20" />
                ) : balance ? (
                  formatCurrency(balance.bonus)
                ) : (
                  '-'
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
