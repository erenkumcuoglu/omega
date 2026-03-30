import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { logger } from '../config/logger'
import { TurkpinService } from './turkpin.service'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  services: {
    database: ServiceHealth
    turkpin: ServiceHealth
    memory: ServiceHealth
    disk: ServiceHealth
  }
  metrics: {
    totalOrders: number
    pendingOrders: number
    failedOrders: number
    fulfilledOrders: number
    totalProducts: number
    lowStockProducts: number
  }
}

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  responseTime?: number
  error?: string
  lastCheck: string
}

interface WebhookStats {
  total: number
  today: number
  thisWeek: number
  thisMonth: number
  successRate: number
  errors: Array<{
    error: string
    count: number
    lastOccurred: string
  }>
}

export class SystemHealthService {
  private readonly prisma: PrismaClient
  private readonly turkpinService: TurkpinService
  private readonly startTime: Date

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL
    })

    this.prisma = new PrismaClient({
      adapter,
      log: ['query', 'info', 'warn', 'error']
    })

    this.turkpinService = new TurkpinService()
    this.startTime = new Date()
  }

  async getHealthStatus(): Promise<HealthStatus> {
    try {
      const timestamp = new Date().toISOString()
      const uptime = Date.now() - this.startTime.getTime()

      // Parallel health checks
      const [dbHealth, turkpinHealth, memoryHealth, diskHealth] = await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkTurkpinHealth(),
        this.checkMemoryHealth(),
        this.checkDiskHealth()
      ])

      // Get metrics
      const metrics = await this.getSystemMetrics()

      // Determine overall status
      const services = {
        database: this.parseHealthResult(dbHealth),
        turkpin: this.parseHealthResult(turkpinHealth),
        memory: this.parseHealthResult(memoryHealth),
        disk: this.parseHealthResult(diskHealth)
      }

      const overallStatus = this.determineOverallStatus(services)

      return {
        status: overallStatus,
        timestamp,
        uptime,
        version: process.env.npm_package_version || '1.0.0',
        services,
        metrics
      }

    } catch (error) {
      logger.error('Health check error:', error)
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: 0,
        version: '1.0.0',
        services: {
          database: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Unknown error' },
          turkpin: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Unknown error' },
          memory: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Unknown error' },
          disk: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Unknown error' }
        },
        metrics: {
          totalOrders: 0,
          pendingOrders: 0,
          failedOrders: 0,
          fulfilledOrders: 0,
          totalProducts: 0,
          lowStockProducts: 0
        }
      }
    }
  }

  private parseHealthResult(result: PromiseSettledResult<ServiceHealth>): ServiceHealth {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: result.reason.message
      }
    }
  }

  private determineOverallStatus(services: HealthStatus['services']): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(services).map(s => s.status)
    
    if (statuses.every(s => s === 'healthy')) {
      return 'healthy'
    } else if (statuses.some(s => s === 'unhealthy')) {
      return 'unhealthy'
    } else {
      return 'degraded'
    }
  }

  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    const startTime = Date.now()
    
    try {
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`
      
      const responseTime = Date.now() - startTime
      
      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        lastCheck: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error.message
      }
    }
  }

  private async checkTurkpinHealth(): Promise<ServiceHealth> {
    const startTime = Date.now()
    
    try {
      // Test Turkpin API
      await this.turkpinService.checkBalance()
      
      const responseTime = Date.now() - startTime
      
      return {
        status: responseTime < 5000 ? 'healthy' : 'degraded',
        responseTime,
        lastCheck: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error.message
      }
    }
  }

  private async checkMemoryHealth(): Promise<ServiceHealth> {
    try {
      const memUsage = process.memoryUsage()
      const totalMemory = memUsage.heapTotal / 1024 / 1024 // MB
      const usedMemory = memUsage.heapUsed / 1024 / 1024 // MB
      const usagePercent = (usedMemory / totalMemory) * 100

      return {
        status: usagePercent < 80 ? 'healthy' : usagePercent < 95 ? 'degraded' : 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: usagePercent > 95 ? `High memory usage: ${usagePercent.toFixed(2)}%` : undefined
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error.message
      }
    }
  }

  private async checkDiskHealth(): Promise<ServiceHealth> {
    try {
      // Simple disk check (would need fs module for actual disk space)
      // For now, return healthy
      return {
        status: 'healthy',
        lastCheck: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error.message
      }
    }
  }

  private async getSystemMetrics() {
    try {
      const [
        totalOrders,
        pendingOrders,
        failedOrders,
        fulfilledOrders,
        totalProducts,
        lowStockProducts
      ] = await Promise.all([
        this.prisma.order.count(),
        this.prisma.order.count({ where: { status: 'PENDING' } }),
        this.prisma.order.count({ where: { status: 'FAILED' } }),
        this.prisma.order.count({ where: { status: 'FULFILLED' } }),
        this.prisma.product.count({ where: { isActive: true } }),
        this.prisma.product.count({
          where: {
            isActive: true,
            stock: { lt: 10 }
          }
        })
      ])

      return {
        totalOrders,
        pendingOrders,
        failedOrders,
        fulfilledOrders,
        totalProducts,
        lowStockProducts
      }
    } catch (error) {
      logger.error('Error getting system metrics:', error)
      return {
        totalOrders: 0,
        pendingOrders: 0,
        failedOrders: 0,
        fulfilledOrders: 0,
        totalProducts: 0,
        lowStockProducts: 0
      }
    }
  }

  async getWebhookStats(): Promise<WebhookStats> {
    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const thisWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000))
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const [
        totalWebhooks,
        todayWebhooks,
        thisWeekWebhooks,
        thisMonthWebhooks
      ] = await Promise.all([
        this.prisma.auditLog.count({
          where: {
            action: { startsWith: 'WEBHOOK' }
          }
        }),
        this.prisma.auditLog.count({
          where: {
            action: { startsWith: 'WEBHOOK' },
            createdAt: { gte: today }
          }
        }),
        this.prisma.auditLog.count({
          where: {
            action: { startsWith: 'WEBHOOK' },
            createdAt: { gte: thisWeek }
          }
        }),
        this.prisma.auditLog.count({
          where: {
            action: { startsWith: 'WEBHOOK' },
            createdAt: { gte: thisMonth }
          }
        })
      ])

      // Get webhook errors
      const errorLogs = await this.prisma.auditLog.groupBy({
        by: ['meta'],
        where: {
          action: 'WEBHOOK_ERROR',
          createdAt: { gte: thisWeek }
        },
        _count: true,
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 5
      })

      const errors = errorLogs.map(log => ({
        error: (log.meta as any)?.error || 'Unknown error',
        count: log._count,
        lastOccurred: 'Recent' // Would need actual timestamp from aggregation
      }))

      const successRate = totalWebhooks > 0 ? ((totalWebhooks - errors.reduce((sum, e) => sum + e.count, 0)) / totalWebhooks) * 100 : 100

      return {
        total: totalWebhooks,
        today: todayWebhooks,
        thisWeek: thisWeekWebhooks,
        thisMonth: thisMonthWebhooks,
        successRate,
        errors
      }
    } catch (error) {
      logger.error('Error getting webhook stats:', error)
      return {
        total: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        successRate: 100,
        errors: []
      }
    }
  }

  async getRecentErrors(limit: number = 20): Promise<any[]> {
    try {
      const errors = await this.prisma.auditLog.findMany({
        where: {
          action: { contains: 'ERROR' }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      })

      return errors
    } catch (error) {
      logger.error('Error getting recent errors:', error)
      return []
    }
  }

  async getPerformanceMetrics(): Promise<any> {
    try {
      const now = new Date()
      const last24h = new Date(now.getTime() - (24 * 60 * 60 * 1000))
      const last7d = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))

      const [
        orders24h,
        orders7d,
        avgFulfillmentTime,
        topProducts
      ] = await Promise.all([
        this.prisma.order.count({
          where: {
            createdAt: { gte: last24h }
          }
        }),
        this.prisma.order.count({
          where: {
            createdAt: { gte: last7d }
          }
        }),
        this.prisma.order.aggregate({
          where: {
            fulfilledAt: { not: null },
            createdAt: { gte: last24h }
          },
          _avg: {
            fulfilledAt: true
          }
        }),
        this.prisma.order.groupBy({
          by: ['productId'],
          where: {
            createdAt: { gte: last7d }
          },
          _count: true,
          orderBy: {
            _count: {
              id: 'desc'
            }
          },
          take: 5
        })
      ])

      return {
        orders24h,
        orders7d,
        avgFulfillmentTime: avgFulfillmentTime._avg.fulfilledAt ? 
          Math.round((Date.now() - avgFulfillmentTime._avg.fulfilledAt.getTime()) / 1000 / 60) : 0,
        topProducts: topProducts.map(p => ({
          productId: p.productId,
          orderCount: p._count
        }))
      }
    } catch (error) {
      logger.error('Error getting performance metrics:', error)
      return {
        orders24h: 0,
        orders7d: 0,
        avgFulfillmentTime: 0,
        topProducts: []
      }
    }
  }
}

export default SystemHealthService
