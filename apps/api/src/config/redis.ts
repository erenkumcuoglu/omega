import Redis from 'ioredis';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const redisOptions: any = {
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  showFriendlyErrorStack: process.env.NODE_ENV === 'development',
};

if (process.env.REDIS_URL) {
  Object.assign(redisOptions, { url: process.env.REDIS_URL });
} else {
  Object.assign(redisOptions, {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  });
}

const redis = new Redis(redisOptions);

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

redis.on('reconnecting', () => {
  logger.info('Redis reconnecting');
});

export { redis };
