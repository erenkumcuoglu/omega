import { z } from 'zod';

// Enums
export enum ProviderType {
  API = 'API',
  STOCK = 'STOCK'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  FULFILLED = 'FULFILLED',
  FAILED = 'FAILED',
  DUPLICATE = 'DUPLICATE'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  OPERATIONS = 'OPERATIONS',
  ACCOUNTING = 'ACCOUNTING',
  PRICING = 'PRICING'
}

export enum AuditAction {
  CODE_FETCH = 'CODE_FETCH',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PRICE_UPDATE = 'PRICE_UPDATE',
  MARGIN_UPDATE = 'MARGIN_UPDATE',
  TOGGLE_CHANGE = 'TOGGLE_CHANGE',
  WEBHOOK_BLOCKED = 'WEBHOOK_BLOCKED',
  DUPLICATE_ORDER = 'DUPLICATE_ORDER',
  RATE_LIMIT_HIT = 'RATE_LIMIT_HIT'
}

// Database Schemas
export const ProviderSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  type: z.nativeEnum(ProviderType),
  isActive: z.boolean().default(true),
  apiUsername: z.string().optional(),
  apiPasswordEnc: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const SalesChannelSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  webhookIps: z.array(z.string()),
  commissionPct: z.number().min(0).max(100),
  isActive: z.boolean().default(true),
  createdAt: z.date()
});

export const ProductSchema = z.object({
  id: z.string().cuid(),
  providerId: z.string(),
  externalId: z.string(),
  name: z.string(),
  sku: z.string(),
  purchasePrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  marginPct: z.number().min(0).max(100),
  stock: z.number().int().default(0),
  isActive: z.boolean().default(true),
  updatedAt: z.date(),
  createdAt: z.date()
});

export const OrderSchema = z.object({
  id: z.string().cuid(),
  idempotencyKey: z.string(),
  channelId: z.string(),
  providerId: z.string(),
  productId: z.string(),
  customerName: z.string().optional(),
  sellingPrice: z.number().min(0),
  purchasePrice: z.number().min(0),
  marginAmount: z.number().min(0),
  commissionPct: z.number().min(0).max(100),
  commissionAmount: z.number().min(0),
  profit: z.number(),
  status: z.nativeEnum(OrderStatus).default(OrderStatus.PENDING),
  digitalCodeEnc: z.string().optional(),
  providerOrderNo: z.string().optional(),
  orderedAt: z.date(),
  fulfilledAt: z.date().optional(),
  createdAt: z.date()
});

export const AuditLogSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().optional(),
  action: z.nativeEnum(AuditAction),
  entity: z.string(),
  entityId: z.string().optional(),
  meta: z.any(),
  ip: z.string(),
  createdAt: z.date()
});

export const UserSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  passwordHash: z.string(),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().default(true),
  lastLoginAt: z.date().optional(),
  createdAt: z.date()
});

// API Request/Response Schemas
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.string()
});

export const WebhookPayloadSchema = z.object({
  orderId: z.string(),
  channel: z.enum(['trendyol', 'hepsiburada', 'ozan']),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  productId: z.string(),
  quantity: z.number().int().min(1),
  sellingPrice: z.number().min(0),
  orderedAt: z.string().datetime()
});

// Turkpin API Schemas
export const TurkpinProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  stock: z.number(),
  category: z.string()
});

export const TurkpinOrderRequestSchema = z.object({
  epinId: z.string(),
  productId: z.string(),
  quantity: z.number().int().min(1)
});

export const TurkpinOrderResponseSchema = z.object({
  orderNo: z.string(),
  status: z.string(),
  codes: z.array(z.string()).optional(),
  message: z.string().optional()
});

// Dashboard Schemas
export const DashboardSummarySchema = z.object({
  totalOrders: z.number(),
  successfulOrders: z.number(),
  totalRevenue: z.number().min(0),
  totalProfit: z.number(),
  providerStats: z.array(z.object({
    providerId: z.string(),
    providerName: z.string(),
    orderCount: z.number(),
    revenue: z.number().min(0)
  })),
  channelStats: z.array(z.object({
    channelId: z.string(),
    channelName: z.string(),
    orderCount: z.number(),
    revenue: z.number().min(0),
    profit: z.number()
  }))
});

// Type exports
export type Provider = z.infer<typeof ProviderSchema>;
export type SalesChannel = z.infer<typeof SalesChannelSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
export type User = z.infer<typeof UserSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
export type TurkpinProduct = z.infer<typeof TurkpinProductSchema>;
export type TurkpinOrderRequest = z.infer<typeof TurkpinOrderRequestSchema>;
export type TurkpinOrderResponse = z.infer<typeof TurkpinOrderResponseSchema>;
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;
