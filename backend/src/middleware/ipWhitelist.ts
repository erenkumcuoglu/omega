import { Request, Response, NextFunction } from 'express'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { logger } from '../config/logger'

type ChannelKey = 'trendyol' | 'hepsiburada' | 'allegro' | 'daraz-lk'

const parseIpList = (envVar: string | undefined): string[] => {
  if (!envVar) return []
  return envVar.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0)
}

const CHANNEL_IPS: Record<ChannelKey, string[]> = {
  'trendyol': parseIpList(process.env.TRENDYOL_WEBHOOK_IPS),
  'hepsiburada': parseIpList(process.env.HEPSIBURADA_WEBHOOK_IPS),
  'allegro': parseIpList(process.env.ALLEGRO_WEBHOOK_IPS),
  'daraz-lk': parseIpList(process.env.DARAZ_LK_WEBHOOK_IPS),
}

const getClientIp = (req: Request): string => {
  // Cloudflare header
  const cfConnectingIp = req.headers['cf-connecting-ip'] as string
  if (cfConnectingIp) return cfConnectingIp
  
  // Standard proxy headers
  const xForwardedFor = req.headers['x-forwarded-for'] as string
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim()
  }
  
  // Direct connection
  return req.ip || req.connection.remoteAddress || 'unknown'
}

export function ipWhitelist(channel: ChannelKey) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clientIp = getClientIp(req)
      const allowedIps = CHANNEL_IPS[channel]

      // "sandbox" varsa tüm IP'lere izin ver
      if (allowedIps.includes('sandbox')) {
        logger.info(`IP whitelist bypassed for ${channel} (sandbox mode)`)
        return next()
      }

      // IP listesi boşsa engelle
      if (allowedIps.length === 0) {
        logger.warn(`IP whitelist empty for ${channel}, blocking ${clientIp}`)
        
        // Audit log yaz
        await writeAuditLog(channel, clientIp, 'WEBHOOK_BLOCKED', 'IP whitelist empty')
        
        res.status(403).json({
          success: false,
          error: 'IP whitelist not configured'
        })
        return
      }

      // IP kontrolü
      if (!allowedIps.includes(clientIp)) {
        logger.warn(`IP not in whitelist for ${channel}: ${clientIp}`)
        
        // Audit log yaz
        await writeAuditLog(channel, clientIp, 'WEBHOOK_BLOCKED', 'IP not in whitelist')
        
        res.status(403).json({
          success: false,
          error: 'IP not authorized'
        })
        return
      }

      logger.info(`IP whitelist passed for ${channel}: ${clientIp}`)
      next()

    } catch (error) {
      logger.error(`IP whitelist error for ${channel}:`, error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }
}

async function writeAuditLog(channel: string, ip: string, action: string, reason: string): Promise<void> {
  try {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL
    })

    const prisma = new PrismaClient({
      adapter,
      log: ['error']
    })

    await prisma.auditLog.create({
      data: {
        userId: null,
        action,
        entity: 'Webhook',
        entityId: channel,
        meta: {
          channel,
          ip,
          reason
        },
        ip
      }
    })

    await prisma.$disconnect()
  } catch (error) {
    logger.error('Failed to write audit log:', error)
  }
}

export default ipWhitelist
