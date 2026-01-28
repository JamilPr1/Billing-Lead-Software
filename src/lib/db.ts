import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Support both PRISMA_DATABASE_URL (Prisma Accelerate) and DATABASE_URL (standard)
// Priority: PRISMA_DATABASE_URL (for Accelerate) > DATABASE_URL (standard)
const databaseUrl = process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'Database URL not found. Please set either PRISMA_DATABASE_URL (for Prisma Accelerate) ' +
    'or DATABASE_URL environment variable in Vercel (Settings → Environment Variables).'
  );
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
