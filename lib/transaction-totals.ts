export const BUSINESS_TIMEZONE = "America/New_York"

export type TransactionTypeTotals = {
  scrap: number
  sale: number
  melt: number
  total: number
  count: number
}

export type DailyTransactionTotals = TransactionTypeTotals & {
  date: string
}

type TransactionForTotals = {
  type: string
  createdAt: Date | string
  lineItems: Array<{ lineTotal: number }>
}

export function getTransactionDateKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

export function formatTransactionDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

export function getTransactionTotal(transaction: Pick<TransactionForTotals, "lineItems">): number {
  return transaction.lineItems.reduce((sum, item) => sum + item.lineTotal, 0)
}

export function emptyTypeTotals(): TransactionTypeTotals {
  return { scrap: 0, sale: 0, melt: 0, total: 0, count: 0 }
}

export function accumulateTransactionTotals(
  totals: TransactionTypeTotals,
  transaction: Pick<TransactionForTotals, "type" | "lineItems">
): TransactionTypeTotals {
  const amount = getTransactionTotal(transaction)
  const next = { ...totals, total: totals.total + amount, count: totals.count + 1 }
  if (transaction.type === "SCRAP") next.scrap += amount
  else if (transaction.type === "SALE") next.sale += amount
  else if (transaction.type === "MELT") next.melt += amount
  return next
}

export function summarizeTransactions(transactions: TransactionForTotals[]): TransactionTypeTotals {
  return transactions.reduce(accumulateTransactionTotals, emptyTypeTotals())
}

export function summarizeTransactionsByDay(transactions: TransactionForTotals[]): DailyTransactionTotals[] {
  const byDay = new Map<string, TransactionTypeTotals>()

  for (const transaction of transactions) {
    const date = getTransactionDateKey(transaction.createdAt)
    const current = byDay.get(date) ?? emptyTypeTotals()
    byDay.set(date, accumulateTransactionTotals(current, transaction))
  }

  return Array.from(byDay.entries())
    .map(([date, totals]) => ({ date, ...totals }))
    .sort((a, b) => b.date.localeCompare(a.date))
}
