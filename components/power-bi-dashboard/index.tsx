"use client"

import { useState, useEffect, useCallback } from "react"
import { Layers, Coins, BarChart3, Calendar, User, TrendingUp } from "lucide-react"
import { DashboardContentSkeleton } from "@/components/skeletons"
import type { ReportData, FilterState } from "./types"
import { FilterBar } from "./FilterBar"
import { KPITiles } from "./KPITiles"
import { DataTable } from "./DataTable"
import { ChartCard } from "./ChartCard"
import { InsightsSection } from "./InsightsSection"
import {
  ByTypePieChart,
  ByMetalBarChart,
  ByStatusBarChart,
  DailyTrendChart,
  TopCustomersChart,
  TypeStatusMatrix,
  ScrapVsMeltOverTimeChart,
  MetalMixOverTimeChart,
  TransactionSizeDistributionChart,
  RevenueByDayOfWeekChart,
  CumulativeRevenueChart,
  AvgTransactionByDayChart,
  TopCustomersByCountChart,
  StatusOverTimeChart,
} from "./charts"
import {
  filterTransactions,
  computeSummaryFromTransactions,
  computeDerived,
} from "./utils"

const FULL_SCREEN_HEIGHT = 520

const defaultFilters: FilterState = { typeFilter: "ALL", statusFilter: "ALL" }

