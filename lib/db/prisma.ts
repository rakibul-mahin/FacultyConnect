import { PrismaClient } from '@prisma/client';

// Singleton pattern required for serverless/Netlify: reuse one Prisma
// Client (and its connection pool) per warm lambda instance instead of
// opening a new pool on every invocation. See ARCHITECTURE.md §11.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
