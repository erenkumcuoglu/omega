import axios, { AxiosInstance } from 'axios';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

interface TrendyolConfig {
  username: string;
  password: string;
  sellerId: string;
  integrationRef: string;
  apiUrl: string;
  timeoutMs: number;
}

interface ShipmentPackageQuery {
  page?: number;
  size?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  orderByField?: string;
  orderByDirection?: string;
}

export class TrendyolService {
  private static instance: TrendyolService;
  private readonly client: AxiosInstance;
  private readonly config: TrendyolConfig;

  private constructor() {
    this.config = {
      username: process.env.TRENDYOL_USERNAME || '',
      password: process.env.TRENDYOL_PASSWORD || '',
      sellerId: process.env.TRENDYOL_SELLER_ID || '',
      integrationRef: process.env.TRENDYOL_INTEGRATION_REF || '',
      apiUrl: process.env.TRENDYOL_API_URL || 'https://apigw.trendyol.com',
      timeoutMs: Number.parseInt(process.env.TRENDYOL_TIMEOUT_MS || '15000', 10)
    };

    // Trendyol requires User-Agent format: "{sellerId} - {integrationRefCode}"
    const userAgent = this.config.integrationRef
      ? `${this.config.sellerId} - ${this.config.integrationRef}`
      : `${this.config.sellerId} - Omega`;

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        Accept: 'application/json'
      },
      validateStatus: () => true
    });
  }

  public static getInstance(): TrendyolService {
    if (!TrendyolService.instance) {
      TrendyolService.instance = new TrendyolService();
    }
    return TrendyolService.instance;
  }

  public isConfigured(): boolean {
    return Boolean(this.config.username && this.config.password && this.config.sellerId);
  }

  public getMissingConfigKeys(): string[] {
    const missing: string[] = [];
    if (!this.config.username) missing.push('TRENDYOL_USERNAME');
    if (!this.config.password) missing.push('TRENDYOL_PASSWORD');
    if (!this.config.sellerId) missing.push('TRENDYOL_SELLER_ID');
    return missing;
  }

  public async healthCheck(): Promise<{ ok: boolean; status: number; message: string; code?: string }> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        status: 500,
        code: 'TRENDYOL_NOT_CONFIGURED',
        message: `Missing Trendyol config: ${this.getMissingConfigKeys().join(', ')}`
      };
    }

    const response = await this.getOrders({ page: 0, size: 1 });

    if (response.status === 401) {
      return {
        ok: false,
        status: 401,
        code: 'TRENDYOL_UNAUTHORIZED',
        message: 'Trendyol API credentials rejected (401). Ensure the seller account has API access enabled in the Trendyol Partner portal.'
      };
    }

    if (response.status === 403) {
      return {
        ok: false,
        status: 403,
        code: 'TRENDYOL_FORBIDDEN',
        message: 'Trendyol API forbidden (403). The seller account may not have integration permissions.'
      };
    }

    return {
      ok: response.status < 400,
      status: response.status,
      message: response.status < 400 ? 'Trendyol reachable and authorized' : 'Trendyol returned non-success status'
    };
  }

  /**
   * Get orders — the correct endpoint for digital product sellers.
   * Physical shipment packages (/shipment-packages) is not available for digital-only accounts.
   */
  public async getOrders(query: ShipmentPackageQuery = {}): Promise<{ status: number; data: any }> {
    this.ensureConfigured();

    const response = await this.client.get(
      `/integration/order/sellers/${this.config.sellerId}/orders`,
      {
        params: {
          page: query.page ?? 0,
          size: query.size ?? 50,
          ...(query.status ? { status: query.status } : {}),
          ...(query.startDate ? { startDate: query.startDate } : {}),
          ...(query.endDate ? { endDate: query.endDate } : {}),
          ...(query.orderByField ? { orderByField: query.orderByField } : {}),
          ...(query.orderByDirection ? { orderByDirection: query.orderByDirection } : {})
        },
        headers: this.getAuthHeaders()
      }
    );

    return {
      status: response.status,
      data: response.data
    };
  }

  /**
   * Get products listed on Trendyol marketplace.
   */
  public async getProducts(query: { page?: number; size?: number } = {}): Promise<{ status: number; data: any }> {
    this.ensureConfigured();

    const response = await this.client.get(
      `/integration/product/sellers/${this.config.sellerId}/products`,
      {
        params: {
          page: query.page ?? 0,
          size: query.size ?? 50
        },
        headers: this.getAuthHeaders()
      }
    );

    return {
      status: response.status,
      data: response.data
    };
  }

  public async getShipmentPackages(query: ShipmentPackageQuery = {}): Promise<{ status: number; data: any }> {
    this.ensureConfigured();

    const response = await this.client.get(
      `/integration/order/sellers/${this.config.sellerId}/shipment-packages`,
      {
        params: {
          page: query.page ?? 0,
          size: query.size ?? 50,
          ...(query.status ? { status: query.status } : {}),
          ...(query.startDate ? { startDate: query.startDate } : {}),
          ...(query.endDate ? { endDate: query.endDate } : {})
        },
        headers: this.getAuthHeaders()
      }
    );

    return {
      status: response.status,
      data: response.data
    };
  }
  public async processAlternativeDeliveryDigital(input: {
    packageId: string;
    phoneNumber: string;
    params: Record<string, string>;
  }): Promise<{ status: number; data: any }> {
    this.ensureConfigured();

    const response = await this.client.put(
      `/integration/order/sellers/${this.config.sellerId}/shipment-packages/${input.packageId}/alternative-delivery`,
      {
        isPhoneNumber: true,
        trackingInfo: input.phoneNumber,
        params: input.params
      },
      {
        headers: this.getAuthHeaders()
      }
    );

    if (response.status >= 400) {
      logger.error('Trendyol digital delivery failed', {
        status: response.status,
        packageId: input.packageId
      });
    }

    return {
      status: response.status,
      data: response.data
    };
  }

  private getAuthHeaders(): Record<string, string> {
    const basic = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
    return {
      Authorization: `Basic ${basic}`
    };
  }

  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error(`Trendyol configuration missing: ${this.getMissingConfigKeys().join(', ')}`);
    }
  }
}
