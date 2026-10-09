import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({ log: ['error'] });

// ✅ Works in both dev AND production (Vercel serverless reuses the warm instance)
globalForPrisma.prisma = prisma;
