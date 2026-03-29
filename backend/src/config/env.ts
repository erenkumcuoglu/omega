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
  logLevel: process.env.LOG_LEVEL || 'debug'
}
