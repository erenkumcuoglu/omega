import axios, { AxiosInstance, Method } from 'axios';

interface HepsiburadaConfig {
  merchantId: string;
  serviceKey: string;
  apiUrl: string;
  listingsBaseUrl: string;
  ordersBaseUrl: string;
  timeoutMs: number;
  userAgent: string;
  listingsPath: string;
  ordersPath: string;
}

interface MarketplaceQuery {
  page?: number;
  size?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

interface RecipeRequestInput {
  method: Method;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export class HepsiburadaService {
  private static instance: HepsiburadaService;
  private readonly client: AxiosInstance;
  private readonly listingsClient: AxiosInstance;
  private readonly ordersClient: AxiosInstance;
  private readonly config: HepsiburadaConfig;

  private constructor() {
    this.config = {
      merchantId: process.env.HEPSIBURADA_MERCHANT_ID || '',
      serviceKey: process.env.HEPSIBURADA_SERVICE_KEY || '',
      apiUrl: process.env.HEPSIBURADA_API_URL || 'https://mpop.hepsiburada.com',
      listingsBaseUrl:
        process.env.HEPSIBURADA_LISTINGS_BASE_URL ||
        process.env.HEPSIBURADA_API_URL ||
        'https://listing-external.hepsiburada.com',
      ordersBaseUrl:
        process.env.HEPSIBURADA_ORDERS_BASE_URL ||
        process.env.HEPSIBURADA_API_URL ||
        'https://oms-external.hepsiburada.com',
      timeoutMs: Number.parseInt(process.env.HEPSIBURADA_TIMEOUT_MS || '15000', 10),
      userAgent: process.env.HEPSIBURADA_USER_AGENT || 'OmegaIntegration/1.0',
      listingsPath:
        process.env.HEPSIBURADA_LISTINGS_PATH ||
        '/listings/merchantid/{merchantId}',
      ordersPath:
        process.env.HEPSIBURADA_ORDERS_PATH ||
        '/orders/merchantid/{merchantId}'
    };

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeoutMs,
      headers: {
        Accept: 'application/json',
        'User-Agent': this.config.userAgent
      },
      validateStatus: () => true
    });

    this.listingsClient = axios.create({
      baseURL: this.config.listingsBaseUrl,
      timeout: this.config.timeoutMs,
      headers: {
        Accept: 'application/json',
        'User-Agent': this.config.userAgent
      },
      validateStatus: () => true
    });

    this.ordersClient = axios.create({
      baseURL: this.config.ordersBaseUrl,
      timeout: this.config.timeoutMs,
      headers: {
        Accept: 'application/json',
        'User-Agent': this.config.userAgent
      },
      validateStatus: () => true
    });
  }

  public static getInstance(): HepsiburadaService {
    if (!HepsiburadaService.instance) {
      HepsiburadaService.instance = new HepsiburadaService();
    }
    return HepsiburadaService.instance;
  }

  public isConfigured(): boolean {
    return Boolean(this.config.merchantId && this.config.serviceKey);
  }

  public getMissingConfigKeys(): string[] {
    const missing: string[] = [];
    if (!this.config.merchantId) missing.push('HEPSIBURADA_MERCHANT_ID');
    if (!this.config.serviceKey) missing.push('HEPSIBURADA_SERVICE_KEY');
    return missing;
  }

  public async healthCheck(): Promise<{ ok: boolean; status: number; message: string; code?: string }> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        status: 500,
        code: 'HEPSIBURADA_NOT_CONFIGURED',
        message: `Missing Hepsiburada config: ${this.getMissingConfigKeys().join(', ')}`
      };
    }

    const response = await this.getProducts({ page: 0, size: 1 });
    if (response.status === 401) {
      return {
        ok: false,
        status: 401,
        code: 'HEPSIBURADA_UNAUTHORIZED',
        message: 'Hepsiburada API credentials rejected (401).'
      };
    }

    if (response.status === 403) {
      return {
        ok: false,
        status: 403,
        code: 'HEPSIBURADA_FORBIDDEN',
        message: 'Hepsiburada API forbidden (403).'
      };
    }

    return {
      ok: response.status < 400,
      status: response.status,
      message: response.status < 400 ? 'Hepsiburada reachable and authorized' : 'Hepsiburada returned non-success status'
    };
  }

  public async getProducts(query: MarketplaceQuery = {}): Promise<{ status: number; data: any }> {
    this.ensureConfigured();
    const path = this.resolvePath(this.config.listingsPath);
    const response = await this.listingsClient.get(path, {
      params: {
        offset: this.getOffset(query.page, query.size),
        limit: query.size ?? 50,
        ...(query.status ? { status: query.status } : {}),
        ...(query.startDate ? { startDate: query.startDate } : {}),
        ...(query.endDate ? { endDate: query.endDate } : {})
      },
      headers: this.getAuthHeaders()
    });

    return { status: response.status, data: response.data };
  }

  public async getOrders(query: MarketplaceQuery = {}): Promise<{ status: number; data: any }> {
    this.ensureConfigured();
    const path = this.resolvePath(this.config.ordersPath);
    const response = await this.ordersClient.get(path, {
      params: {
        offset: this.getOffset(query.page, query.size),
        limit: query.size ?? 50,
        ...(query.status ? { status: query.status } : {}),
        ...(query.startDate ? { startDate: query.startDate } : {}),
        ...(query.endDate ? { endDate: query.endDate } : {})
      },
      headers: this.getAuthHeaders()
    });

    return { status: response.status, data: response.data };
  }

  public async requestRecipe(input: RecipeRequestInput): Promise<{ status: number; data: any }> {
    this.ensureConfigured();
    const sanitizedPath = input.path.startsWith('/') ? input.path : `/${input.path}`;
    const response = await this.client.request({
      method: input.method,
      url: this.resolvePath(sanitizedPath),
      params: input.query,
      data: input.body,
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json'
      }
    });

    return { status: response.status, data: response.data };
  }

  private getAuthHeaders(): Record<string, string> {
    const basic = Buffer.from(`${this.config.merchantId}:${this.config.serviceKey}`).toString('base64');
    return {
      Authorization: `Basic ${basic}`
    };
  }

  private resolvePath(path: string): string {
    return path.replace('{merchantId}', this.config.merchantId);
  }

  private getOffset(page?: number, size?: number): number {
    return (page ?? 0) * (size ?? 50);
  }

  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error(`Hepsiburada configuration missing: ${this.getMissingConfigKeys().join(', ')}`);
    }
  }
}