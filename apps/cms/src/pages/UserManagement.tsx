import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, Edit, Key, Trash2, AlertTriangle, CheckCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import api from '../lib/api'

interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'OPERATIONS' | 'ACCOUNTING' | 'PRICING'
  isActive: boolean
  lastLoginAt: string
  createdAt: string
}

interface CreateUserRequest {
  email: string
  password: string
  role: 'ADMIN' | 'OPERATIONS' | 'ACCOUNTING' | 'PRICING'
  name: string
}

interface UpdateUserRequest {
  role?: 'ADMIN' | 'OPERATIONS' | 'ACCOUNTING' | 'PRICING'
  isActive?: boolean
  name?: string
}

export function UserManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<CreateUserRequest>({
    email: '',
    password: '',
    role: 'OPERATIONS',
    name: ''
  })
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [tempPassword, setTempPassword] = useState('')

  const queryClient = useQueryClient()

  // Get users
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users')
      return response.data as User[]
    }
  })

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserRequest) => {
      const response = await api.post('/users', userData)
      return response.data
    },
    onSuccess: () => {
      toast.success('Kullanıcı başarıyla oluşturuldu')
      setIsCreateModalOpen(false)
      setFormData({ email: '', password: '', role: 'OPERATIONS', name: '' })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Kullanıcı oluşturulamadı')
    }
  })

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserRequest }) => {
      const response = await api.patch(`/users/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Kullanıcı başarıyla güncellendi')
      setIsEditModalOpen(false)
      setSelectedUser(null)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Kullanıcı güncellenemedi')
    }
  })

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.post(`/users/${userId}/reset-password`)
      return response.data
    },
    onSuccess: (data) => {
      setTempPassword(data.temporaryPassword)
      toast.success('Şifre sıfırlandı')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Şifre sıfırlanamadı')
    }
  })

  // Deactivate user mutation
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.delete(`/users/${userId}`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Kullanıcı deaktive edildi')
      setShowDeactivateModal(false)
      setSelectedUser(null)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Kullanıcı deaktive edilemedi')
    }
  })

  // Form handlers
  const handleCreateUser = () => {
    createUserMutation.mutate(formData)
  }

  const handleUpdateUser = () => {
    if (!selectedUser) return
    
    const updateData: UpdateUserRequest = {}
    if (formData.role !== selectedUser.role) updateData.role = formData.role
    if (formData.name !== selectedUser.name) updateData.name = formData.name
    
    updateUserMutation.mutate({ id: selectedUser.id, data: updateData })
  }

  const handleResetPassword = () => {
    if (!selectedUser) return
    resetPasswordMutation.mutate(selectedUser.id)
  }

  const handleDeactivateUser = () => {
    if (!selectedUser) return
    deactivateUserMutation.mutate(selectedUser.id)
  }

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setFormData({
      email: user.email,
      password: '',
      role: user.role,
      name: user.name
    })
    setIsEditModalOpen(true)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Panoya kopyalandı')
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-500/20 text-red-400'
      case 'OPERATIONS': return 'bg-blue-500/20 text-blue-400'
      case 'ACCOUNTING': return 'bg-green-500/20 text-green-400'
      case 'PRICING': return 'bg-purple-500/20 text-purple-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Yönetici'
      case 'OPERATIONS': return 'Operasyon'
      case 'ACCOUNTING': return 'Muhasebe'
      case 'PRICING': return 'Fiyatlandırma'
      default: return role
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Kullanıcı Yönetimi</h1>
          <p className="text-gray-400">Kullanıcı hesaplarını ve rollerini yönetin</p>
        </div>
        
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Yeni Kullanıcı
        </button>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Ad</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Rol</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Durum</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Son Giriş</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user, index) => (
                <tr
                  key={user.id}
                  className={`border-b ${
                    index % 2 === 0 ? 'border-gray-800' : 'border-gray-700'
                  } hover:bg-gray-800/50 transition-colors`}
                >
                  <td className="py-3 px-4 text-gray-100 font-medium">{user.name}</td>
                  <td className="py-3 px-4 text-gray-100">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {user.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-100">
                    {new Date(user.lastLoginAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedUser(user)
                          setShowPasswordResetModal(true)
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        <Key className="w-3 h-3" />
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedUser(user)
                          setShowDeactivateModal(true)
                        }}
                        className="btn btn-secondary btn-sm"
                        disabled={!user.isActive}
                      >
                        <Trash2 className="w-3 h-3" />
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
          
          {!isLoading && users?.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              Henüz kullanıcı bulunmuyor
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Yeni Kullanıcı Oluştur</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-2">Ad</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="Kullanıcı adı"
                />
              </div>
              
              <div>
                <label className="text-gray-400 text-sm block mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="input"
                  placeholder="email@example.com"
                />
              </div>
              
              <div>
                <label className="text-gray-400 text-sm block mb-2">Rol</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as any }))}
                  className="input"
                >
                  <option value="ADMIN">Yönetici</option>
                  <option value="OPERATIONS">Operasyon</option>
                  <option value="ACCOUNTING">Muhasebe</option>
                  <option value="PRICING">Fiyatlandırma</option>
                </select>
              </div>
              
              <div>
                <label className="text-gray-400 text-sm block mb-2">Şifre</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="input"
                  placeholder="En az 12 karakter"
                />
                <p className="text-gray-500 text-xs mt-1">
                  En az 1 büyük harf, 1 rakam ve 1 özel karakter içermelidir
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
                onClick={handleCreateUser}
                disabled={createUserMutation.isPending}
                className="btn btn-primary"
              >
                {createUserMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Kullanıcı Düzenle</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-2">Ad</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                />
              </div>
              
              <div>
                <label className="text-gray-400 text-sm block mb-2">Email (değiştirilemez)</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="input bg-gray-700"
                />
              </div>
              
              <div>
                <label className="text-gray-400 text-sm block mb-2">Rol</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as any }))}
                  className="input"
                >
                  <option value="ADMIN">Yönetici</option>
                  <option value="OPERATIONS">Operasyon</option>
                  <option value="ACCOUNTING">Muhasebe</option>
                  <option value="PRICING">Fiyatlandırma</option>
                </select>
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
                onClick={handleUpdateUser}
                disabled={updateUserMutation.isPending}
                className="btn btn-primary"
              >
                {updateUserMutation.isPending ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordResetModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Şifre Sıfırla</h2>
            
            <p className="text-gray-300 mb-4">
              {selectedUser.name} ({selectedUser.email}) kullanıcısının şifresini sıfırlamak istediğinizden emin misiniz?
            </p>
            
            {tempPassword && (
              <div className="bg-gray-700 p-4 rounded-lg mb-4">
                <p className="text-gray-400 text-sm mb-2">Geçici şifre:</p>
                <div className="flex items-center justify-between">
                  <code className="text-green-400 font-mono">{tempPassword}</code>
                  <button
                    onClick={() => copyToClipboard(tempPassword)}
                    className="btn btn-secondary btn-sm"
                  >
                    Kopyala
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  Kullanıcı ilk girişte şifre değiştirmek zorunda olacak
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowPasswordResetModal(false)
                  setSelectedUser(null)
                  setTempPassword('')
                }}
                className="btn btn-secondary"
              >
                {tempPassword ? 'Kapat' : 'İptal'}
              </button>
              
              {!tempPassword && (
                <button
                  onClick={handleResetPassword}
                  disabled={resetPasswordMutation.isPending}
                  className="btn btn-primary"
                >
                  {resetPasswordMutation.isPending ? 'Sıfırlanıyor...' : 'Şifre Sıfırla'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deactivate User Modal */}
      {showDeactivateModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-100">Kullanıcı Deaktive Et</h2>
            </div>
            
            <p className="text-gray-300 mb-4">
              <strong>{selectedUser.name}</strong> kullanıcısını deaktive etmek istediğinizden emin misiniz?
            </p>
            
            <p className="text-red-400 text-sm mb-4">
              Bu kullanıcı sisteme giremeyecek. Bu işlem geri alınamaz.
            </p>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowDeactivateModal(false)
                  setSelectedUser(null)
                }}
                className="btn btn-secondary"
              >
                İptal
              </button>
              <button
                onClick={handleDeactivateUser}
                disabled={deactivateUserMutation.isPending}
                className="btn btn-red-600"
              >
                {deactivateUserMutation.isPending ? 'Deaktive ediliyor...' : 'Deaktive Et'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
