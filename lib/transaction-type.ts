import { TransactionType } from "@prisma/client"

const TRANSACTION_TYPE_MAP: Record<string, TransactionType> = {
  SCRAP: TransactionType.SCRAP,
  SALE: TransactionType.SALE,
  MELT: TransactionType.MELT,
}

export function toPrismaTransactionType(type: string): TransactionType | null {
  return TRANSACTION_TYPE_MAP[type] ?? null
}

export type AppTransactionType = keyof typeof TRANSACTION_TYPE_MAP
