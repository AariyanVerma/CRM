import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'], // Removed 'query' to reduce log spam
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

