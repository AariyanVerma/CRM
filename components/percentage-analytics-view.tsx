"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Calendar, TrendingUp, BarChart3, PieChart as PieChartIcon, Activity } from "lucide-react"

type Metal = "GOLD" | "SILVER" | "PLATINUM"
type TxType = "SCRAP" | "MELT"

type ReportTransaction = {
  id: string
  type: string
  status?: string
  createdAt: string
  scrapGoldPercentage?: number | null
  scrapSilverPercentage?: number | null
  scrapPlatinumPercentage?: number | null
  meltGoldPercentage?: number | null
  meltSilverPercentage?: number | null
  meltPlatinumPercentage?: number | null
}

type PercentageRow = {
  key: string
  type: TxType
  metal: Metal
  label: string
  min: number
  max: number
  avg: number
  mostUsed: number
  leastUsed: number
  count: number
}

type PercentageData = {
  rows: PercentageRow[]
  trendByDay: Array<Record<string, string | number>>
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { dateStyle: "short" })
}

function buildPercentageData(
  transactions: ReportTransaction[],
  opts?: { keySuffix?: string; labelSuffix?: string }
): PercentageData | null {
  const keySuffix = opts?.keySuffix ?? ""
  const labelSuffix = opts?.labelSuffix ?? ""
  const points: Array<{ type: TxType; metal: Metal; percentage: number; date: string }> = []

  for (const t of transactions) {
    const type = t.type as TxType
    const date = t.createdAt
    const add = (metal: Metal, percentage: number | null | undefined) => {
      if (percentage == null || Number.isNaN(percentage)) return
      points.push({ type, metal, percentage, date })
    }
    if (type === "SCRAP") {
      add("GOLD", t.scrapGoldPercentage ?? null)
      add("SILVER", t.scrapSilverPercentage ?? null)
      add("PLATINUM", t.scrapPlatinumPercentage ?? null)
    } else if (type === "MELT") {
      add("GOLD", t.meltGoldPercentage ?? null)
      add("SILVER", t.meltSilverPercentage ?? null)
      add("PLATINUM", t.meltPlatinumPercentage ?? null)
    }
  }

  if (points.length === 0) return null

  const byKey: Record<string, { type: TxType; metal: Metal; values: number[] }> = {}
  const perDay: Record<string, Record<string, { sum: number; count: number }>> = {}

  for (const p of points) {
    const key = `${p.type}_${p.metal}${keySuffix}` as const
    if (!byKey[key]) byKey[key] = { type: p.type, metal: p.metal, values: [] }
    byKey[key].values.push(p.percentage)

    const day = new Date(p.date).toISOString().slice(0, 10)
    if (!perDay[day]) perDay[day] = {}
    if (!perDay[day][key]) perDay[day][key] = { sum: 0, count: 0 }
    perDay[day][key].sum += p.percentage
    perDay[day][key].count += 1
  }

  const rows: PercentageRow[] = Object.entries(byKey).map(([key, { type, metal, values }]) => {
    const min = Math.min(...values)
    const max = Math.max(...values)
    const avg = values.reduce((s, v) => s + v, 0) / values.length
    const freq: Record<string, number> = {}
    values.forEach((v) => {
      const k = v.toFixed(2)
      freq[k] = (freq[k] || 0) + 1
    })
    let mostUsed = values[0]
    let leastUsed = values[0]
    let maxCount = -1
    let minCount = Number.POSITIVE_INFINITY
    for (const [k, c] of Object.entries(freq)) {
      const val = parseFloat(k)
      if (c > maxCount) {
        maxCount = c
        mostUsed = val
      }
      if (c < minCount) {
        minCount = c
        leastUsed = val
      }
    }
    return {
      key,
      type,
      metal,
      label: `${type} ${metal}${labelSuffix}`,
      min,
      max,
      avg,
      mostUsed,
      leastUsed,
      count: values.length,
    }
  }).sort((a, b) => a.type.localeCompare(b.type) || a.metal.localeCompare(b.metal))

  const trendByDay = Object.entries(perDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, metals]) => {
      const row: Record<string, string | number> = { date: formatDate(day) }
      Object.entries(metals).forEach(([key, { sum, count }]) => {
        row[key] = Math.round((sum / count) * 100) / 100
      })
      return row
    })

  return { rows, trendByDay }
}

const CHART_COLORS = [
  "#f97316", 
  "#0ea5e9", 
  "#22c55e", 
  "#eab308", 
  "#a855f7", 
  "#ef4444", 
]

