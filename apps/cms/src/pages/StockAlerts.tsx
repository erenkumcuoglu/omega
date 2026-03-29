import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, BellRing, Plus, Edit, Trash2, AlertTriangle, CheckCircle, XCircle, Mail, Settings } from 'lucide-react'
import { toast } from 'sonner'
import api from '../lib/api'

interface StockAlert {
  id: string
  productId: string
  alertType: 'LOW_STOCK' | 'OUT_OF_STOCK'
  threshold: number | null
  isActive: boolean
  notifyEmail: string[]
  lastTriggeredAt: string | null
  createdAt: string
  product: {
    id: string
    name: string
    sku: string
    stock: number
  }
}

interface Notification {
  id: string
  type: 'STOCK_ALERT' | 'BALANCE_ALERT' | 'ORDER_FAILED' | 'SYSTEM'
  title: string
  message: string
  meta: any
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export function StockAlerts() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<StockAlert | null>(null)
  const [formData, setFormData] = useState({
    productId: '',
    alertType: 'LOW_STOCK' as 'LOW_STOCK' | 'OUT_OF_STOCK',
    threshold: 50,
    notifyEmail: ['']
  })

  const queryClient = useQueryClient()

  // Get stock alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['stock-alerts'],
    queryFn: async () => {
      const response = await api.get('/alerts')
      return response.data as StockAlert[]
    }
  })

  // Get notifications
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/alerts/notifications')
      return response.data
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  // Create alert mutation
  const createAlertMutation = useMutation({
    mutationFn: async (alertData: typeof formData) => {
      const response = await api.post('/alerts', alertData)
      return response.data
    },
    onSuccess: () => {
      toast.success('Stok uyarısı oluşturuldu')
      setIsCreateModalOpen(false)
      setFormData({ productId: '', alertType: 'LOW_STOCK', threshold: 50, notifyEmail: [''] })
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Uyarı oluşturulamadı')
    }
  })

  // Update alert mutation
  const updateAlertMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StockAlert> }) => {
      const response = await api.patch(`/alerts/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Stok uyarısı güncellendi')
      setIsEditModalOpen(false)
      setSelectedAlert(null)
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Uyarı güncellenemedi')
    }
  })

  // Delete alert mutation
  const deleteAlertMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/alerts/${id}`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Stok uyarısı silindi')
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Uyarı silinemedi')
    }
  })

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/alerts/notifications/${id}/read`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch('/alerts/notifications/read-all')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  // Manual stock check
  const stockCheckMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/alerts/check')
      return response.data
    },
    onSuccess: (data) => {
      toast.success(`Stok kontrolü tamamlandı. ${data.triggeredAlerts} uyarı tetiklendi.`)
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Stok kontrolü başarısız')
    }
  })

  // Form handlers
  const handleCreateAlert = () => {
    createAlertMutation.mutate(formData)
  }

  const handleUpdateAlert = () => {
    if (!selectedAlert) return
    
    const updateData: Partial<StockAlert> = {}
    if (formData.threshold !== selectedAlert.threshold) updateData.threshold = formData.threshold
    if (formData.alertType !== selectedAlert.alertType) updateData.alertType = formData.alertType
    if (JSON.stringify(formData.notifyEmail) !== JSON.stringify(selectedAlert.notifyEmail)) {
      updateData.notifyEmail = formData.notifyEmail
    }
    
    updateAlertMutation.mutate({ id: selectedAlert.id, data: updateData })
  }

  const handleDeleteAlert = (id: string) => {
    if (confirm('Bu uyarı kuralını silmek istediğinizden emin misiniz?')) {
      deleteAlertMutation.mutate(id)
    }
  }

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id)
  }

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate()
  }

  const openEditModal = (alert: StockAlert) => {
    setSelectedAlert(alert)
    setFormData({
      productId: alert.productId,
      alertType: alert.alertType,
      threshold: alert.threshold || 50,
      notifyEmail: [...alert.notifyEmail]
    })
    setIsEditModalOpen(true)
  }

  const handleEmailChange = (value: string) => {
    const emails = value.split(',').map(email => email.trim()).filter(email => email.length > 0)
    setFormData(prev => ({ ...prev, notifyEmail: emails }))
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'STOCK_ALERT':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />
      case 'BALANCE_ALERT':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />
      case 'ORDER_FAILED':
        return <XCircle className="w-4 h-4 text-red-400" />
      case 'SYSTEM':
        return <Settings className="w-4 h-4 text-blue-400" />
      default:
        return <Bell className="w-4 h-4 text-gray-400" />
    }
  }

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return 'Düşük Stok'
      case 'OUT_OF_STOCK':
        return 'Stok Tükendi'
      default:
        return type
    }
  }

  const unreadCount = notificationsData?.notifications?.filter((n: Notification) => !n.isRead).length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Stok Uyarıları</h1>
          <p className="text-gray-400">Stok seviyelerini ve bildirimleri yönetin</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => stockCheckMutation.mutate()}
            disabled={stockCheckMutation.isPending}
            className="btn btn-secondary flex items-center"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Stok Kontrolü
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Uyarı
          </button>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-100">Bildirimler</h2>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount} okunmamış
              </span>
            )}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="btn btn-secondary btn-sm"
              >
                Tümünü Okundu İşaretle
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {notificationsData?.notifications?.map((notification: Notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                notification.isRead 
                  ? 'border-gray-700 bg-gray-800/50' 
                  : 'border-red-500/30 bg-red-500/10'
              }`}
              onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getAlertIcon(notification.type)}
                  <div className="flex-1">
                    <h4 className={`font-medium ${notification.isRead ? 'text-gray-300' : 'text-gray-100'}`}>
                      {notification.title}
                    </h4>
                    <p className={`text-sm ${notification.isRead ? 'text-gray-500' : 'text-gray-400'}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.createdAt).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                )}
              </div>
            </div>
          ))}
          
          {notificationsLoading && (
            <div className="text-center py-4 text-gray-400">
              Bildirimler yükleniyor...
            </div>
          )}
          
          {!notificationsLoading && (!notificationsData?.notifications || notificationsData.notifications.length === 0) && (
            <div className="text-center py-4 text-gray-400">
              Henüz bildirim bulunmuyor
            </div>
          )}
        </div>
      </div>

      {/* Stock Alerts Table */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Uyarı Kuralları</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Ürün</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Uyarı Türü</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Eşik</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">E-posta</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Durum</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Son Tetikleme</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {alerts?.map((alert, index) => (
                <tr
                  key={alert.id}
                  className={`border-b ${
                    index % 2 === 0 ? 'border-gray-800' : 'border-gray-700'
                  } hover:bg-gray-800/50 transition-colors`}
                >
                  <td className="py-3 px-4">
                    <div>
                      <div className="text-gray-100 font-medium">{alert.product.name}</div>
                      <div className="text-sm text-gray-400">{alert.product.sku}</div>
                      <div className="text-xs text-gray-500">Mevcut stok: {alert.product.stock}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      alert.alertType === 'LOW_STOCK' 
                        ? 'bg-yellow-500/20 text-yellow-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {getAlertTypeLabel(alert.alertType)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-100">
                    {alert.threshold ? `${alert.threshold} adet` : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {alert.notifyEmail.map((email, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-700 text-gray-300"
                        >
                          <Mail className="w-3 h-3 mr-1" />
                          {email}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      alert.isActive 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {alert.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-100">
                    {alert.lastTriggeredAt 
                      ? new Date(alert.lastTriggeredAt).toLocaleString('tr-TR')
                      : 'Henüz tetiklenmedi'
                    }
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(alert)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteAlert(alert.id)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {alertsLoading && (
            <div className="text-center py-8 text-gray-400">
              Yükleniyor...
            </div>
          )}
          
          {!alertsLoading && (!alerts || alerts.length === 0) && (
            <div className="text-center py-8 text-gray-400">
              Henüz uyarı kuralı bulunmuyor
            </div>
          )}
        </div>
      </div>

      {/* Create Alert Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Yeni Stok Uyarısı</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-2">Ürün</label>
                <input
                  type="text"
                  value={formData.productId}
                  onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value }))}
                  className="input"
                  placeholder="Ürün ID"
                />
              </div>
              
              <div>
                <label className="text-gray-400 text-sm block mb-2">Uyarı Türü</label>
                <select
                  value={formData.alertType}
                  onChange={(e) => setFormData(prev => ({ ...prev, alertType: e.target.value as any }))}
                  className="input"
                >
                  <option value="LOW_STOCK">Düşük Stok</option>
                  <option value="OUT_OF_STOCK">Stok Tükendi</option>
                </select>
              </div>
              
              <div>
                <label className="text-gray-400 text-sm block mb-2">Eşik Adedi</label>
                <input
                  type="number"
                  min="1"
                  value={formData.threshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                  className="input"
                  disabled={formData.alertType === 'OUT_OF_STOCK'}
                />
                <p className="text-gray-500 text-xs mt-1">
                  {formData.alertType === 'LOW_STOCK' 
                    ? 'Bu adedin altına düştüğünde uyarı gönderilir'
                    : 'Stok sıfırlandığında uyarı gönderilir'
                  }
                </p>
              </div>
              
              <div>
                <label className="text-gray-400 text-sm block mb-2">Bildirim E-postaları</label>
                <textarea
                  value={formData.notifyEmail.join(', ')}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className="input h-20"
                  placeholder="admin@omega.com, ops@omega.com"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Virgülle ayırarak birden fazla e-posta ekleyebilirsiniz
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="btn btn-secondary"
              >
                İptal
              </button>
              <button
                onClick={handleCreateAlert}
                disabled={createAlertMutation.isPending}
                className="btn btn-primary"
              >
                {createAlertMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Alert Modal */}
      {isEditModalOpen && selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Stok Uyarısını Düzenle</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-2">Ürün</label>
                <input
                  type="text"
                  value={formData.productId}
                  disabled
                  className="input bg-gray-700"
                />
              </div>
              
              <div>
                <label className="text-gray-400 text-sm block mb-2">Uyarı Türü</label>
                <select
                  value={formData.alertType}
                  onChange={(e) => setFormData(prev => ({ ...prev, alertType: e.target.value as any }))}
                  className="input"
                >
                  <option value="LOW_STOCK">Düşük Stok</option>
                  <option value="OUT_OF_STOCK">Stok Tükendi</option>
                </select>
              </div>
              
              <div>
                <label className="text-gray-400 text-sm block mb-2">Eşik Adedi</label>
                <input
                  type="number"
                  min="1"
                  value={formData.threshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                  className="input"
                  disabled={formData.alertType === 'OUT_OF_STOCK'}
                />
              </div>
              
              <div>
                <label className="text-gray-400 text-sm block mb-2">Bildirim E-postaları</label>
                <textarea
                  value={formData.notifyEmail.join(', ')}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className="input h-20"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="btn btn-secondary"
              >
                İptal
              </button>
              <button
                onClick={handleUpdateAlert}
                disabled={updateAlertMutation.isPending}
                className="btn btn-primary"
              >
                {updateAlertMutation.isPending ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
