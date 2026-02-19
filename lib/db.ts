import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'], // Removed 'query' to reduce log spam
  })

// Always cache Prisma client on globalThis to prevent multiple instances (works in both dev and production)
globalForPrisma.prisma = prisma

