import express from 'express'
import cors from 'cors'
import { config } from './config/env'
import { requestLogger } from './middleware/requestLogger'
import { errorHandler } from './middleware/errorHandler'
import logger from './utils/logger'
import routes from './routes'

const app = express()

// CORS configuration - only allow frontend dev server
app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}))

// JSON body parser
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging
app.use(requestLogger)

// API routes
app.use('/api', routes)

// Global error handler
app.use(errorHandler)

// Start server
const PORT = config.port
app.listen(PORT, () => {
  logger.info(`Omega Backend başlatıldı — port ${PORT}`)
  logger.info(`CORS enabled for: ${config.frontendUrl}`)
})
