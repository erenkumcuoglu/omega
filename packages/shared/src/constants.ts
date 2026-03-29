// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout'
  },
  WEBHOOKS: {
    TRENDYOL: '/webhooks/trendyol',
    HEPSIBURADA: '/webhooks/hepsiburada',
    OZAN: '/webhooks/ozan'
  },
  DASHBOARD: {
    SUMMARY: '/dashboard/summary',
    PROVIDERS: '/dashboard/providers'
  },
  ORDERS: {
    LIST: '/orders',
    DETAIL: '/orders/:id'
  },
  PRODUCTS: {
    LIST: '/products',
    UPDATE_PRICE: '/products/:id/price',
    TOGGLE: '/products/:id/toggle'
  },
  PROVIDERS: {
    LIST: '/providers',
    TOGGLE: '/providers/:id/toggle'
  },
  CHANNELS: {
    LIST: '/channels',
    UPDATE_COMMISSION: '/channels/:id/commission'
  },
  AUDIT: {
    LOGS: '/audit-logs'
  },
  SYSTEM: {
    BALANCE: '/system/balance',
    HEALTH: '/system/health'
  }
} as const;

// Rate Limits
export const RATE_LIMITS = {
  WEBHOOKS: { requests: 60, windowMs: 60 * 1000 }, // 60 requests/minute
  AUTH_LOGIN: { requests: 5, windowMs: 60 * 1000 }, // 5 requests/minute
  AUTH: { requests: 20, windowMs: 60 * 1000 }, // 20 requests/minute
  API: { requests: 300, windowMs: 60 * 1000 } // 300 requests/minute
} as const;

// Redis Keys
export const REDIS_KEYS = {
  IDEMPOTENCY: (key: string) => `idempotency:${key}`,
  RATE_LIMIT: (identifier: string) => `rate_limit:${identifier}`,
  WEBHOOK_LOCK: (channel: string, orderId: string) => `webhook_lock:${channel}:${orderId}`
} as const;

// Turkpin Error Codes
export const TURKPIN_ERROR_CODES = {
  INSUFFICIENT_STOCK: 12,
  INSUFFICIENT_BALANCE: 14,
  MAINTENANCE_MODE: 23
} as const;

// JWT Config
export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict' as const,
    path: '/'
  }
} as const;

// Encryption Config
export const ENCRYPTION_CONFIG = {
  ALGORITHM: 'aes-256-gcm',
  KEY_LENGTH: 32, // bytes
  IV_LENGTH: 16, // bytes
  TAG_LENGTH: 16 // bytes
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

// Validation Messages
export const VALIDATION_MESSAGES = {
  INVALID_EMAIL: 'Geçerli bir e-posta adresi giriniz',
  INVALID_PASSWORD: 'Şifre en az 1 karakter olmalıdır',
  INVALID_ROLE: 'Geçersiz kullanıcı rolü',
  INVALID_PRICE: 'Fiyat 0 veya daha büyük olmalıdır',
  INVALID_MARGIN: 'Marj yüzdesi 0-100 arasında olmalıdır',
  INVALID_QUANTITY: 'Adet 1 veya daha büyük olmalıdır',
  REQUIRED_FIELD: 'Bu alan zorunludur',
  INVALID_DATE: 'Geçersiz tarih formatı'
} as const;
