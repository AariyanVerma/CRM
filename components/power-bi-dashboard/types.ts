export type ReportTransaction = {
  id: string
  type: string
  status: string
  createdAt: string
  customer: { fullName: string; isBusiness?: boolean; businessName?: string | null }
  total: number
  lineItems: Array<{ metalType: string; lineTotal: number }>
}

export type ReportData = {
  from: string
  to: string
  period: string
  summary: {
    transactionCount: number
    grandTotal: number
    byType: { SCRAP: { count: number; total: number }; MELT: { count: number; total: number } }
    byMetal: { GOLD: number; SILVER: number; PLATINUM: number }
  }
  transactions: ReportTransaction[]
}

export type FilterState = {
  typeFilter: "ALL" | "SCRAP" | "MELT"
  statusFilter: "ALL" | "OPEN" | "PRINTED" | "VOID"
}

export type DailyByType = { date: string; scrapTotal: number; scrapCount: number; meltTotal: number; meltCount: number }
export type DailyByMetal = { date: string; gold: number; silver: number; platinum: number }
export type DailyByStatus = { date: string; OPEN: number; PRINTED: number; VOID: number }
export type DayOfWeekKey = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat"

export type DerivedData = {
  byStatus: Record<string, { count: number; total: number }>
  topCustomers: { name: string; total: number }[]
  topCustomersByCount: { name: string; count: number }[]
  dailySorted: [string, { count: number; total: number }][]
  dailyByType: DailyByType[]
  dailyByMetal: DailyByMetal[]
  dailyByStatus: DailyByStatus[]
  byDayOfWeek: Record<DayOfWeekKey, number>
  sizeBuckets: { bucket: string; count: number; total: number }[]
  cumulativeDaily: { date: string; cumulative: number }[]
  avgByDay: { date: string; avg: number }[]
  avgTx: number
  maxTotal: number
  typeStatusMatrix: { type: string; status: string; count: number; total: number }[]
}
