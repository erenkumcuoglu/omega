import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import api from '../lib/api'
import { User } from '@omega/shared'

interface AuthState {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export function useAuth(): AuthState {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(true)

  const { data: user, error } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const response = await api.get('/auth/me')
      return response.data
    },
    retry: false,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (error || (user === undefined && !isLoading)) {
      setIsLoading(false)
    } else if (user !== undefined) {
      setIsLoading(false)
    }
  }, [user, error, isLoading])

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { accessToken } = response.data
      
      localStorage.setItem('accessToken', accessToken)
      
      // Invalidate and refetch user data
      await queryClient.invalidateQueries({ queryKey: ['auth', 'user'] })
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed')
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('accessToken')
      queryClient.clear()
      window.location.href = '/login'
    }
  }

  return {
    user: user || null,
    isLoading,
    login,
    logout,
  }
}
