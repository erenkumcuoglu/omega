import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Percent } from 'lucide-react'
import { formatNumber } from '../lib/utils'
import { toast } from 'sonner'
import api from '../lib/api'

interface Channel {
  id: string
  name: string
  commissionPct: number
  isActive: boolean
  orderCount: number
  revenue: number
}

export function Channels() {
  const queryClient = useQueryClient()

  const { data: channels, isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const response = await api.get('/channels')
      return response.data as Channel[]
    },
  })

  const updateCommissionMutation = useMutation({
    mutationFn: async ({ channelId, commissionPct }: { channelId: string; commissionPct: number }) => {
      await api.patch(`/channels/${channelId}`, { commissionPct })
    },
    onSuccess: () => {
      toast.success('Komisyon güncellendi')
      queryClient.invalidateQueries({ queryKey: ['channels'] })
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
          <h1 className="text-2xl font-bold">Satış Kanalları</h1>
          <p className="text-textSecondary">Pazar yeri yönetimi ve komisyon ayarları</p>
        </div>
      </div>

      {/* Channels List */}
      <div className="card">
        <div className="space-y-4">
          {channels?.map((channel) => (
            <div key={channel.id} className="flex items-center justify-between p-4 bg-surface rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-info/10 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-info" />
                </div>
                <div>
                  <h3 className="font-semibold">{channel.name}</h3>
                  <div className="flex items-center space-x-4 text-sm text-textSecondary">
                    <span>{formatNumber(channel.orderCount)} sipariş</span>
                    <span>•</span>
                    <span>{formatNumber(channel.revenue)} TL ciro</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Percent className="h-4 w-4 text-textSecondary" />
                  <input
                    type="number"
                    step="0.01"
                    value={channel.commissionPct}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0
                      updateCommissionMutation.mutate({
                        channelId: channel.id,
                        commissionPct: value
                      })
                    }}
                    disabled={updateCommissionMutation.isPending}
                    className="input w-20 text-sm"
                  />
                  <span className="text-textSecondary text-sm">%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
