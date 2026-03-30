import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { logger } from '../config/logger'

type ChannelKey = 'trendyol' | 'hepsiburada' | 'allegro' | 'daraz-lk'

interface ChannelConfig {
  headerName: string
  secretEnvVar: string
  encoding: 'base64' | 'hex'
  timestampHeader?: string
  timestampTolerance?: number // minutes
}

const CHANNEL_CONFIGS: Record<ChannelKey, ChannelConfig> = {
  'trendyol': {
    headerName: 'x-trendyol-signature',
    secretEnvVar: 'TRENDYOL_WEBHOOK_SECRET',
    encoding: 'base64'
  },
  'hepsiburada': {
    headerName: 'x-hb-signature',
    secretEnvVar: 'HEPSIBURADA_WEBHOOK_SECRET',
    encoding: 'base64',
    timestampHeader: 'x-hb-timestamp',
    timestampTolerance: 5 // 5 minutes
  },
  'allegro': {
    headerName: 'x-allegro-signature',
    secretEnvVar: 'ALLEGRO_WEBHOOK_SECRET',
    encoding: 'hex'
  },
  'daraz-lk': {
    headerName: 'x-daraz-signature',
    secretEnvVar: 'DARAZ_LK_WEBHOOK_SECRET',
    encoding: 'base64',
    timestampHeader: 'x-daraz-timestamp',
    timestampTolerance: 5 // 5 minutes
  }
}

export function hmacVerify(channel: ChannelKey) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const config = CHANNEL_CONFIGS[channel]
      const secret = process.env[config.secretEnvVar]

      if (!secret) {
        logger.warn(`Webhook secret not configured for ${channel}`)
        res.status(500).json({
          success: false,
          error: 'Webhook secret not configured'
        })
        return
      }

      // Signature header kontrolü
      const signature = req.headers[config.headerName] as string
      if (!signature) {
        logger.warn(`Missing signature header for ${channel}: ${config.headerName}`)
        res.status(401).json({
          success: false,
          error: 'Missing signature'
        })
        return
      }

      // Timestamp kontrolü (varsa)
      if (config.timestampHeader && config.timestampTolerance) {
        const timestamp = req.headers[config.timestampHeader] as string
        if (!timestamp) {
          logger.warn(`Missing timestamp header for ${channel}: ${config.timestampHeader}`)
          res.status(401).json({
            success: false,
            error: 'Missing timestamp'
          })
          return
        }

        const timestampMs = parseInt(timestamp)
        const nowMs = Date.now()
        const toleranceMs = config.timestampTolerance * 60 * 1000

        if (Math.abs(nowMs - timestampMs) > toleranceMs) {
          logger.warn(`Timestamp too old for ${channel}: ${timestamp}`)
          res.status(401).json({
            success: false,
            error: 'Timestamp too old'
          })
          return
        }
      }

      // Signature doğrulama
      const isValidSignature = verifySignature(req, channel, signature, secret)
      if (!isValidSignature) {
        logger.warn(`Invalid signature for ${channel}`)
        res.status(401).json({
          success: false,
          error: 'Invalid signature'
        })
        return
      }

      logger.info(`Signature verified for ${channel}`)
      next()

    } catch (error) {
      logger.error(`HMAC verification error for ${channel}:`, error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }
}

function verifySignature(req: Request, channel: ChannelKey, signature: string, secret: string): boolean {
  const config = CHANNEL_CONFIGS[channel]
  let payload: string

  switch (channel) {
    case 'trendyol':
      // Trendyol: HMAC-SHA256(requestBody, secret)
      payload = JSON.stringify(req.body)
      break

    case 'hepsiburada':
      // Hepsiburada: HMAC-SHA256(merchantId + ":" + timestamp + ":" + requestBody, secret)
      const merchantId = process.env.HEPSIBURADA_MERCHANT_ID || ''
      const timestamp = req.headers['x-hb-timestamp'] as string || ''
      payload = `${merchantId}:${timestamp}:${JSON.stringify(req.body)}`
      break

    case 'allegro':
      // Allegro: HMAC-SHA256(requestBody, secret)
      payload = JSON.stringify(req.body)
      break

    case 'daraz-lk':
      // Daraz: HMAC-SHA256(method + "\n" + path + "\n" + timestamp + "\n" + requestBody, secret)
      const method = req.method
      const path = req.path
      const darazTimestamp = req.headers['x-daraz-timestamp'] as string || ''
      payload = `${method}\n${path}\n${darazTimestamp}\n${JSON.stringify(req.body)}`
      break

    default:
      return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest(config.encoding)

  // timingSafeEqual ile karşılaştırma
  try {
    const signatureBuffer = Buffer.from(signature, config.encoding)
    const expectedBuffer = Buffer.from(expectedSignature, config.encoding)
    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  } catch (error) {
    logger.error('Signature comparison error:', error)
    return false
  }
}

export default hmacVerify
