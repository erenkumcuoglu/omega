import React, { useState } from 'react'

// Toggle Switch Component
export function ToggleSwitch({ 
  isActive, 
  onToggle, 
  activeLabel = "Açık", 
  inactiveLabel = "Kapalı",
  confirmMessage = "Bu işlemi onaylıyor musunuz?",
  confirmButtonText = "Onayla"
}: {
  isActive: boolean
  onToggle: () => void
  activeLabel?: string
  inactiveLabel?: string
  confirmMessage?: string
  confirmButtonText?: string
}) {
  const [showConfirm, setShowConfirm] = React.useState(false)
  
  const handleToggle = () => {
    if (isActive && confirmMessage) {
      setShowConfirm(true)
    } else {
      onToggle()
    }
  }
  
  const handleConfirm = () => {
    onToggle()
    setShowConfirm(false)
  }
  
  return (
    <>
      <button
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '6px',
          border: 'none',
          fontSize: '12px',
          cursor: 'pointer',
          backgroundColor: isActive ? '#10B981' : '#D1D5DB',
          color: isActive ? 'white' : '#6B7280',
          transition: 'all 0.2s'
        }}
      >
        <span style={{ fontSize: '10px' }}>
          {isActive ? '●' : '○'}
        </span>
        {isActive ? activeLabel : inactiveLabel}
      </button>
      
      {showConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
              Onay Gerekli
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
              {confirmMessage}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Vazgeç
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#E94560',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {confirmButtonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Month Filter Component
export function MonthFilter({ 
  months, 
  activeMonth, 
  years,
  activeYear,
  onMonthChange,
  onYearChange
}: {
  months: string[]
  activeMonth: string
  years: string[]
  activeYear: string
  onMonthChange: (month: string) => void
  onYearChange: (year: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 16px',
          backgroundColor: '#FFFFFF',
          color: '#374151',
          border: '1px solid #E5E7EB',
          borderRadius: '6px',
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '150px',
          justifyContent: 'space-between'
        }}
      >
        <span>{activeMonth}</span>
        <span style={{ fontSize: '10px' }}>▼</span>
      </button>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          marginTop: '4px',
          backgroundColor: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: '6px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 50,
          minWidth: '200px',
          padding: '8px'
        }}>
          {/* Yıl Seçimi */}
          <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>
              YIL
            </p>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {years.map(year => (
                <button
                  key={year}
                  onClick={() => onYearChange(year)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: year === activeYear ? '#E94560' : '#F3F4F6',
                    color: year === activeYear ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
          
          {/* Ay Seçimi */}
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>
              AY
            </p>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {months.map(month => (
                <button
                  key={month}
                  onClick={() => {
                    onMonthChange(month)
                    setIsOpen(false)
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: month === activeMonth ? '#F3F4F6' : 'transparent',
                    color: '#374151',
                    border: 'none',
                    fontSize: '14px',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    borderRadius: '4px',
                    marginBottom: '2px'
                  }}
                >
                  {month}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Date Range Filter Component
export function DateRangeFilter({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange 
}: {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#F3F4F6', borderRadius: '6px' }}>
      <span style={{ fontSize: '12px', color: '#6B7280', whiteSpace: 'nowrap' }}>Tarih Aralığı:</span>
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        style={{
          padding: '4px 8px',
          border: '1px solid #E5E7EB',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#374151'
        }}
      />
      <span style={{ fontSize: '12px', color: '#6B7280' }}>-</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        style={{
          padding: '4px 8px',
          border: '1px solid #E5E7EB',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#374151'
        }}
      />
    </div>
  )
}

// Pagination Component
export function Pagination({ 
  currentPage, 
  totalPages, 
  itemsPerPage, 
  onPageChange, 
  onItemsPerPageChange 
}: {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (items: number) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderTop: '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px', color: '#6B7280' }}>Sayfa başına:</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          style={{
            padding: '4px 8px',
            border: '1px solid #E5E7EB',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#374151',
            backgroundColor: 'white'
          }}
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: '6px 12px',
            backgroundColor: currentPage === 1 ? '#F3F4F6' : '#FFFFFF',
            color: currentPage === 1 ? '#9CA3AF' : '#374151',
            border: '1px solid #E5E7EB',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
          }}
        >
          Önceki
        </button>
        
        <span style={{ fontSize: '14px', color: '#374151', minWidth: '80px', textAlign: 'center' }}>
          {currentPage} / {totalPages}
        </span>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: '6px 12px',
            backgroundColor: currentPage === totalPages ? '#F3F4F6' : '#FFFFFF',
            color: currentPage === totalPages ? '#9CA3AF' : '#374151',
            border: '1px solid #E5E7EB',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
          }}
        >
          Sonraki
        </button>
      </div>
    </div>
  )
}

// Collapsible Order Detail Component
export function OrderDetail({ order }: { order: any }) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  
  return (
    <div style={{ marginTop: '8px' }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '4px 8px',
          backgroundColor: '#F3F4F6',
          color: '#374151',
          border: 'none',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <span style={{ fontSize: '10px' }}>{isExpanded ? '▼' : '▶'}</span>
        Detaylar
      </button>
      
      {isExpanded && (
        <div style={{
          marginTop: '8px',
          padding: '12px',
          backgroundColor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            <div>
              <span style={{ color: '#6B7280' }}>Sipariş ID:</span>
              <span style={{ marginLeft: '8px', color: '#111827', fontWeight: '500' }}>{order.id}</span>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Müşteri Adı:</span>
              <span style={{ marginLeft: '8px', color: '#111827', fontWeight: '500' }}>{order.customer}</span>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Ürün Kodu:</span>
              <span style={{ marginLeft: '8px', color: '#111827', fontWeight: '500', fontFamily: 'monospace' }}>{order.productCode}</span>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Dijital Kod:</span>
              <span style={{ marginLeft: '8px', color: '#111827', fontWeight: '500', fontFamily: 'monospace' }}>
                {order.digitalCode || 'Henüz atanmadı'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Popup Modal for Price Edit
export const PriceEditModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  denom, 
  productName 
}: { 
  isOpen: boolean
  onClose: () => void
  onSave: (newPrice: number) => void
  denom: any
  productName: string
}) => {
  const [newPrice, setNewPrice] = useState('')

  React.useEffect(() => {
    if (isOpen && denom) {
      setNewPrice(denom.salePrice.toString())
    }
  }, [isOpen, denom])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const price = parseFloat(newPrice)
    if (!isNaN(price) && price > 0) {
      onSave(price)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '400px',
        maxWidth: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
          Satış Fiyatını Düzenle
        </h3>
        
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '4px' }}>
            Ürün: <span style={{ color: '#111827', fontWeight: '500' }}>{productName}</span>
          </p>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>
            Denom: <span style={{ color: '#111827', fontWeight: '500' }}>{denom?.denom}</span>
          </p>
          
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
              Yeni Satış Fiyatı (₺)
            </label>
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              placeholder="0.00"
              step="0.01"
              min="0"
              autoFocus
            />
          </div>
          
          {newPrice && denom && (
            <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: '#6B7280' }}>Maliyet:</span>
                <span style={{ color: '#111827', fontWeight: '500' }}>
                  {formatCurrency(denom.purchasePrice)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: '#6B7280' }}>Yeni Satış:</span>
                <span style={{ color: '#111827', fontWeight: '500' }}>
                  {formatCurrency(parseFloat(newPrice) || 0)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingTop: '8px', borderTop: '1px solid #E5E7EB' }}>
                <span style={{ color: '#6B7280', fontWeight: '500' }}>Yeni Marj:</span>
                <span style={{ 
                  color: (parseFloat(newPrice) - denom.purchasePrice) / denom.purchasePrice * 100 > 15 ? '#10B981' : '#F59E0B', 
                  fontWeight: '600' 
                }}>
                  %{(((parseFloat(newPrice) - denom.purchasePrice) / denom.purchasePrice * 100).toFixed(1))}
                </span>
              </div>
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            İptal
          </button>
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              backgroundColor: '#E94560',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Kaydet
          </button>
        </form>
      </div>
    </div>
  )
}

// Format utilities
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount)
}

export const formatDateTime = (date: Date | string): string => {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const seconds = d.getSeconds().toString().padStart(2, '0')
  
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`
}

export const formatDate = (date: Date | string): string => {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  
  return `${day}.${month}.${year}`
}

export const formatTime = (date: Date | string): string => {
  const d = new Date(date)
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  
  return `${hours}:${minutes}`
}

export const formatShortDate = (date: Date | string): string => {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  
  return `${day}.${month}.${year}`
}
