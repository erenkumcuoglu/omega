import { PrismaClient } from '@prisma/client';
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

prisma.$on('query', (e) => {
  logger.debug('Query: ' + e.query);
  logger.debug('Params: ' + e.params);
  logger.debug('Duration: ' + e.duration + 'ms');
});

prisma.$on('error', (e) => {
  logger.error('Database error:', e);
});

prisma.$on('info', (e) => {
  logger.info('Database info:', e);
});

prisma.$on('warn', (e) => {
  logger.warn('Database warning:', e);
});

export { prisma };
