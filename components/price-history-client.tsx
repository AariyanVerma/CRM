"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn, formatDecimal } from "@/lib/utils"
import { Download, Loader2, TrendingUp, DollarSign } from "lucide-react"

type PriceRow = {
  id: string
  date: string
  gold: number
  silver: number
  platinum: number
}

type MetalKey = "gold" | "silver" | "platinum"

const METAL_COLORS: Record<MetalKey, string> = {
  gold: "#d4a017",
  silver: "#94a3b8",
  platinum: "#64748b",
}

const METAL_LABELS: Record<MetalKey, string> = {
  gold: "Gold",
  silver: "Silver",
  platinum: "Platinum",
}

function toLocalYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function daysAgoYmd(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - days)
  return toLocalYmd(d)
}

function todayYmd(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return toLocalYmd(d)
}

function formatDisplayDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number)
  if (!y || !m || !d) return ymd
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatChartDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number)
  if (!y || !m || !d) return ymd
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function delta(current: number, previous: number | null): number | null {
  if (previous == null || !Number.isFinite(previous) || !Number.isFinite(current)) return null
  return current - previous
}

function deltaPercent(current: number, previous: number | null): number | null {
  if (previous == null || previous === 0 || !Number.isFinite(previous) || !Number.isFinite(current)) return null
  return ((current - previous) / previous) * 100
}

