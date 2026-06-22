import { PrismaClient, TransactionType } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaSchemaVersion?: string
}

const PRISMA_SCHEMA_VERSION = Object.values(TransactionType).sort().join(",")

function createPrismaClient() {
  return new PrismaClient({
    log: ["error", "warn"],
  })
}

function getPrismaClient(): PrismaClient {
  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION
  ) {
    return globalForPrisma.prisma
  }

  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect().catch(() => {})
  }

  const client = createPrismaClient()
  globalForPrisma.prisma = client
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION
  return client
}

export const prisma = getPrismaClient()
