import axios, { AxiosInstance } from 'axios';

interface OzonConfig {
  clientId: string;
  apiKey: string;
  apiUrl: string;
  timeoutMs: number;
}

interface OzonProductsQuery {
  limit?: number;
  lastId?: string;
}

interface OzonPostingsQuery {
  limit?: number;
  offset?: number;
  since?: string;
  to?: string;
  status?: string;
}

export class OzonService {
  private static instance: OzonService;
  private readonly client: AxiosInstance;
  private readonly config: OzonConfig;

  private constructor() {
    this.config = {
      clientId: process.env.OZON_CLIENT_ID || '',
      apiKey: process.env.OZON_API_KEY || '',
      apiUrl: process.env.OZON_API_URL || 'https://api-seller.ozon.ru',
      timeoutMs: Number.parseInt(process.env.OZON_TIMEOUT_MS || '15000', 10)
    };

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      validateStatus: () => true
    });
  }

  public static getInstance(): OzonService {
    if (!OzonService.instance) {
      OzonService.instance = new OzonService();
    }
    return OzonService.instance;
  }

  public isConfigured(): boolean {
    return Boolean(this.config.clientId && this.config.apiKey);
  }

  public getMissingConfigKeys(): string[] {
    const missing: string[] = [];
    if (!this.config.clientId) missing.push('OZON_CLIENT_ID');
    if (!this.config.apiKey) missing.push('OZON_API_KEY');
    return missing;
  }

  public async healthCheck(): Promise<{ ok: boolean; status: number; message: string; code?: string }> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        status: 500,
        code: 'OZON_NOT_CONFIGURED',
        message: `Missing Ozon config: ${this.getMissingConfigKeys().join(', ')}`
      };
    }

    const response = await this.getProducts({ limit: 1 });

    if (response.status === 401) {
      return {
        ok: false,
        status: 401,
        code: 'OZON_UNAUTHORIZED',
        message: 'Ozon API credentials rejected (401).'
      };
    }

    if (response.status === 403) {
      return {
        ok: false,
        status: 403,
        code: 'OZON_FORBIDDEN',
        message: 'Ozon API forbidden (403).'
      };
    }

    return {
      ok: response.status < 400,
      status: response.status,
      message: response.status < 400 ? 'Ozon reachable and authorized' : 'Ozon returned non-success status'
    };
  }

  public async getProducts(query: OzonProductsQuery = {}): Promise<{ status: number; data: unknown }> {
    this.ensureConfigured();

    const response = await this.client.post(
      '/v3/product/list',
      {
        filter: {},
        last_id: query.lastId || '',
        limit: query.limit ?? 50
      },
      {
        headers: this.getAuthHeaders()
      }
    );

    return {
      status: response.status,
      data: response.data
    };
  }

  public async getPostings(query: OzonPostingsQuery = {}): Promise<{ status: number; data: unknown }> {
    this.ensureConfigured();

    const to = query.to || new Date().toISOString();
    const since =
      query.since ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const response = await this.client.post(
      '/v3/posting/fbs/list',
      {
        dir: 'DESC',
        filter: {
          since,
          to,
          status: query.status
        },
        limit: query.limit ?? 50,
        offset: query.offset ?? 0
      },
      {
        headers: this.getAuthHeaders()
      }
    );

    return {
      status: response.status,
      data: response.data
    };
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Client-Id': this.config.clientId,
      'Api-Key': this.config.apiKey
    };
  }

  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error(`Ozon configuration missing: ${this.getMissingConfigKeys().join(', ')}`);
    }
  }
}