function DeltaBadge({ absolute, percent, mode }: { absolute: number | null; percent: number | null; mode: "usd" | "pct" }) {
  if (mode === "pct") {
    if (percent == null) {
      return <span className="text-xs text-muted-foreground">—</span>
    }
    const rounded = Math.round(percent * 100) / 100
    if (rounded === 0) {
      return <span className="text-xs font-medium text-muted-foreground">0.00%</span>
    }
    const up = rounded > 0
    return (
      <span className={cn("text-xs font-semibold tabular-nums", up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
        {up ? "+" : ""}
        {formatDecimal(rounded)}%
      </span>
    )
  }

  if (absolute == null) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  const rounded = Math.round(absolute * 100) / 100
  if (rounded === 0) {
    return <span className="text-xs font-medium text-muted-foreground">0.00</span>
  }
  const up = rounded > 0
  return (
    <span className={cn("text-xs font-semibold tabular-nums", up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
      {up ? "+" : ""}
      {formatDecimal(rounded)}
    </span>
  )
}

function PriceCell({
  value,
  previous,
  deltaMode,
}: {
  value: number
  previous: number | null
  deltaMode: "usd" | "pct"
}) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="font-semibold tabular-nums text-foreground">${formatDecimal(value)}</span>
      <DeltaBadge absolute={delta(value, previous)} percent={deltaPercent(value, previous)} mode={deltaMode} />
    </div>
  )
}

function escapeCsv(value: string | number): string {
  const raw = String(value)
  if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
  return raw
}

export function PriceHistoryClient() {
  const [preset, setPreset] = useState<"30" | "90" | "ytd" | "all" | "custom">("30")
  const [from, setFrom] = useState(() => daysAgoYmd(29))
  const [to, setTo] = useState(() => todayYmd())
  const [allTime, setAllTime] = useState(false)
  const [chartMetal, setChartMetal] = useState<MetalKey>("gold")
  const [deltaMode, setDeltaMode] = useState<"usd" | "pct">("usd")
  const [prices, setPrices] = useState<PriceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null)
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (allTime) {
        params.set("all", "1")
      } else {
        params.set("from", from)
        params.set("to", to)
      }
      const res = await fetch(`/api/admin/price-history?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(data.message || "Failed to load price history")
      }
      const data = await res.json() as { prices?: PriceRow[] }
      setPrices(Array.isArray(data.prices) ? data.prices : [])
      setHighlightedDate(null)
    } catch (err) {
      setPrices([])
      setError(err instanceof Error ? err.message : "Failed to load price history")
    } finally {
      setLoading(false)
    }
  }, [allTime, from, to])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    }
  }, [])

  function applyPreset(next: "30" | "90" | "ytd" | "all") {
    setPreset(next)
    if (next === "all") {
      setAllTime(true)
      return
    }
    setAllTime(false)
    setTo(todayYmd())
    if (next === "30") {
      setFrom(daysAgoYmd(29))
      return
    }
    if (next === "90") {
      setFrom(daysAgoYmd(89))
      return
    }
    const now = new Date()
    setFrom(`${now.getFullYear()}-01-01`)
  }

  const tableRows = useMemo(() => {
    return [...prices].reverse().map((row, index, arr) => {
      const older = arr[index + 1] ?? null
      return {
        ...row,
        prevGold: older?.gold ?? null,
        prevSilver: older?.silver ?? null,
        prevPlatinum: older?.platinum ?? null,
      }
    })
  }, [prices])

  const chartData = useMemo(
    () =>
      prices.map((row) => ({
        date: row.date,
        label: formatChartDate(row.date),
        price: row[chartMetal],
      })),
    [prices, chartMetal]
  )

  const latest = prices.length > 0 ? prices[prices.length - 1] : null

  function focusTableRow(date: string) {
    setHighlightedDate(date)
    requestAnimationFrame(() => {
      const el = rowRefs.current[date]
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    })
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedDate((current) => (current === date ? null : current))
    }, 2800)
  }

  function handleChartClick(state: unknown) {
    const payload = state as {
      activePayload?: Array<{ payload?: { date?: string } }>
      activeLabel?: string
    } | null
    const date = payload?.activePayload?.[0]?.payload?.date
    if (date) focusTableRow(date)
  }

  function exportCsv() {
    if (tableRows.length === 0) return

    const header = [
      "Date",
      "Gold",
      "Gold Δ",
      "Gold Δ %",
      "Silver",
      "Silver Δ",
      "Silver Δ %",
      "Platinum",
      "Platinum Δ",
      "Platinum Δ %",
    ]

    const lines = tableRows.map((row) => {
      const gAbs = delta(row.gold, row.prevGold)
      const sAbs = delta(row.silver, row.prevSilver)
      const pAbs = delta(row.platinum, row.prevPlatinum)
      const gPct = deltaPercent(row.gold, row.prevGold)
      const sPct = deltaPercent(row.silver, row.prevSilver)
      const pPct = deltaPercent(row.platinum, row.prevPlatinum)
      return [
        row.date,
        formatDecimal(row.gold),
        gAbs == null ? "" : formatDecimal(Math.round(gAbs * 100) / 100),
        gPct == null ? "" : formatDecimal(Math.round(gPct * 100) / 100),
        formatDecimal(row.silver),
        sAbs == null ? "" : formatDecimal(Math.round(sAbs * 100) / 100),
        sPct == null ? "" : formatDecimal(Math.round(sPct * 100) / 100),
        formatDecimal(row.platinum),
        pAbs == null ? "" : formatDecimal(Math.round(pAbs * 100) / 100),
        pPct == null ? "" : formatDecimal(Math.round(pPct * 100) / 100),
      ].map(escapeCsv).join(",")
    })

    const csv = [header.join(","), ...lines].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const rangeLabel = allTime ? "all-time" : `${from}_to_${to}`
    a.href = url
    a.download = `price-history_${rangeLabel}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <Card className="border border-primary/15 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Date range
              </CardTitle>
              <CardDescription className="mt-1.5">
                Default is the last 30 days. Use presets or pick any from/to range, including all-time history.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" asChild className="h-9">
                <Link href="/admin/prices">
                  <DollarSign className="h-4 w-4 mr-1.5" />
                  Daily Prices
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9"
                onClick={exportCsv}
                disabled={loading || tableRows.length === 0}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={preset === "30" ? "default" : "outline"}
              onClick={() => applyPreset("30")}
              className="h-9"
            >
              Last 30 days
            </Button>
            <Button
              type="button"
              variant={preset === "90" ? "default" : "outline"}
              onClick={() => applyPreset("90")}
              className="h-9"
            >
              Last 90 days
            </Button>
            <Button
              type="button"
              variant={preset === "ytd" ? "default" : "outline"}
              onClick={() => applyPreset("ytd")}
              className="h-9"
            >
              Year to date
            </Button>
            <Button
              type="button"
              variant={preset === "all" ? "default" : "outline"}
              onClick={() => applyPreset("all")}
              className="h-9"
            >
              All time
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">From</Label>
              <Input
                type="date"
                value={from}
                disabled={allTime}
                onChange={(e) => {
                  setPreset("custom")
                  setAllTime(false)
                  setFrom(e.target.value)
                }}
                className="w-[160px] h-11 rounded-xl border-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">To</Label>
              <Input
                type="date"
                value={to}
                disabled={allTime}
                onChange={(e) => {
                  setPreset("custom")
                  setAllTime(false)
                  setTo(e.target.value)
                }}
                className="w-[160px] h-11 rounded-xl border-primary/20"
              />
            </div>
            <Button type="button" onClick={() => void load()} disabled={loading} className="h-11">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-primary/15 bg-gradient-to-r from-muted/40 to-muted/20 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">Price history at a glance</span>
        <span className="text-sm tabular-nums">
          <strong className="text-foreground">{prices.length}</strong> day{prices.length === 1 ? "" : "s"}
          {allTime ? (
            <span className="text-muted-foreground"> · all time</span>
          ) : (
            <span className="text-muted-foreground">
              {" "}· {formatDisplayDate(from)} – {formatDisplayDate(to)}
            </span>
          )}
          {latest ? (
            <>
              <span className="mx-2 text-muted-foreground">·</span>
              Latest: <strong className="text-foreground">{formatDisplayDate(latest.date)}</strong>
            </>
          ) : null}
        </span>
      </div>

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="border-b bg-muted/20 space-y-4">
          <div>
            <CardTitle className="text-lg">Spot price trend</CardTitle>
            <CardDescription>
              {METAL_LABELS[chartMetal]} over the selected range · click a point to jump to that day in the table
            </CardDescription>
          </div>
          <Tabs
            value={chartMetal}
            onValueChange={(value) => setChartMetal(value as MetalKey)}
          >
            <TabsList className="bg-muted/80">
              <TabsTrigger
                value="gold"
                className="data-[state=active]:bg-[#d4a017]/20 data-[state=active]:text-[#a67c00] dark:data-[state=active]:text-[#f0c84a] data-[state=active]:shadow-sm"
              >
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#d4a017]" />
                Gold
              </TabsTrigger>
              <TabsTrigger
                value="silver"
                className="data-[state=active]:bg-slate-400/25 data-[state=active]:text-slate-700 dark:data-[state=active]:text-slate-200 data-[state=active]:shadow-sm"
              >
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#94a3b8]" />
                Silver
              </TabsTrigger>
              <TabsTrigger
                value="platinum"
                className="data-[state=active]:bg-slate-500/25 data-[state=active]:text-slate-800 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm"
              >
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#64748b]" />
                Platinum
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading chart…
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
              No saved daily prices in this range.
            </div>
          ) : (
            <div className="w-full h-[300px] cursor-pointer">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                  onClick={handleChartClick}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    width={56}
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as { date?: string } | undefined
                      return row?.date ? formatDisplayDate(row.date) : ""
                    }}
                    formatter={(value) => [`$${formatDecimal(Number(value) || 0)}`, METAL_LABELS[chartMetal]]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    name={METAL_LABELS[chartMetal]}
                    stroke={METAL_COLORS[chartMetal]}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="border-b bg-muted/20 flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg">Daily spot prices</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={deltaMode} onValueChange={(value) => setDeltaMode(value as "usd" | "pct")}>
              <TabsList className="h-9">
                <TabsTrigger value="usd" className="px-3 text-xs sm:text-sm">Δ $</TabsTrigger>
                <TabsTrigger value="pct" className="px-3 text-xs sm:text-sm">Δ %</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportCsv}
              disabled={loading || tableRows.length === 0}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading prices…
            </div>
          ) : tableRows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No saved daily prices in this range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="sticky left-0 z-10 bg-muted/30 px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold text-right">Gold ($/oz)</th>
                    <th className="px-4 py-3 font-semibold text-right">Silver ($/oz)</th>
                    <th className="px-4 py-3 font-semibold text-right">Platinum ($/oz)</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, index) => {
                    const isHighlighted = highlightedDate === row.date
                    const rowBg = isHighlighted
                      ? "bg-primary/15"
                      : index % 2 === 0
                        ? "bg-background"
                        : "bg-muted/15"
                    return (
                      <tr
                        key={row.id}
                        ref={(el) => { rowRefs.current[row.date] = el }}
                        className={cn(
                          "border-b transition-colors",
                          rowBg,
                          isHighlighted ? "ring-2 ring-inset ring-primary/40" : "hover:bg-primary/5"
                        )}
                      >
                        <td className={cn("sticky left-0 z-10 px-4 py-3 font-medium whitespace-nowrap", rowBg)}>
                          {formatDisplayDate(row.date)}
                        </td>
                        <td className="px-4 py-3">
                          <PriceCell value={row.gold} previous={row.prevGold} deltaMode={deltaMode} />
                        </td>
                        <td className="px-4 py-3">
                          <PriceCell value={row.silver} previous={row.prevSilver} deltaMode={deltaMode} />
                        </td>
                        <td className="px-4 py-3">
                          <PriceCell value={row.platinum} previous={row.prevPlatinum} deltaMode={deltaMode} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
