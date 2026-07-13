export type PurityPrice = {
  purity: string
  dwt: number
  gram: number
}

export type DailyPricesPayload = {
  date: string
  updatedAt: number
  spots: {
    gold: number
    silver: number
    platinum: number
  }
  onStone: PurityPrice[]
  silver: PurityPrice[]
}

export function formatMoney(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatBoardDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number)
  if (!y || !m || !d) return ymd
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}
