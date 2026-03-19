import type { ReportData, ReportTransaction, FilterState, DerivedData, DayOfWeekKey } from "./types"
import { getCustomerDisplayName } from "@/lib/utils"

const DAY_NAMES: DayOfWeekKey[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

export function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { dateStyle: "short" })
}

export function filterTransactions(
  transactions: ReportTransaction[],
  filters: FilterState
): ReportTransaction[] {
  return transactions.filter((t) => {
    if (filters.typeFilter !== "ALL" && t.type !== filters.typeFilter) return false
    if (filters.statusFilter !== "ALL") {
      if (filters.statusFilter === "OPEN") {
        
        if (t.status !== "OPEN" && t.status !== "APPROVED") return false
      } else if (t.status !== filters.statusFilter) {
        return false
      }
    }
    return true
  })
}

export function computeSummaryFromTransactions(
  transactions: ReportTransaction[]
): {
  transactionCount: number
  grandTotal: number
  byType: { SCRAP: { count: number; total: number }; MELT: { count: number; total: number } }
  byMetal: { GOLD: number; SILVER: number; PLATINUM: number }
} {
  const byType = { SCRAP: { count: 0, total: 0 }, MELT: { count: 0, total: 0 } }
  const byMetal = { GOLD: 0, SILVER: 0, PLATINUM: 0 }
  let grandTotal = 0
  for (const t of transactions) {
    byType[t.type as "SCRAP" | "MELT"].count += 1
    byType[t.type as "SCRAP" | "MELT"].total += t.total
    grandTotal += t.total
    for (const item of t.lineItems) {
      byMetal[item.metalType as keyof typeof byMetal] =
        (byMetal[item.metalType as keyof typeof byMetal] || 0) + item.lineTotal
    }
  }
  return {
    transactionCount: transactions.length,
    grandTotal,
    byType,
    byMetal,
  }
}

