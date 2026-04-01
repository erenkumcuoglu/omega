import axios from 'axios'

// Use VITE_API_URL env var if set, otherwise use /api (proxied through nginx)
const rawApiBaseUrl = ((import.meta as any).env?.VITE_API_URL as string | undefined)?.trim()

const normalizeApiBaseUrl = (value?: string) => {
  if (!value) return '/api'

  const sanitized = value.replace(/\/$/, '')
  if (sanitized === '/api' || sanitized.endsWith('/api')) {
    return sanitized
  }

  return `${sanitized}/api`
}

const API_BASE_URL = normalizeApiBaseUrl(rawApiBaseUrl)

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
          withCredentials: true,
        })

        const { accessToken } = response.data
        localStorage.setItem('accessToken', accessToken)

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api
