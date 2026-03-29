import axios, { AxiosInstance, AxiosResponse } from 'axios';
import pino from 'pino';
import { 
  TurkpinProduct, 
  TurkpinOrderRequest, 
  TurkpinOrderResponse,
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
  currency: string;
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
        'Content-Type': 'application/json',
        'User-Agent': 'Omega-Digital/1.0'
      }
    });

    // Request interceptor for authentication
    this.client.interceptors.request.use((config) => {
      config.auth = {
        username: this.config.username,
        password: this.config.password
      };
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
    requestFn: () => Promise<AxiosResponse<T>>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await requestFn();
        return response.data;
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error.response?.status && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429) {
          throw error;
        }

        // Don't retry on specific Turkpin error codes
        if (error.response?.data?.errorCode === TURKPIN_ERROR_CODES.INSUFFICIENT_STOCK ||
            error.response?.data?.errorCode === TURKPIN_ERROR_CODES.INSUFFICIENT_BALANCE) {
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

    throw lastError!;
  }

  async getEpinList(): Promise<EpinCategory[]> {
    return this.retryRequest(() => 
      this.client.get('/api/epin/list')
    );
  }

  async getProducts(epinId: string): Promise<TurkpinProduct[]> {
    return this.retryRequest(() => 
      this.client.get(`/api/epin/${epinId}/products`)
    );
  }

  async createOrder(epinId: string, productId: string, qty: number): Promise<OrderResult> {
    const payload: TurkpinOrderRequest = {
      epinId,
      productId,
      quantity: qty
    };

    return this.retryRequest(() => 
      this.client.post('/api/order/create', payload)
    );
  }

  async checkOrderStatus(orderNo: string): Promise<OrderResult> {
    return this.retryRequest(() => 
      this.client.get(`/api/order/${orderNo}/status`)
    );
  }

  async checkBalance(): Promise<Balance> {
    return this.retryRequest(() => 
      this.client.get('/api/balance')
    );
  }

  // Helper method to check if error is recoverable
  public isRecoverableError(error: any): boolean {
    if (!error.response?.data?.errorCode) {
      return true; // Network errors are recoverable
    }

    const errorCode = error.response.data.errorCode;
    return errorCode !== TURKPIN_ERROR_CODES.INSUFFICIENT_STOCK &&
           errorCode !== TURKPIN_ERROR_CODES.INSUFFICIENT_BALANCE;
  }

  // Helper method to get error message
  public getErrorMessage(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'Unknown error occurred';
  }

  // Helper method to get error code
  public getErrorCode(error: any): number | null {
    return error.response?.data?.errorCode || null;
  }
}