type ReportsApiResponse = {
  transactions: ReportTransaction[]
  approvedTransactions?: ReportTransaction[] | null
}

export function PercentageAnalyticsView() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("week")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [data, setData] = useState<ReportsApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartView, setChartView] = useState<"trend" | "avg" | "highlow" | "mostleast" | "distribution">("trend")

  const setDatesFromPeriod = useCallback((p: "day" | "week" | "month") => {
    const today = new Date()
    const toStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    setTo(toStr)
    const fromDate = new Date(today)
    if (p === "day") setFrom(toStr)
    else if (p === "week") {
      fromDate.setDate(fromDate.getDate() - 7)
      setFrom(fromDate.toISOString().slice(0, 10))
    } else {
      fromDate.setDate(fromDate.getDate() - 30)
      setFrom(fromDate.toISOString().slice(0, 10))
    }
  }, [])

  useEffect(() => {
    setDatesFromPeriod(period)
  }, [period, setDatesFromPeriod])

  const loadReport = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("period", period)
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    params.set("includeApprovedImpact", "true")
    fetch(`/api/reports?${params}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed"))))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [period, from, to])

  useEffect(() => {
    if (from && to) loadReport()
  }, [from, to, loadReport])

  const printedPercentageData = useMemo(() => {
    if (!data?.transactions?.length) return null
    return buildPercentageData(data.transactions as ReportTransaction[])
  }, [data])

  const approvedPercentageData = useMemo(() => {
    if (!data?.approvedTransactions?.length) return null
    return buildPercentageData(data.approvedTransactions as ReportTransaction[], {
      keySuffix: "_APPROVED",
      labelSuffix: " (Approved, not printed)",
    })
  }, [data])

  const mergedTrendByDay = useMemo(() => {
    if (!printedPercentageData && !approvedPercentageData) return null
    const byDate = new Map<string, Record<string, string | number>>()

    const addRows = (rows: Array<Record<string, string | number>> | undefined | null) => {
      rows?.forEach((row) => {
        const date = String(row.date)
        const existing = byDate.get(date) ?? { date }
        Object.entries(row).forEach(([k, v]) => {
          if (k === "date") return
          existing[k] = v
        })
        byDate.set(date, existing)
      })
    }

    addRows(printedPercentageData?.trendByDay)
    addRows(approvedPercentageData?.trendByDay)

    return Array.from(byDate.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [printedPercentageData, approvedPercentageData])

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6 pb-8">
      <Card className="border bg-card shadow-sm sticky top-0 z-20 shrink-0">
        <CardHeader className="py-3 px-4 border-b bg-muted/30">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
            <Calendar className="h-4 w-4" /> Date range
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Period</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as "day" | "week" | "month")}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[140px] h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[140px] h-9" />
            </div>
            <Button onClick={loadReport} disabled={loading} className="h-9">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && !data && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && data && !printedPercentageData && (
        <div className="rounded-lg border border-dashed bg-muted/30 p-12 text-center text-muted-foreground">
          No transaction percentage data in this range. Try a different date range.
        </div>
      )}

      {!loading && printedPercentageData && (
        <>
          <div className="flex flex-wrap gap-2 shrink-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider self-center mr-2">Chart:</span>
            {[
              { id: "trend" as const, label: "Trend over time", icon: Activity },
              { id: "avg" as const, label: "Average by metal & type", icon: BarChart3 },
              { id: "highlow" as const, label: "Highest & lowest %", icon: TrendingUp },
              { id: "mostleast" as const, label: "Most & least used %", icon: PieChartIcon },
              { id: "distribution" as const, label: "Usage distribution", icon: PieChartIcon },
            ].map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={chartView === id ? "default" : "outline"}
                size="sm"
                onClick={() => setChartView(id)}
                className="rounded-lg"
              >
                <Icon className="h-4 w-4 mr-1.5" />
                {label}
              </Button>
            ))}
          </div>

          <div className="flex-1 min-h-0 rounded-xl border border-border bg-muted/10 p-4">
            {chartView === "trend" && mergedTrendByDay && (
              <Card className="border-0 shadow-none bg-transparent h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Percentage trend by day</CardTitle>
                  <CardDescription>Daily average metal % used (SCRAP vs MELT per metal)</CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={mergedTrendByDay} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} width={36} domain={[0, 100]} />
                      <Tooltip formatter={(v: number) => [`${Number(v).toFixed(2)}%`, ""]} contentStyle={{ fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {[...printedPercentageData.rows, ...(approvedPercentageData?.rows ?? [])].map((r, i) => (
                        <Line
                          key={r.key}
                          type="monotone"
                          dataKey={r.key}
                          name={r.label}
                          stroke={CHART_COLORS[i % CHART_COLORS.length]}
                          dot={{ r: 3 }}
                          strokeWidth={2}
                          strokeDasharray={r.key.endsWith("_APPROVED") ? "4 4" : undefined}
                          strokeOpacity={r.key.endsWith("_APPROVED") ? 0.6 : 1}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {chartView === "avg" && (
              <Card className="border-0 shadow-none bg-transparent h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Average percentage by metal & type</CardTitle>
                  <CardDescription>Mean % used for each metal in SCRAP and MELT transactions</CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={printedPercentageData.rows.map((r) => ({ label: r.label, avg: r.avg, fill: CHART_COLORS[printedPercentageData.rows.indexOf(r) % CHART_COLORS.length] }))}
                      margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
                    >
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} width={36} domain={[0, 100]} />
                      <Tooltip formatter={(v: number) => [`${Number(v).toFixed(2)}%`, "Average"]} contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                        {printedPercentageData.rows.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {chartView === "highlow" && (
              <Card className="border-0 shadow-none bg-transparent h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Highest & lowest percentage per metal</CardTitle>
                  <CardDescription>Min, average, and max % used for each metal & type in the period</CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={printedPercentageData.rows.map((r) => ({
                        label: r.label,
                        "Lowest %": r.min,
                        "Average %": r.avg,
                        "Highest %": r.max,
                      }))}
                      margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
                    >
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} width={36} domain={[0, 100]} />
                      <Tooltip formatter={(v: number) => [`${Number(v).toFixed(2)}%`, ""]} contentStyle={{ fontSize: 12 }} />
                      <Legend />
                      <Bar dataKey="Lowest %" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Average %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Highest %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {chartView === "mostleast" && (
              <Card className="border-0 shadow-none bg-transparent h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Most used vs least used percentage</CardTitle>
                  <CardDescription>Mode (most frequent) and rarest % value per metal & type</CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={printedPercentageData.rows.flatMap((r) => [
                        { label: `${r.label} (most)`, value: r.mostUsed, type: "Most used" },
                        { label: `${r.label} (least)`, value: r.leastUsed, type: "Least used" },
                      ])}
                      margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
                    >
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} width={36} domain={[0, 100]} />
                      <Tooltip formatter={(v: number) => [`${Number(v).toFixed(2)}%`, ""]} contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="value" name="Percentage" radius={[4, 4, 0, 0]}>
                        {printedPercentageData.rows.flatMap((r, i) => [
                          <Cell key={`${r.key}-most`} fill={CHART_COLORS[i % CHART_COLORS.length]} />,
                          <Cell key={`${r.key}-least`} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity={0.5} />,
                        ])}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {chartView === "distribution" && (
              <Card className="border-0 shadow-none bg-transparent h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Percentage usage distribution</CardTitle>
                  <CardDescription>Share of transactions by metal & type (count)</CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={printedPercentageData.rows.map((r) => ({ label: r.label, count: r.count }))}
                      margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
                    >
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} width={40} />
                      <Tooltip formatter={(v: number) => [v, "Transactions"]} contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="count" name="Transaction count" radius={[4, 4, 0, 0]}>
                        {printedPercentageData.rows.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="border bg-card shadow-sm shrink-0 mt-4">
            <CardHeader className="py-3 px-4 border-b bg-muted/30">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Summary stats (percentage only)</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {printedPercentageData.rows.map((r) => (
                  <div key={r.key} className="rounded-lg bg-muted/40 p-3 space-y-1 text-sm">
                    <div className="font-semibold text-foreground">{r.label}</div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Avg</span>
                      <span className="tabular-nums font-medium">{r.avg.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Min</span>
                      <span className="tabular-nums">{r.min.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Max</span>
                      <span className="tabular-nums">{r.max.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Most used</span>
                      <span className="tabular-nums">{r.mostUsed.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Least used</span>
                      <span className="tabular-nums">{r.leastUsed.toFixed(2)}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground pt-1 border-t border-border mt-1">
                      {r.count} transaction(s)
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