export function PowerBIDashboard() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("week")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [customers, setCustomers] = useState<Array<{ id: string; fullName: string }>>([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>(defaultFilters)

  const setDatesFromPeriod = useCallback((p: "day" | "week" | "month") => {
    const today = new Date()
    const toStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    setTo(toStr)
    const fromDate = new Date(today)
    if (p === "day") setFrom(toStr)
    else if (p === "week") {
      fromDate.setDate(fromDate.getDate() - 7)
      setFrom(`${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}-${String(fromDate.getDate()).padStart(2, "0")}`)
    } else {
      fromDate.setDate(fromDate.getDate() - 30)
      setFrom(`${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}-${String(fromDate.getDate()).padStart(2, "0")}`)
    }
  }, [])

  useEffect(() => {
    setDatesFromPeriod(period)
  }, [period, setDatesFromPeriod])

  useEffect(() => {
    const q = customerSearch.trim()
    const t = setTimeout(() => {
      setCustomersLoading(true)
      fetch(`/api/customers?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => (Array.isArray(list) ? setCustomers(list) : []))
        .catch(() => setCustomers([]))
        .finally(() => setCustomersLoading(false))
    }, 200)
    return () => clearTimeout(t)
  }, [customerSearch])

  const loadReport = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("period", period)
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    if (customerId) params.set("customerId", customerId)
    fetch(`/api/reports?${params}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed"))))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [period, from, to, customerId])

  useEffect(() => {
    if (from && to) loadReport()
  }, [from, to, loadReport])

  const filteredTx = data ? filterTransactions(data.transactions, filters) : []
  const summary = data ? computeSummaryFromTransactions(filteredTx) : null
  const derived = data ? computeDerived(filteredTx) : null

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6 pb-8">
      <FilterBar
        period={period}
        setPeriod={setPeriod}
        from={from}
        setFrom={setFrom}
        to={to}
        setTo={setTo}
        customerId={customerId}
        setCustomerId={setCustomerId}
        customerSearch={customerSearch}
        setCustomerSearch={setCustomerSearch}
        customers={customers}
        customersLoading={customersLoading}
        filters={filters}
        setFilters={setFilters}
        onApply={loadReport}
        loading={loading}
      />

      {loading && !data && <DashboardContentSkeleton />}

      {data && !loading && summary && derived && (
        <>
          <section className="shrink-0">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Key metrics</h2>
            <KPITiles summary={summary} avgTx={derived.avgTx} maxTotal={derived.maxTotal} />
          </section>

          <section className="shrink-0">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Insights & trends</h2>
            <InsightsSection summary={summary} derived={derived} />
          </section>

          <section className="flex-1 min-h-0 flex flex-col">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 shrink-0">Visuals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 grid-auto-rows-[minmax(260px,1fr)] grid-flow-row-dense min-h-0 flex-1 overflow-auto">
              <div className="min-h-0 h-full flex flex-col">
                <ChartCard
                  title="By type"
                  icon={<Layers className="h-4 w-4 text-primary" />}
                  fullScreenContent={<ByTypePieChart summary={summary} height={FULL_SCREEN_HEIGHT} hideTitle />}
                >
                  <ByTypePieChart summary={summary} />
                </ChartCard>
              </div>
              <div className="min-h-0 h-full flex flex-col">
                <ChartCard
                  title="By metal"
                  icon={<Coins className="h-4 w-4 text-amber-600" />}
                  fullScreenContent={<ByMetalBarChart summary={summary} height={FULL_SCREEN_HEIGHT} hideTitle />}
                >
                  <ByMetalBarChart summary={summary} />
                </ChartCard>
              </div>
              <div className="min-h-0 h-full flex flex-col">
                <ChartCard
                  title="By status (count & total)"
                  icon={<BarChart3 className="h-4 w-4" />}
                  fullScreenContent={<ByStatusBarChart derived={derived} height={FULL_SCREEN_HEIGHT} hideTitle />}
                >
                  <ByStatusBarChart derived={derived} />
                </ChartCard>
              </div>
              <div className="min-h-0 h-full flex flex-col md:col-span-2">
                <ChartCard
                  title="Daily trend"
                  icon={<Calendar className="h-4 w-4" />}
                  fullScreenContent={<DailyTrendChart derived={derived} height={FULL_SCREEN_HEIGHT} hideTitle />}
                >
                  <DailyTrendChart derived={derived} />
                </ChartCard>
              </div>
              <div className="min-h-0 h-full flex flex-col">
                <ChartCard
                  title="Top customers"
                  icon={<User className="h-4 w-4" />}
                  fullScreenContent={<TopCustomersChart derived={derived} height={FULL_SCREEN_HEIGHT} hideTitle />}
                >
                  <TopCustomersChart derived={derived} />
                </ChartCard>
              </div>
              <div className="min-h-0 h-full flex flex-col md:col-span-2">
                <TypeStatusMatrix derived={derived} />
              </div>
              <div className="min-h-0 h-full flex flex-col md:col-span-2">
                <ChartCard title="SCRAP vs MELT over time" icon={<Layers className="h-4 w-4" />} fullScreenContent={<ScrapVsMeltOverTimeChart derived={derived} height={FULL_SCREEN_HEIGHT} hideTitle />}>
                  <ScrapVsMeltOverTimeChart derived={derived} />
                </ChartCard>
              </div>
              <div className="min-h-0 h-full flex flex-col">
                <ChartCard title="Metal mix over time" icon={<Coins className="h-4 w-4 text-amber-600" />} fullScreenContent={<MetalMixOverTimeChart derived={derived} height={FULL_SCREEN_HEIGHT} hideTitle />}>
                  <MetalMixOverTimeChart derived={derived} />
                </ChartCard>
              </div>
              <div className="min-h-0 h-full flex flex-col md:col-span-2">
                <ChartCard title="Value by status over time" icon={<BarChart3 className="h-4 w-4" />} fullScreenContent={<StatusOverTimeChart derived={derived} height={FULL_SCREEN_HEIGHT} hideTitle />}>
                  <StatusOverTimeChart derived={derived} />
                </ChartCard>
              </div>
              <div className="min-h-0 h-full flex flex-col">
                <ChartCard title="Transaction size distribution" icon={<BarChart3 className="h-4 w-4" />} fullScreenContent={<TransactionSizeDistributionChart derived={derived} height={FULL_SCREEN_HEIGHT} hideTitle />}>
                  <TransactionSizeDistributionChart derived={derived} />
                </ChartCard>
              </div>
              <div className="min-h-0 h-full flex flex-col">
                <ChartCard title="Revenue by day of week" icon={<Calendar className="h-4 w-4" />} fullScreenContent={<RevenueByDayOfWeekChart derived={derived} height={FULL_SCREEN_HEIGHT} hideTitle />}>
                  <RevenueByDayOfWeekChart derived={derived} />
                </ChartCard>
              </div>
              <div className="min-h-0 h-full flex flex-col">
                <ChartCard title="Cumulative revenue" icon={<TrendingUp className="h-4 w-4" />} fullScreenContent={<CumulativeRevenueChart derived={derived} height={FULL_SCREEN_HEIGHT} hideTitle />}>
                  <CumulativeRevenueChart derived={derived} />
                </ChartCard>
              </div>
              <div className="min-h-0 h-full flex flex-col">
                <ChartCard title="Avg transaction by day" icon={<BarChart3 className="h-4 w-4" />} fullScreenContent={<AvgTransactionByDayChart derived={derived} height={FULL_SCREEN_HEIGHT} hideTitle />}>
                  <AvgTransactionByDayChart derived={derived} />
                </ChartCard>
              </div>
              <div className="min-h-0 h-full flex flex-col">
                <ChartCard title="Top customers by visit count" icon={<User className="h-4 w-4" />} fullScreenContent={<TopCustomersByCountChart derived={derived} height={FULL_SCREEN_HEIGHT} hideTitle />}>
                  <TopCustomersByCountChart derived={derived} />
                </ChartCard>
              </div>
            </div>
          </section>

          <section className="shrink-0">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Data</h2>
            <DataTable transactions={filteredTx} from={data.from} to={data.to} />
          </section>
        </>
      )}

      {!loading && !data && (
        <div className="rounded-lg border border-dashed bg-destructive/10 border-destructive/20 p-8 text-center text-muted-foreground">
          Failed to load report. Check your connection and try Apply again.
        </div>
      )}

      {data && !loading && filteredTx.length === 0 && (
        <div className="rounded-lg border border-dashed bg-muted/30 p-12 text-center text-muted-foreground">
          No transactions match the current filters. Try a different date range or clear Type/Status filters.
        </div>
      )}
    </div>
  )
}
