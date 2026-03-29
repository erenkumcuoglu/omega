import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Server, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'
import api from '../lib/api'

interface Provider {
  id: string
  name: string
  type: 'API' | 'STOCK'
  isActive: boolean
  createdAt: string
}

export function Providers() {
  const queryClient = useQueryClient()

  const { data: providers, isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const response = await api.get('/providers')
      return response.data as Provider[]
    },
  })

  const toggleProviderMutation = useMutation({
    mutationFn: async ({ providerId, isActive }: { providerId: string; isActive: boolean }) => {
      await api.patch(`/providers/${providerId}/toggle`, { isActive })
    },
    onSuccess: () => {
      toast.success('Provider durumu güncellendi')
      queryClient.invalidateQueries({ queryKey: ['providers'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'İşlem başarısız')
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-20"></div>
        <div className="card">
          <div className="skeleton h-96"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Providerlar</h1>
          <p className="text-textSecondary">Oyun kodu sağlayıcıları yönetimi</p>
        </div>
      </div>

      {/* Providers List */}
      <div className="card">
        <div className="space-y-4">
          {providers?.map((provider) => (
            <div key={provider.id} className="flex items-center justify-between p-4 bg-surface rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center">
                  <Server className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold">{provider.name}</h3>
                  <div className="flex items-center space-x-4 text-sm text-textSecondary">
                    <span className="badge badge-info">{provider.type}</span>
                    <span>Oluşturulma: {new Date(provider.createdAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => toggleProviderMutation.mutate({
                  providerId: provider.id,
                  isActive: !provider.isActive
                })}
                disabled={toggleProviderMutation.isPending}
                className="p-3 hover:bg-surfaceHover rounded-lg transition-colors"
              >
                {provider.isActive ? (
                  <ToggleRight className="h-6 w-6 text-success" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-error" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
