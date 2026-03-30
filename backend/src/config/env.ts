import dotenv from 'dotenv'

dotenv.config()

export const config = {
  port: process.env.PORT || 3001,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  turkpin: {
    username: process.env.TURKPIN_USERNAME || '',
    password: process.env.TURKPIN_PASSWORD || '',
    apiUrl: process.env.TURKPIN_API_URL || 'https://api.turkpin.com'
  },
  logLevel: process.env.LOG_LEVEL || 'debug',
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  }
}
