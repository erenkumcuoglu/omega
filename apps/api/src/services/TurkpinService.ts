import axios, { AxiosInstance } from 'axios';
import pino from 'pino';
import { 
  TurkpinProduct, 
  TurkpinOrderRequest, 
  TURKPIN_ERROR_CODES 
} from '@omega/shared';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

interface TurkpinConfig {
  username: string;
  password: string;
  apiUrl: string;
}

interface EpinCategory {
  epinId: string;
  name: string;
  products: TurkpinProduct[];
}

interface OrderResult {
  orderNo: string;
  status: string;
  codes?: string[];
  message?: string;
}

interface Balance {
  balance: number;
  credit?: number;
  bonus?: number;
  spending?: number;
  currency: string;
}

interface TurkpinError extends Error {
  httpStatus?: number;
  turkpinCode?: number | null;
  responseBody?: string;
  clientIp?: string;
}

export class TurkpinService {
  private static instance: TurkpinService;
  private client: AxiosInstance;
  private config: TurkpinConfig;

  private constructor() {
    this.config = {
      username: process.env.TURKPIN_USERNAME!,
      password: process.env.TURKPIN_PASSWORD!,
      apiUrl: process.env.TURKPIN_API_URL!
    };

    if (!this.config.username || !this.config.password || !this.config.apiUrl) {
      throw new Error('Turkpin configuration is missing');
    }

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      timeout: 10000,
      headers: {
        'Accept': 'application/xml, text/xml, */*',
        'User-Agent': 'Omega-Digital/1.0'
      }
    });

    this.client.interceptors.request.use((config) => {
      logger.debug('Turkpin API request:', { method: config.method, url: config.url });
      return config;
    });

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Turkpin API response:', { 
          status: response.status, 
          url: response.config.url 
        });
        return response;
      },
      (error) => {
        logger.error('Turkpin API error:', { 
          status: error.response?.status, 
          url: error.config?.url,
          message: error.message 
        });
        return Promise.reject(error);
      }
    );
  }

  public static getInstance(): TurkpinService {
    if (!TurkpinService.instance) {
      TurkpinService.instance = new TurkpinService();
    }
    return TurkpinService.instance;
  }

  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        lastError = error;

        const httpStatus = error?.httpStatus ?? error?.response?.status;
        const turkpinCode = error?.turkpinCode ?? error?.response?.data?.errorCode;

        if (httpStatus && httpStatus >= 400 && httpStatus < 500 && httpStatus !== 429) {
          throw error;
        }

        if (turkpinCode === TURKPIN_ERROR_CODES.INSUFFICIENT_STOCK ||
            turkpinCode === TURKPIN_ERROR_CODES.INSUFFICIENT_BALANCE ||
            turkpinCode === 2 ||
            turkpinCode === 6 ||
            turkpinCode === 7) {
          throw error;
        }

        if (attempt === maxRetries) {
          throw error;
        }

        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff: 1s, 2s, 4s
        logger.warn(`Turkpin API request failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`, {
          error: error.message,
          delay
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError ?? new Error('Turkpin request failed');
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private buildXmlRequest(command: string, params: Record<string, string | number | boolean | undefined> = {}): string {
    const fields = [
      ['cmd', command],
      ['username', this.config.username],
      ['password', this.config.password],
      ...Object.entries(params).filter(([, value]) => value !== undefined)
    ];

    const body = fields
      .map(([key, value]) => `    <${key}>${this.escapeXml(String(value))}</${key}>`)
      .join('\n');

    return `<?xml version="1.0" encoding="utf-8" ?>\n<APIRequest>\n  <params>\n${body}\n  </params>\n</APIRequest>`;
  }

  private extractTag(body: string, tag: string): string | undefined {
    const match = body.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
    return match?.[1]?.trim();
  }

  private extractBlocks(body: string, tag: string): string[] {
    return [...body.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'gi'))].map((match) => match[1]);
  }

  private toNumber(value: string | undefined, fallback: number = 0): number {
    const parsed = Number.parseFloat(String(value ?? fallback));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private createTurkpinError(message: string, options: {
    httpStatus?: number;
    turkpinCode?: number | null;
    responseBody?: string;
    clientIp?: string;
  } = {}): TurkpinError {
    const error = new Error(message) as TurkpinError;
    error.httpStatus = options.httpStatus;
    error.turkpinCode = options.turkpinCode ?? null;
    error.responseBody = options.responseBody;
    error.clientIp = options.clientIp;
    return error;
  }

  private parseApiResponse(body: string, httpStatus: number): string {
    const turkpinCode = this.toNumber(
      this.extractTag(body, 'HATA_NO') ?? this.extractTag(body, 'error'),
      Number.NaN
    );
    const clientIp = this.extractTag(body, 'istemci');
    const turkpinMessage =
      this.extractTag(body, 'HATA_ACIKLAMA') ??
      this.extractTag(body, 'error_desc') ??
      (httpStatus >= 400 ? `Turkpin request failed with status ${httpStatus}` : undefined);

    if (httpStatus >= 400 || (Number.isFinite(turkpinCode) && turkpinCode !== 0)) {
      throw this.createTurkpinError(turkpinMessage ?? 'Turkpin request failed', {
        httpStatus,
        turkpinCode: Number.isFinite(turkpinCode) ? turkpinCode : null,
        responseBody: body,
        clientIp
      });
    }

    return body;
  }

  private async sendCommand(
    command: string,
    params: Record<string, string | number | boolean | undefined> = {}
  ): Promise<string> {
    return this.retryRequest(async () => {
      const xml = this.buildXmlRequest(command, params);
      const payload = new URLSearchParams();
      payload.append('DATA', xml);

      const response = await this.client.post<string>('', payload.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        validateStatus: () => true
      });

      const body = String(response.data ?? '');
      return this.parseApiResponse(body, response.status);
    });
  }

  async getEpinList(): Promise<EpinCategory[]> {
    const body = await this.sendCommand('epinOyunListesi');
    const games = this.extractBlocks(body, 'oyun').map((gameBlock) => ({
      epinId: this.extractTag(gameBlock, 'id') ?? '',
      name: this.extractTag(gameBlock, 'name') ?? ''
    }));

    return games
      .filter((game) => game.epinId && game.name)
      .map((game) => ({
        epinId: game.epinId,
        name: game.name,
        products: []
      }));
  }

  async getProducts(epinId: string): Promise<TurkpinProduct[]> {
    const body = await this.sendCommand('epinUrunleri', { oyunKodu: epinId });

    return this.extractBlocks(body, 'urun')
      .map((productBlock) => ({
        id: this.extractTag(productBlock, 'id') ?? '',
        name: this.extractTag(productBlock, 'name') ?? '',
        price: this.toNumber(this.extractTag(productBlock, 'price')),
        stock: Math.trunc(this.toNumber(this.extractTag(productBlock, 'stock'))),
        category: epinId,
        minOrder: Math.trunc(this.toNumber(this.extractTag(productBlock, 'min_order'), 1)),
        maxOrder: Math.trunc(this.toNumber(this.extractTag(productBlock, 'max_order'))),
        taxType: this.extractTag(productBlock, 'tax_type')
      }))
      .filter((product) => product.id && product.name);
  }

  async createOrder(epinId: string, productId: string, qty: number): Promise<OrderResult> {
    const payload: TurkpinOrderRequest = {
      epinId,
      productId,
      quantity: qty
    };

    const body = await this.sendCommand('epinSiparisYarat', {
      oyunKodu: payload.epinId,
      urunKodu: payload.productId,
      adet: payload.quantity
    });

    const codes = this.extractBlocks(body, 'epin')
      .map((epinBlock) => this.extractTag(epinBlock, 'code'))
      .filter((code): code is string => Boolean(code));

    return {
      orderNo: this.extractTag(body, 'siparisNo') ?? '',
      status: this.extractTag(body, 'siparisSonuc') ?? 'UNKNOWN',
      codes,
      message: this.extractTag(body, 'HATA_ACIKLAMA') ?? this.extractTag(body, 'error_desc')
    };
  }

  async checkOrderStatus(orderNo: string): Promise<OrderResult> {
    const body = await this.sendCommand('siparisDurumu', { siparisNo: orderNo });

    return {
      orderNo: this.extractTag(body, 'siparisNo') ?? orderNo,
      status: this.extractTag(body, 'siparisDurumu') ?? this.extractTag(body, 'durum') ?? 'UNKNOWN',
      message: this.extractTag(body, 'HATA_ACIKLAMA') ?? this.extractTag(body, 'error_desc')
    };
  }

  async checkBalance(): Promise<Balance> {
    const body = await this.sendCommand('balance');

    return {
      balance: this.toNumber(this.extractTag(body, 'balance')),
      credit: this.toNumber(this.extractTag(body, 'credit')),
      bonus: this.toNumber(this.extractTag(body, 'bonus')),
      spending: this.toNumber(this.extractTag(body, 'spending')),
      currency: 'TRY'
    };
  }

  // Helper method to check if error is recoverable
  public isRecoverableError(error: any): boolean {
    const errorCode = this.getErrorCode(error);
    if (!errorCode) {
      return true; // Network errors are recoverable
    }

    return errorCode !== TURKPIN_ERROR_CODES.INSUFFICIENT_STOCK &&
           errorCode !== TURKPIN_ERROR_CODES.INSUFFICIENT_BALANCE &&
           errorCode !== 2 &&
           errorCode !== 6 &&
           errorCode !== 7;
  }

  // Helper method to get error message
  public getErrorMessage(error: any): string {
    if (error?.message) {
      return error.message;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    return 'Unknown error occurred';
  }

  // Helper method to get error code
  public getErrorCode(error: any): number | null {
    const rawCode = error?.turkpinCode ?? error?.code ?? error?.response?.data?.errorCode;
    const parsed = Number.parseInt(String(rawCode), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