export function computeDerived(transactions: ReportTransaction[]): DerivedData {
  const byStatus: Record<string, { count: number; total: number }> = {}
  const byCustomer: Record<string, { total: number; count: number }> = {}
  const byDate: Record<string, { count: number; total: number }> = {}
  const byDateType: Record<string, { SCRAP: { count: number; total: number }; MELT: { count: number; total: number } }> = {}
  const byDateMetal: Record<string, { GOLD: number; SILVER: number; PLATINUM: number }> = {}
  const byDateStatus: Record<string, { OPEN: number; PRINTED: number; VOID: number }> = {}
  const byDayOfWeek: Record<DayOfWeekKey, number> = DAY_NAMES.reduce((acc, d) => ({ ...acc, [d]: 0 }), {} as Record<DayOfWeekKey, number>)
  const sizeBuckets = [
    { bucket: "0–1k", min: 0, max: 1000, count: 0, total: 0 },
    { bucket: "1k–5k", min: 1000, max: 5000, count: 0, total: 0 },
    { bucket: "5k–10k", min: 5000, max: 10000, count: 0, total: 0 },
    { bucket: "10k+", min: 10000, max: Infinity, count: 0, total: 0 },
  ]
  let maxTotal = 0
  const typeStatusMatrix: { type: string; status: string; count: number; total: number }[] = []
  const typeStatusKey: Record<string, { count: number; total: number }> = {}

  for (const t of transactions) {
    byStatus[t.status] = byStatus[t.status] || { count: 0, total: 0 }
    byStatus[t.status].count += 1
    byStatus[t.status].total += t.total
    const custName = getCustomerDisplayName(t.customer)
    byCustomer[custName] = byCustomer[custName] || { total: 0, count: 0 }
    byCustomer[custName].total += t.total
    byCustomer[custName].count += 1
    const day = new Date(t.createdAt).toDateString()
    byDate[day] = byDate[day] || { count: 0, total: 0 }
    byDate[day].count += 1
    byDate[day].total += t.total
    if (!byDateType[day]) byDateType[day] = { SCRAP: { count: 0, total: 0 }, MELT: { count: 0, total: 0 } }
    byDateType[day][t.type as "SCRAP" | "MELT"].count += 1
    byDateType[day][t.type as "SCRAP" | "MELT"].total += t.total
    if (!byDateMetal[day]) byDateMetal[day] = { GOLD: 0, SILVER: 0, PLATINUM: 0 }
    for (const item of t.lineItems) {
      const k = item.metalType as "GOLD" | "SILVER" | "PLATINUM"
      byDateMetal[day][k] = (byDateMetal[day][k] || 0) + item.lineTotal
    }
    if (!byDateStatus[day]) byDateStatus[day] = { OPEN: 0, PRINTED: 0, VOID: 0 }
    const sk = t.status as "OPEN" | "PRINTED" | "VOID"
    byDateStatus[day][sk] += t.total
    const dow = DAY_NAMES[new Date(t.createdAt).getDay()] as DayOfWeekKey
    byDayOfWeek[dow] += t.total
    for (const b of sizeBuckets) {
      if (t.total >= b.min && t.total < b.max) {
        b.count += 1
        b.total += t.total
        break
      }
    }
    if (t.total > maxTotal) maxTotal = t.total
    const key = `${t.type}|${t.status}`
    typeStatusKey[key] = typeStatusKey[key] || { count: 0, total: 0 }
    typeStatusKey[key].count += 1
    typeStatusKey[key].total += t.total
  }

  const topCustomers = Object.entries(byCustomer)
    .map(([name, { total }]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  const topCustomersByCount = Object.entries(byCustomer)
    .map(([name, { count }]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const dailySorted = Object.entries(byDate).sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
  ) as [string, { count: number; total: number }][]

  const dailyByType: DerivedData["dailyByType"] = dailySorted.map(([date, _]) => {
    const d = byDateType[date] || { SCRAP: { count: 0, total: 0 }, MELT: { count: 0, total: 0 } }
    return {
      date: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      scrapTotal: d.SCRAP.total,
      scrapCount: d.SCRAP.count,
      meltTotal: d.MELT.total,
      meltCount: d.MELT.count,
    }
  })

  const dailyByMetal: DerivedData["dailyByMetal"] = dailySorted.map(([date, _]) => {
    const d = byDateMetal[date] || { GOLD: 0, SILVER: 0, PLATINUM: 0 }
    return {
      date: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      gold: d.GOLD || 0,
      silver: d.SILVER || 0,
      platinum: d.PLATINUM || 0,
    }
  })

  const dailyByStatus: DerivedData["dailyByStatus"] = dailySorted.map(([date, _]) => {
    const d = byDateStatus[date] || { OPEN: 0, PRINTED: 0, VOID: 0 }
    return {
      date: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      OPEN: d.OPEN || 0,
      PRINTED: d.PRINTED || 0,
      VOID: d.VOID || 0,
    }
  })

  let running = 0
  const cumulativeDaily: DerivedData["cumulativeDaily"] = dailySorted.map(([date, d]) => {
    running += d.total
    return { date: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }), cumulative: running }
  })

  const avgByDay: DerivedData["avgByDay"] = dailySorted.map(([date, d]) => ({
    date: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    avg: d.count > 0 ? d.total / d.count : 0,
  }))

  const avgTx =
    transactions.length > 0
      ? transactions.reduce((s, t) => s + t.total, 0) / transactions.length
      : 0

  for (const type of ["SCRAP", "MELT"]) {
    for (const status of ["OPEN", "PRINTED", "VOID"]) {
      const key = `${type}|${status}`
      const v = typeStatusKey[key] || { count: 0, total: 0 }
      typeStatusMatrix.push({ type, status, count: v.count, total: v.total })
    }
  }

  return {
    byStatus,
    topCustomers,
    topCustomersByCount,
    dailySorted,
    dailyByType,
    dailyByMetal,
    dailyByStatus,
    byDayOfWeek,
    sizeBuckets: sizeBuckets.map(({ bucket, count, total }) => ({ bucket, count, total })),
    cumulativeDaily,
    avgByDay,
    avgTx,
    maxTotal,
    typeStatusMatrix,
  }
}
