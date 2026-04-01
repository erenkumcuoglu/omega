'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface Balance {
  balance: string
  credit: string
  bonus: string
  spending: string
}

export default function Products2Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    fetchBalance()
  }, [])

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
    } finally {
      setLoading(false)
    }
  }

  const navLinks = [
    { href: '/products2', label: 'Katalog' },
    { href: '/products', label: 'Yenilenmiş Katalog (3001 stili)' },
    { href: '/products2/bakiye', label: 'Bakiye' },
    { href: '/products2/siparisler', label: 'Sipariş Sorgula' }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Top Navbar */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <h1 className="text-xl font-bold">🎮 Dijital Ürünler</h1>
              <nav className="hidden md:flex space-x-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      pathname === link.href
                        ? 'text-primary underline'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
            
            {/* Balance Widget */}
            <div className="flex items-center space-x-2">
              {loading ? (
                <Skeleton className="h-8 w-32" />
              ) : balance ? (
                <Card className="bg-muted/50">
                  <CardContent className="px-4 py-2">
                    <div className="text-sm font-medium">
                      Bakiye: ₺{parseFloat(balance.balance).toLocaleString('tr-TR')}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-sm text-muted-foreground">Bakiye yüklenemedi</div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden border-b bg-card">
        <div className="container mx-auto px-4 py-2">
          <div className="flex space-x-4 overflow-x-auto">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary whitespace-nowrap ${
                  pathname === link.href
                    ? 'text-primary underline'
                    : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
