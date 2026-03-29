import pino from 'pino';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { TurkpinService } from './TurkpinService';
import { CryptoService } from '../utils/crypto';
import { 
  WebhookPayload, 
  OrderStatus, 
  AuditAction,
  REDIS_KEYS,
  TURKPIN_ERROR_CODES
} from '@omega/shared';
import { Queue, Worker, Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

interface WebhookOrderData {
  payload: WebhookPayload;
  channelName: string;
  clientIp: string;
}

interface FulfillmentJobData extends WebhookOrderData {
  orderId: string;
}

export class OrderFulfillmentService {
  private static instance: OrderFulfillmentService;
  private queue: Queue;
  private worker: Worker;
  private turkpinService: TurkpinService;

  private constructor() {
    this.turkpinService = TurkpinService.getInstance();
    
    // Initialize BullMQ queue
    this.queue = new Queue('order-fulfillment', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    // Initialize worker
    this.worker = new Worker('order-fulfillment', this.processFulfillmentJob.bind(this), {
      connection: redis,
      concurrency: 5
    });

    this.worker.on('completed', (job: Job) => {
      logger.info('Fulfillment job completed', { 
        jobId: job.id, 
        orderId: job.data.orderId 
      });
    });

    this.worker.on('failed', (job: Job | undefined, err: Error) => {
      logger.error('Fulfillment job failed', { 
        jobId: job?.id, 
        orderId: job?.data?.orderId, 
        error: err.message 
      });
    });
  }

  public static getInstance(): OrderFulfillmentService {
    if (!OrderFulfillmentService.instance) {
      OrderFulfillmentService.instance = new OrderFulfillmentService();
    }
    return OrderFulfillmentService.instance;
  }

  async processWebhookOrder(data: WebhookOrderData): Promise<void> {
    const { payload, channelName, clientIp } = data;
    const idempotencyKey = `${channelName}-${payload.orderId}`;
    const redisKey = REDIS_KEYS.IDEMPOTENCY(idempotencyKey);

    try {
      // Check for duplicate order using Redis
      const duplicate = await redis.set(redisKey, '1', 'EX', 300, 'NX');
      if (!duplicate) {
        await this.logAuditEvent({
          action: AuditAction.DUPLICATE_ORDER,
          entity: 'Order',
          entityId: payload.orderId,
          ip: clientIp,
          meta: { channel: channelName, orderId: payload.orderId }
        });
        logger.warn('Duplicate webhook received', { idempotencyKey, channel: channelName });
        return;
      }

      // Find sales channel and provider
      const channel = await prisma.salesChannel.findFirst({
        where: { name: channelName, isActive: true },
        include: { orders: false }
      });

      if (!channel) {
        throw new Error(`Sales channel ${channelName} not found or inactive`);
      }

      // Find product by SKU or external ID
      const product = await prisma.product.findFirst({
        where: { 
          sku: payload.productId,
          isActive: true 
        },
        include: { provider: true }
      });

      if (!product) {
        throw new Error(`Product ${payload.productId} not found or inactive`);
      }

      if (!product.provider.isActive) {
        throw new Error(`Provider ${product.provider.name} is inactive`);
      }

      // Calculate financials
      const marginAmount = product.sellingPrice.mul(product.marginPct).div(100);
      const purchasePrice = product.purchasePrice.mul(payload.quantity);
      const sellingPrice = product.sellingPrice.mul(payload.quantity);
      const commissionAmount = sellingPrice.mul(channel.commissionPct).div(100);
      const profit = sellingPrice.sub(purchasePrice).sub(commissionAmount);

      // Create order in database
      const order = await prisma.order.create({
        data: {
          idempotencyKey,
          channelId: channel.id,
          providerId: product.providerId,
          productId: product.id,
          customerName: payload.customerName,
          sellingPrice,
          purchasePrice,
          marginAmount,
          commissionPct: channel.commissionPct,
          commissionAmount,
          profit,
          status: OrderStatus.PENDING,
          orderedAt: new Date(payload.orderedAt)
        }
      });

      // Log code fetch attempt
      await this.logAuditEvent({
        action: AuditAction.CODE_FETCH,
        entity: 'Order',
        entityId: order.id,
        ip: clientIp,
        meta: { 
          channel: channelName, 
          orderId: payload.orderId,
          productId: payload.productId,
          quantity: payload.quantity
        }
      });

      // Add job to queue for fulfillment
      await this.queue.add('fulfill-order', {
        payload,
        channelName,
        clientIp,
        orderId: order.id
      }, {
        delay: 0,
        priority: 1
      });

      logger.info('Order queued for fulfillment', { 
        orderId: order.id, 
        idempotencyKey,
        channel: channelName 
      });

    } catch (error: any) {
      logger.error('Failed to process webhook order', { 
        error: error.message, 
        idempotencyKey,
        channel: channelName 
      });

      // Clean up Redis key on failure
      await redis.del(redisKey);

      throw error;
    }
  }

  private async processFulfillmentJob(job: Job<FulfillmentJobData>): Promise<void> {
    const { payload, channelName, clientIp, orderId } = job.data;

    try {
      // Get order from database
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { 
          product: { include: { provider: true } },
          channel: true
        }
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      if (order.status !== OrderStatus.PENDING) {
        logger.warn('Order already processed', { orderId, status: order.status });
        return;
      }

      // Call Turkpin API to create order
      const orderResult = await this.turkpinService.createOrder(
        order.product.externalId,
        order.product.externalId,
        1 // Always 1 for digital codes
      );

      if (orderResult.codes && orderResult.codes.length > 0) {
        // Success - encrypt the digital code
        const digitalCode = orderResult.codes[0];
        const encryptedCode = CryptoService.encrypt(digitalCode);

        // Update order with fulfillment data
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.FULFILLED,
            digitalCodeEnc: encryptedCode,
            providerOrderNo: orderResult.orderNo,
            fulfilledAt: new Date()
          }
        });

        // Log successful code fetch
        await this.logAuditEvent({
          action: AuditAction.CODE_FETCH,
          entity: 'Order',
          entityId: orderId,
          ip: clientIp,
          meta: { 
            success: true,
            providerOrderNo: orderResult.orderNo,
            channel: channelName
          }
        });

        logger.info('Order fulfilled successfully', { 
          orderId, 
          providerOrderNo: orderResult.orderNo 
        });

      } else {
        // Failed to get codes
        const errorCode = this.turkpinService.getErrorCode(new Error(orderResult.message || 'Unknown error'));
        
        await prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.FAILED }
        });

        // Handle specific error codes
        if (errorCode === TURKPIN_ERROR_CODES.INSUFFICIENT_STOCK) {
          // Deactivate product
          await prisma.product.update({
            where: { id: order.productId },
            data: { isActive: false }
          });

          await this.logAuditEvent({
            action: AuditAction.TOGGLE_CHANGE,
            entity: 'Product',
            entityId: order.productId,
            ip: clientIp,
            meta: { 
              isActive: false,
              reason: 'INSUFFICIENT_STOCK',
              provider: order.product.provider.name
            }
          });
        } else if (errorCode === TURKPIN_ERROR_CODES.INSUFFICIENT_BALANCE) {
          // Log critical error for admin attention
          await this.logAuditEvent({
            action: AuditAction.CODE_FETCH,
            entity: 'Order',
            entityId: orderId,
            ip: clientIp,
            meta: { 
              success: false,
              errorCode: TURKPIN_ERROR_CODES.INSUFFICIENT_BALANCE,
              message: 'CRITICAL: Insufficient balance in provider account',
              provider: order.product.provider.name
            }
          });
        }

        // Log failed code fetch
        await this.logAuditEvent({
          action: AuditAction.CODE_FETCH,
          entity: 'Order',
          entityId: orderId,
          ip: clientIp,
          meta: { 
            success: false,
            errorCode,
            message: orderResult.message,
            channel: channelName
          }
        });

        logger.error('Order fulfillment failed', { 
          orderId, 
          errorCode,
          message: orderResult.message 
        });

        // Don't retry on non-recoverable errors
        if (!this.turkpinService.isRecoverableError({ response: { data: { errorCode } } })) {
          throw new Error(`Non-recoverable error: ${orderResult.message}`);
        }
      }

    } catch (error: any) {
      logger.error('Job processing failed', { 
        orderId, 
        error: error.message,
        retryable: this.turkpinService.isRecoverableError(error)
      });

      // Update order status to failed
      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.FAILED }
      }).catch(() => {}); // Ignore if order doesn't exist

      throw error;
    }
  }

  private async logAuditEvent(data: {
    action: AuditAction;
    entity: string;
    entityId?: string;
    ip: string;
    meta: any;
  }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          meta: data.meta,
          ip: data.ip
        }
      });
    } catch (error: any) {
      logger.error('Failed to create audit log', { error: error.message, data });
    }
  }

  async getQueueStatus(): Promise<any> {
    const waiting = await this.queue.getWaiting();
    const active = await this.queue.getActive();
    const completed = await this.queue.getCompleted();
    const failed = await this.queue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.worker.close();
  }
}
