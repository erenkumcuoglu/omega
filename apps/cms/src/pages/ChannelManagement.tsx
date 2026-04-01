import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Globe, TestTube, ToggleLeft, ToggleRight, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import api from '../lib/api'

interface Channel {
  id: string
  name: string
  commissionPct: number
  webhookIps: string[]
  countryCode?: string
  isActive: boolean
  createdAt: string
  recentOrders?: number
  recentRevenue?: number
}

interface CreateChannelRequest {
  name: string
  commissionPct: number
  webhookIps: string[]
  countryCode?: string
}

interface WebhookTestResult {
  ipCheck: string
  hmacCheck: string
  idempotency: string
  timestamp: string
}

export function ChannelManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [showTestModal, setShowTestModal] = useState(false)
  const [testResults, setTestResults] = useState<WebhookTestResult | null>(null)
  const [formData, setFormData] = useState<CreateChannelRequest>({
    name: '',
    commissionPct: 0,
    webhookIps: [''],
    countryCode: undefined
  })

  const queryClient = useQueryClient()

  // Get channels
  const { data: channels, isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const response = await api.get('/channels')
      return response.data as Channel[]
    }
  })

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: async (channelData: CreateChannelRequest) => {
      const response = await api.post('/channels', channelData)
      return response.data
    },
    onSuccess: () => {
      toast.success('Kanal başarıyla oluşturuldu')
      setIsCreateModalOpen(false)
      setFormData({ name: '', commissionPct: 0, webhookIps: [''], countryCode: undefined })
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Kanal oluşturulamadı')
    }
  })

  // Toggle channel status mutation
  const toggleChannelMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await api.patch(`/channels/${id}/status`, { isActive })
      return response.data
    },
    onSuccess: () => {
      toast.success('Kanal durumu güncellendi')
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Kanal durumu güncellenemedi')
    }
  })

  // Test webhook mutation
  const testWebhookMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const response = await api.post(`/channels/${channelId}/webhook-test`)
      return response.data
    },
    onSuccess: (data) => {
      setTestResults(data)
      toast.success('Webhook test tamamlandı')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Webhook test başarısız')
    }
  })

  // Form handlers
  const handleCreateChannel = () => {
    createChannelMutation.mutate(formData)
  }

  const handleToggleChannel = (channel: Channel) => {
    toggleChannelMutation.mutate({ id: channel.id, isActive: !channel.isActive })
  }

  const handleTestWebhook = (channel: Channel) => {
    setSelectedChannel(channel)
    setShowTestModal(true)
    testWebhookMutation.mutate(channel.id)
  }

  const openEditModal = (channel: Channel) => {
    setSelectedChannel(channel)
    setFormData({
      name: channel.name,
      commissionPct: channel.commissionPct,
      webhookIps: channel.webhookIps,
      countryCode: channel.countryCode || undefined
    })
    setIsEditModalOpen(true)
  }

  const handleWebhookIpsChange = (value: string) => {
    const ips = value.split('\n').map(ip => ip.trim()).filter(ip => ip.length > 0)
    setFormData(prev => ({ ...prev, webhookIps: ips }))
  }

  const getCountryName = (code: string) => {
    const countries: { [key: string]: string } = {
      'PK': 'Pakistan',
      'BD': 'Bangladeş',
      'LK': 'Sri Lanka',
      'NP': 'Nepal',
      'MM': 'Myanmar'
    }
    return countries[code] || code
  }

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-500/20 text-green-400' 
      : 'bg-red-500/20 text-red-400'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Kanal Yönetimi</h1>
          <p className="text-gray-400">Satış kanallarını ve webhook ayarlarını yönetin</p>
        </div>
        
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Yeni Kanal
        </button>
      </div>

      {/* Channels Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Kanal</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Ülke</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Komisyon %</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Durum</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Son 30 Gün Sipariş</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {channels?.map((channel, index) => (
                <tr
                  key={channel.id}
                  className={`border-b ${
                    index % 2 === 0 ? 'border-gray-800' : 'border-gray-700'
                  } hover:bg-gray-800/50 transition-colors`}
                >
                  <td className="py-3 px-4 text-gray-100 font-medium">{channel.name}</td>
                  <td className="py-3 px-4 text-gray-100">
                    {channel.countryCode ? (
                      <div className="flex items-center">
                        <Globe className="w-4 h-4 mr-2 text-blue-400" />
                        {getCountryName(channel.countryCode)}
                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-100">%{channel.commissionPct}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleChannel(channel)}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(channel.isActive)}`}
                    >
                      {channel.isActive ? (
                        <>
                          <ToggleRight className="w-3 h-3 mr-1" />
                          Aktif
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-3 h-3 mr-1" />
                          Pasif
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-gray-100">
                    <div>
                      <div>{channel.recentOrders}</div>
                      <div className="text-sm text-gray-400">
                        ₺{channel.recentRevenue?.toLocaleString('tr-TR')}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(channel)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      
                      <button
                        onClick={() => handleTestWebhook(channel)}
                        className="btn btn-secondary btn-sm"
                      >
                        <TestTube className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {isLoading && (
            <div className="text-center py-8 text-gray-400">
              Yükleniyor...
            </div>
          )}
          
          {!isLoading && channels?.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              Henüz kanal bulunmuyor
            </div>
          )}
        </div>
      </div>

      {/* Create Channel Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Yeni Kanal Ekle</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-2">Kanal Adı</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="Örn: Trendyol"
                />
              </div>
              
              <div>
                <label className="text-gray-400 text-sm block mb-2">Ülke Kodu (Opsiyonel)</label>
                <select
                  value={formData.countryCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, countryCode: e.target.value }))}
                  className="input"
                >
                  <option value="">Seçin (Global Kanal)</option>
                  <option value="PK">Pakistan (PK)</option>
                  <option value="BD">Bangladeş (BD)</option>
                  <option value="LK">Sri Lanka (LK)</option>
                  <option value="NP">Nepal (NP)</option>
                  <option value="MM">Myanmar (MM)</option>
                </select>
                <p className="text-gray-500 text-xs mt-1">
                  Daraz kanalları için ülke kodu gerekli
                </p>
              </div>
              
              <div>
                <label className="text-gray-400 text-sm block mb-2">Komisyon Oranı (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.commissionPct}
                  onChange={(e) => setFormData(prev => ({ ...prev, commissionPct: Number(e.target.value) }))}
                  className="input"
                  placeholder="15.0"
                />
              </div>
              
              <div>
                <label className="text-gray-400 text-sm block mb-2">Webhook IP'leri</label>
                <textarea
                  value={formData.webhookIps.join('\n')}
                  onChange={(e) => handleWebhookIpsChange(e.target.value)}
                  className="input h-24"
                  placeholder="127.0.0.1&#10;192.168.1.100&#10;10.0.0.1"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Her satıra bir IP adresi yazın
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
                onClick={handleCreateChannel}
                disabled={createChannelMutation.isPending}
                className="btn btn-primary"
              >
                {createChannelMutation.isPending ? 'Oluşturuluyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Channel Modal */}
      {isEditModalOpen && selectedChannel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Kanal Düzenle</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-2">Kanal Adı</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                />
              </div>
              
              <div>
                <label className="text-gray-400 text-sm block mb-2">Ülke Kodu</label>
                <select
                  value={formData.countryCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, countryCode: e.target.value }))}
                  className="input"
                >
                  <option value="">Seçin (Global Kanal)</option>
                  <option value="PK">Pakistan (PK)</option>
                  <option value="BD">Bangladeş (BD)</option>
                  <option value="LK">Sri Lanka (LK)</option>
                  <option value="NP">Nepal (NP)</option>
                  <option value="MM">Myanmar (MM)</option>
                </select>
              </div>
              
              <div>
                <label className="text-gray-400 text-sm block mb-2">Komisyon Oranı (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.commissionPct}
                  onChange={(e) => setFormData(prev => ({ ...prev, commissionPct: Number(e.target.value) }))}
                  className="input"
                />
              </div>
              
              <div>
                <label className="text-gray-400 text-sm block mb-2">Webhook IP'leri</label>
                <textarea
                  value={formData.webhookIps.join('\n')}
                  onChange={(e) => handleWebhookIpsChange(e.target.value)}
                  className="input h-24"
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
                onClick={handleCreateChannel}
                disabled={createChannelMutation.isPending}
                className="btn btn-primary"
              >
                {createChannelMutation.isPending ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Test Modal */}
      {showTestModal && selectedChannel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">
              Webhook Test - {selectedChannel.name}
            </h2>
            
            {testResults ? (
              <div className="space-y-3">
                <div className="flex items-center">
                  {testResults.ipCheck === 'passed' ? (
                    <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400 mr-2" />
                  )}
                  <span className="text-gray-100">
                    IP Whitelist kontrolü: <span className={testResults.ipCheck === 'passed' ? 'text-green-400' : 'text-red-400'}>
                      {testResults.ipCheck === 'passed' ? 'Geçti' : 'Başarısız'}
                    </span>
                  </span>
                </div>
                
                <div className="flex items-center">
                  {testResults.hmacCheck === 'passed' ? (
                    <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400 mr-2" />
                  )}
                  <span className="text-gray-100">
                    HMAC imza kontrolü: <span className={testResults.hmacCheck === 'passed' ? 'text-green-400' : 'text-red-400'}>
                      {testResults.hmacCheck === 'passed' ? 'Geçti' : 'Başarısız'}
                    </span>
                  </span>
                </div>
                
                <div className="flex items-center">
                  {testResults.idempotency === 'passed' ? (
                    <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400 mr-2" />
                  )}
                  <span className="text-gray-100">
                    Idempotency kontrolü: <span className={testResults.idempotency === 'passed' ? 'text-green-400' : 'text-red-400'}>
                      {testResults.idempotency === 'passed' ? 'Geçti' : 'Başarısız'}
                    </span>
                  </span>
                </div>
                
                <div className="text-gray-500 text-xs mt-4">
                  Test zamanı: {new Date(testResults.timestamp).toLocaleString('tr-TR')}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                <span className="ml-3 text-gray-300">Webhook test yapılıyor...</span>
              </div>
            )}
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowTestModal(false)
                  setSelectedChannel(null)
                  setTestResults(null)
                }}
                className="btn btn-primary"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
