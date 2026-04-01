import { PrismaClient, Prisma } from '@prisma/client';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

declare global {
  var __prisma: PrismaClient | undefined;
}

const prisma = globalThis.__prisma || new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

(prisma as any).$on('query', (e: any) => {
  logger.debug('Query: ' + e.query);
  logger.debug('Params: ' + JSON.stringify(e.params));
  logger.debug('Duration: ' + e.duration + 'ms');
});

(prisma as any).$on('error', (e: any) => {
  logger.error('Database error:', e);
});

(prisma as any).$on('info', (e: any) => {
  logger.info('Database info:', e);
});

(prisma as any).$on('warn', (e: any) => {
  logger.warn('Database warning:', e);
});

export { prisma };
