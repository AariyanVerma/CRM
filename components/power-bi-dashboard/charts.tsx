"use client"

import { useRef, useState, useEffect } from "react"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Layers, Coins, BarChart3, Calendar, User, Grid3X3, TrendingUp, PieChart as PieChartIcon, DollarSign } from "lucide-react"
import { formatCurrency } from "./utils"
import type { DerivedData } from "./types"

const COLORS = ["hsl(var(--primary))", "#22c55e", "#a855f7", "#94a3b8", "#cbd5e1"]
const TYPE_COLORS: Record<string, string> = {
  SCRAP: "hsl(var(--primary))",
  MELT: "hsl(var(--destructive))",
}
const CHART_MARGIN = { top: 16, right: 24, bottom: 40, left: 24 }
const CHART_HEIGHT = 280
const STATUS_COLORS: Record<string, string> = {
  OPEN: "hsl(var(--primary))",
  PRINTED: "#22c55e",
  VOID: "#94a3b8",
}
const METAL_COLORS: Record<string, string> = {
  GOLD: "#eab308",
  SILVER: "#94a3b8",
  PLATINUM: "#0d9488",
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; payload?: Record<string, unknown> }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      {label && <p className="font-medium mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="tabular-nums">
          {p.name}: {typeof p.value === "number" && p.value > 100 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

function ChartColorKey({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map(({ color, label }) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0 border border-border/50" style={{ backgroundColor: color }} />
          {label}
        </span>
      ))}
    </div>
  )
}

/** Fills container and passes measured height to ResponsiveContainer so charts resize with available space. */
function ResponsiveChartContainer({ children, minHeight = 200 }: { children: React.ReactNode; minHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(minHeight)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height
      if (typeof h === "number" && h > 0) setHeight(Math.max(minHeight, Math.round(h)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [minHeight])
  return (
    <div ref={ref} className="flex-1 min-h-0 w-full" style={{ minHeight: `${minHeight}px` }}>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  )
}

type Summary = {
  byType: { SCRAP: { count: number; total: number }; MELT: { count: number; total: number } }
  byMetal: { GOLD: number; SILVER: number; PLATINUM: number }
  transactionCount: number
  grandTotal: number
}

export function ByTypePieChart({ summary, height, hideTitle, onTitleClick }: { summary: Summary; height?: number; hideTitle?: boolean; onTitleClick?: () => void }) {
  const data = [
    { name: "SCRAP", value: summary.byType.SCRAP.total, count: summary.byType.SCRAP.count },
    { name: "MELT", value: summary.byType.MELT.total, count: summary.byType.MELT.count },
  ].filter((d) => d.value > 0)
  const effectiveHeight = height ?? CHART_HEIGHT
  if (data.length === 0) {
    return (
      <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
        {!hideTitle && (
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              By type
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-sm min-h-[200px]">
          No data
        </CardContent>
      </Card>
    )
  }
  const radius = effectiveHeight < 300 ? 70 : Math.min(100, effectiveHeight * 0.35)
  const chart = (
    <PieChart margin={CHART_MARGIN}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        innerRadius={radius * 0.55}
        outerRadius={radius}
        paddingAngle={2}
        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
      >
        {data.map((d, i) => (
          <Cell key={i} fill={TYPE_COLORS[d.name] ?? COLORS[i % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip cursor={false} formatter={(v, name, props) => [formatCurrency(Number(v ?? 0)), `${name} (${(props?.payload as { count?: number })?.count ?? 0} trans)`]} />
      <Legend verticalAlign="bottom" />
    </PieChart>
  )
  return (
    <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
      {!hideTitle && (
        <CardHeader className="pb-2">
          <CardTitle
            className="text-base flex items-center gap-2 cursor-pointer hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            onClick={onTitleClick}
            onKeyDown={(e) => e.key === "Enter" && onTitleClick?.()}
            role={onTitleClick ? "button" : undefined}
            tabIndex={onTitleClick ? 0 : undefined}
          >
            <Layers className="h-4 w-4 text-primary" />
            By type
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 min-h-0 flex flex-col">
        {height != null ? (
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height={height}>{chart}</ResponsiveContainer>
          </div>
        ) : (
          <ResponsiveChartContainer minHeight={CHART_HEIGHT}>{chart}</ResponsiveChartContainer>
        )}
        <ChartColorKey items={[{ color: TYPE_COLORS.SCRAP, label: "SCRAP (blue)" }, { color: TYPE_COLORS.MELT, label: "MELT (red)" }]} />
      </CardContent>
    </Card>
  )
}

export function ByMetalBarChart({ summary, height, hideTitle, onTitleClick }: { summary: Summary; height?: number; hideTitle?: boolean; onTitleClick?: () => void }) {
  const data = [
    { metal: "Gold", value: summary.byMetal.GOLD || 0, fill: METAL_COLORS.GOLD },
    { metal: "Silver", value: summary.byMetal.SILVER || 0, fill: METAL_COLORS.SILVER },
    { metal: "Platinum", value: summary.byMetal.PLATINUM || 0, fill: METAL_COLORS.PLATINUM },
  ]
  const chart = (
    <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 16, left: 56 }}>
      <XAxis type="number" tickFormatter={(v) => `$${v}`} />
      <YAxis type="category" dataKey="metal" width={52} tick={{ fontSize: 12 }} />
      <Tooltip cursor={false} content={<CustomTooltip />} formatter={(v) => [formatCurrency(Number(v ?? 0))]} />
      <Bar dataKey="value" name="Total" radius={[0, 4, 4, 0]} activeBar={{ opacity: 1 }} cursor="default">
        {data.map((d, i) => (
          <Cell key={i} fill={d.fill} />
        ))}
      </Bar>
    </BarChart>
  )
  return (
    <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
      {!hideTitle && (
        <CardHeader className="pb-2">
          <CardTitle
            className="text-base flex items-center gap-2 cursor-pointer hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            onClick={onTitleClick}
            onKeyDown={(e) => e.key === "Enter" && onTitleClick?.()}
            role={onTitleClick ? "button" : undefined}
            tabIndex={onTitleClick ? 0 : undefined}
          >
            <Coins className="h-4 w-4 text-amber-600" />
            By metal
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 min-h-0 flex flex-col">
        {height != null ? (
          <div style={{ height }}><ResponsiveContainer width="100%" height={height}>{chart}</ResponsiveContainer></div>
        ) : (
          <ResponsiveChartContainer minHeight={CHART_HEIGHT}>{chart}</ResponsiveChartContainer>
        )}
        <ChartColorKey items={[{ color: METAL_COLORS.GOLD, label: "Gold (yellow)" }, { color: METAL_COLORS.SILVER, label: "Silver (grey)" }, { color: METAL_COLORS.PLATINUM, label: "Platinum (teal)" }]} />
      </CardContent>
    </Card>
  )
}

export function ByStatusBarChart({ derived, height, hideTitle, onTitleClick }: { derived: DerivedData; height?: number; hideTitle?: boolean; onTitleClick?: () => void }) {
  const data = ["OPEN", "PRINTED", "VOID"].map((status) => {
    const s = derived.byStatus[status] || { count: 0, total: 0 }
    return { status, count: s.count, total: s.total, fill: STATUS_COLORS[status] || COLORS[0] }
  })
  const chart = (
    <>
      <BarChart data={data} margin={CHART_MARGIN}>
        <XAxis dataKey="status" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`} width={48} />
        <Tooltip
          cursor={false}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length || !label) return null
            const d = payload[0]?.payload as { count: number; total: number }
            return (
              <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
                <p className="font-medium mb-1">{label}</p>
                <p className="tabular-nums">Transactions: {d?.count ?? 0}</p>
                <p className="tabular-nums">Total: {formatCurrency(d?.total ?? 0)}</p>
              </div>
            )
          }}
        />
        <Bar dataKey="total" name="Total" radius={[4, 4, 0, 0]} activeBar={{ opacity: 1 }} cursor="default">
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </>
  )
  return (
    <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
      {!hideTitle && (
        <CardHeader className="pb-2">
          <CardTitle
            className="text-base flex items-center gap-2 cursor-pointer hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            onClick={onTitleClick}
            onKeyDown={(e) => e.key === "Enter" && onTitleClick?.()}
            role={onTitleClick ? "button" : undefined}
            tabIndex={onTitleClick ? 0 : undefined}
          >
            <BarChart3 className="h-4 w-4" />
            By status (count & total)
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 min-h-0 flex flex-col">
        {height != null ? (
          <div style={{ height }}><ResponsiveContainer width="100%" height={height}>{chart}</ResponsiveContainer></div>
        ) : (
          <ResponsiveChartContainer minHeight={CHART_HEIGHT}>{chart}</ResponsiveChartContainer>
        )}
        <ChartColorKey items={[{ color: STATUS_COLORS.OPEN, label: "OPEN (blue)" }, { color: STATUS_COLORS.PRINTED, label: "PRINTED (green)" }, { color: STATUS_COLORS.VOID, label: "VOID (grey)" }]} />
        <p className="text-xs text-muted-foreground text-center mt-1">Bars = total $ · Hover for transaction count</p>
      </CardContent>
    </Card>
  )
}

export function DailyTrendChart({ derived, height, hideTitle, onTitleClick }: { derived: DerivedData; height?: number; hideTitle?: boolean; onTitleClick?: () => void }) {
  const data = derived.dailySorted.map(([day, d]) => ({
    date: new Date(day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    total: d.total,
    count: d.count,
  }))
  if (data.length === 0) {
    return (
      <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Daily trend
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-sm min-h-[200px]">
          No data
        </CardContent>
      </Card>
    )
  }
  const chart = (
    <AreaChart data={data} margin={CHART_MARGIN}>
      <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
      <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} width={60} />
      <Tooltip cursor={false} content={<CustomTooltip />} />
      <Area type="monotone" dataKey="total" name="Total value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
      <Line type="monotone" dataKey="count" name="Transactions" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
    </AreaChart>
  )
  return (
    <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
      {!hideTitle && (
        <CardHeader className="pb-2">
          <CardTitle
            className="text-base flex items-center gap-2 cursor-pointer hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            onClick={onTitleClick}
            onKeyDown={(e) => e.key === "Enter" && onTitleClick?.()}
            role={onTitleClick ? "button" : undefined}
            tabIndex={onTitleClick ? 0 : undefined}
          >
            <Calendar className="h-4 w-4" />
            Daily trend
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 min-h-0 flex flex-col">
        {height != null ? (
          <div style={{ height }}><ResponsiveContainer width="100%" height={height}>{chart}</ResponsiveContainer></div>
        ) : (
          <ResponsiveChartContainer minHeight={CHART_HEIGHT}>{chart}</ResponsiveChartContainer>
        )}
        <ChartColorKey items={[{ color: "hsl(var(--primary))", label: "Total value (blue area)" }, { color: "#22c55e", label: "Transactions (green line)" }]} />
      </CardContent>
    </Card>
  )
}

export function TopCustomersChart({ derived, height, hideTitle, onTitleClick }: { derived: DerivedData; height?: number; hideTitle?: boolean; onTitleClick?: () => void }) {
  const data = derived.topCustomers.slice(0, 8).map((c) => ({ name: c.name.length > 20 ? c.name.slice(0, 18) + "…" : c.name, total: c.total }))
  if (data.length === 0) {
    return (
      <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Top customers
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-sm min-h-[200px]">
          No data
        </CardContent>
      </Card>
    )
  }
  return (
    <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
      {!hideTitle && (
        <CardHeader className="pb-2">
          <CardTitle
            className="text-base flex items-center gap-2 cursor-pointer hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            onClick={onTitleClick}
            onKeyDown={(e) => e.key === "Enter" && onTitleClick?.()}
            role={onTitleClick ? "button" : undefined}
            tabIndex={onTitleClick ? 0 : undefined}
          >
            <User className="h-4 w-4" />
            Top customers
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 min-h-0 flex flex-col">
        {height != null ? (
          <div style={{ height }}><ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 16, left: 8 }}>
              <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
              <Tooltip cursor={false} content={<CustomTooltip />} formatter={(v) => [formatCurrency(Number(v ?? 0))]} />
              <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} activeBar={{ opacity: 1 }} cursor="default" />
            </BarChart>
          </ResponsiveContainer></div>
        ) : (
          <ResponsiveChartContainer minHeight={CHART_HEIGHT}>
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 16, left: 8 }}>
              <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
              <Tooltip cursor={false} content={<CustomTooltip />} formatter={(v) => [formatCurrency(Number(v ?? 0))]} />
              <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} activeBar={{ opacity: 1 }} cursor="default" />
            </BarChart>
          </ResponsiveChartContainer>
        )}
        <ChartColorKey items={[{ color: "hsl(var(--primary))", label: "Total ($)" }]} />
      </CardContent>
    </Card>
  )
}

export function TypeStatusMatrix({ derived }: { derived: DerivedData }) {
  return (
    <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Grid3X3 className="h-4 w-4" />
          Type × Status
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="grid grid-cols-3 gap-2 text-xs">
          {derived.typeStatusMatrix.map(({ type, status, count, total }) => (
            <div
              key={`${type}-${status}`}
              className="rounded-lg bg-muted/60 dark:bg-muted/40 p-2 border border-border/50"
            >
              <div className="font-medium text-muted-foreground">{type} · {status}</div>
              <div className="tabular-nums font-semibold mt-0.5">{count} trans</div>
              <div className="tabular-nums text-muted-foreground">{formatCurrency(total)}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function ScrapVsMeltOverTimeChart({ derived, height, hideTitle, onTitleClick }: { derived: DerivedData; height?: number; hideTitle?: boolean; onTitleClick?: () => void }) {
  const data = derived.dailyByType
  if (!data.length) {
    return (
      <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
        {!hideTitle && <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4" /> SCRAP vs MELT over time</CardTitle></CardHeader>}
        <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-sm min-h-[200px]">No data</CardContent>
      </Card>
    )
  }
  const chart = (
    <AreaChart data={data} margin={CHART_MARGIN}>
      <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
      <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} width={60} />
      <Tooltip cursor={false} content={<CustomTooltip />} />
      <Area type="monotone" dataKey="scrapTotal" name="SCRAP" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
      <Area type="monotone" dataKey="meltTotal" name="MELT" stackId="1" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.5} />
    </AreaChart>
  )
  return (
    <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
      {!hideTitle && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 cursor-pointer hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded" onClick={onTitleClick} onKeyDown={(e) => e.key === "Enter" && onTitleClick?.()} role={onTitleClick ? "button" : undefined} tabIndex={onTitleClick ? 0 : undefined}>
            <Layers className="h-4 w-4" /> SCRAP vs MELT over time
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 min-h-0 flex flex-col">
        {height != null ? <div style={{ height }}><ResponsiveContainer width="100%" height={height}>{chart}</ResponsiveContainer></div> : <ResponsiveChartContainer minHeight={CHART_HEIGHT}>{chart}</ResponsiveChartContainer>}
        <ChartColorKey items={[{ color: "hsl(var(--primary))", label: "SCRAP (blue)" }, { color: "hsl(var(--destructive))", label: "MELT (red)" }]} />
      </CardContent>
    </Card>
  )
}

export function MetalMixOverTimeChart({ derived, height, hideTitle, onTitleClick }: { derived: DerivedData; height?: number; hideTitle?: boolean; onTitleClick?: () => void }) {
  const data = derived.dailyByMetal
  if (!data.length) {
    return (
      <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
        {!hideTitle && <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Coins className="h-4 w-4" /> Metal mix over time</CardTitle></CardHeader>}
        <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-sm min-h-[200px]">No data</CardContent>
      </Card>
    )
  }
  const chart = (
    <AreaChart data={data} margin={CHART_MARGIN}>
      <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
      <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} width={60} />
      <Tooltip cursor={false} content={<CustomTooltip />} />
      <Area type="monotone" dataKey="gold" name="Gold" stackId="1" stroke="#eab308" fill="#eab308" fillOpacity={0.6} />
      <Area type="monotone" dataKey="silver" name="Silver" stackId="1" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.5} />
      <Area type="monotone" dataKey="platinum" name="Platinum" stackId="1" stroke="#0d9488" fill="#0d9488" fillOpacity={0.5} />
    </AreaChart>
  )
  return (
    <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
      {!hideTitle && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 cursor-pointer hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded" onClick={onTitleClick} onKeyDown={(e) => e.key === "Enter" && onTitleClick?.()} role={onTitleClick ? "button" : undefined} tabIndex={onTitleClick ? 0 : undefined}>
            <Coins className="h-4 w-4 text-amber-600" /> Metal mix over time
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 min-h-0 flex flex-col">
        {height != null ? <div style={{ height }}><ResponsiveContainer width="100%" height={height}>{chart}</ResponsiveContainer></div> : <ResponsiveChartContainer minHeight={CHART_HEIGHT}>{chart}</ResponsiveChartContainer>}
        <ChartColorKey items={[{ color: "#eab308", label: "Gold (yellow)" }, { color: "#94a3b8", label: "Silver (grey)" }, { color: METAL_COLORS.PLATINUM, label: "Platinum (teal)" }]} />
      </CardContent>
    </Card>
  )
}

export function TransactionSizeDistributionChart({ derived, height, hideTitle, onTitleClick }: { derived: DerivedData; height?: number; hideTitle?: boolean; onTitleClick?: () => void }) {
  const data = derived.sizeBuckets
  const chart = (
    <BarChart data={data} margin={CHART_MARGIN}>
      <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
      <Tooltip cursor={false} formatter={(v) => [Number(v ?? 0)]} />
      <Bar dataKey="count" name="Transactions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} activeBar={{ opacity: 1 }} cursor="default" />
    </BarChart>
  )
  return (
    <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
      {!hideTitle && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 cursor-pointer hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded" onClick={onTitleClick} onKeyDown={(e) => e.key === "Enter" && onTitleClick?.()} role={onTitleClick ? "button" : undefined} tabIndex={onTitleClick ? 0 : undefined}>
            <PieChartIcon className="h-4 w-4" /> Transaction size distribution
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 min-h-0 flex flex-col">
        {height != null ? <div style={{ height }}><ResponsiveContainer width="100%" height={height}>{chart}</ResponsiveContainer></div> : <ResponsiveChartContainer minHeight={CHART_HEIGHT}>{chart}</ResponsiveChartContainer>}
        <ChartColorKey items={[{ color: "hsl(var(--primary))", label: "Transactions (count per bucket)" }]} />
      </CardContent>
    </Card>
  )
}

export function RevenueByDayOfWeekChart({ derived, height, hideTitle, onTitleClick }: { derived: DerivedData; height?: number; hideTitle?: boolean; onTitleClick?: () => void }) {
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const
  const data = order.map((day) => ({ day, total: derived.byDayOfWeek[day] ?? 0 }))
  const chart = (
    <BarChart data={data} margin={CHART_MARGIN}>
      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
      <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} width={60} />
      <Tooltip cursor={false} formatter={(v) => [formatCurrency(Number(v ?? 0))]} />
      <Bar dataKey="total" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} activeBar={{ opacity: 1 }} cursor="default" />
    </BarChart>
  )
  return (
    <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
      {!hideTitle && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 cursor-pointer hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded" onClick={onTitleClick} onKeyDown={(e) => e.key === "Enter" && onTitleClick?.()} role={onTitleClick ? "button" : undefined} tabIndex={onTitleClick ? 0 : undefined}>
            <Calendar className="h-4 w-4" /> Revenue by day of week
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 min-h-0 flex flex-col">
        {height != null ? <div style={{ height }}><ResponsiveContainer width="100%" height={height}>{chart}</ResponsiveContainer></div> : <ResponsiveChartContainer minHeight={CHART_HEIGHT}>{chart}</ResponsiveChartContainer>}
        <ChartColorKey items={[{ color: "hsl(var(--primary))", label: "Revenue ($) by day" }]} />
      </CardContent>
    </Card>
  )
}

export function CumulativeRevenueChart({ derived, height, hideTitle, onTitleClick }: { derived: DerivedData; height?: number; hideTitle?: boolean; onTitleClick?: () => void }) {
  const data = derived.cumulativeDaily
  if (!data.length) {
    return (
      <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
        {!hideTitle && <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Cumulative revenue</CardTitle></CardHeader>}
        <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-sm min-h-[200px]">No data</CardContent>
      </Card>
    )
  }
  const chart = (
    <AreaChart data={data} margin={CHART_MARGIN}>
      <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
      <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} width={60} />
      <Tooltip cursor={false} content={<CustomTooltip />} />
      <Area type="monotone" dataKey="cumulative" name="Cumulative" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
    </AreaChart>
  )
  return (
    <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
      {!hideTitle && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 cursor-pointer hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded" onClick={onTitleClick} onKeyDown={(e) => e.key === "Enter" && onTitleClick?.()} role={onTitleClick ? "button" : undefined} tabIndex={onTitleClick ? 0 : undefined}>
            <TrendingUp className="h-4 w-4 text-primary" /> Cumulative revenue
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 min-h-0 flex flex-col">
        {height != null ? <div style={{ height }}><ResponsiveContainer width="100%" height={height}>{chart}</ResponsiveContainer></div> : <ResponsiveChartContainer minHeight={CHART_HEIGHT}>{chart}</ResponsiveChartContainer>}
        <ChartColorKey items={[{ color: "hsl(var(--primary))", label: "Cumulative revenue ($)" }]} />
      </CardContent>
    </Card>
  )
}

export function AvgTransactionByDayChart({ derived, height, hideTitle, onTitleClick }: { derived: DerivedData; height?: number; hideTitle?: boolean; onTitleClick?: () => void }) {
  const data = derived.avgByDay
  if (!data.length) {
    return (
      <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
        {!hideTitle && <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Avg transaction by day</CardTitle></CardHeader>}
        <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-sm min-h-[200px]">No data</CardContent>
      </Card>
    )
  }
  const chart = (
    <LineChart data={data} margin={CHART_MARGIN}>
      <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
      <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} width={60} />
      <Tooltip cursor={false} content={<CustomTooltip />} />
      <Line type="monotone" dataKey="avg" name="Avg value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
    </LineChart>
  )
  return (
    <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
      {!hideTitle && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 cursor-pointer hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded" onClick={onTitleClick} onKeyDown={(e) => e.key === "Enter" && onTitleClick?.()} role={onTitleClick ? "button" : undefined} tabIndex={onTitleClick ? 0 : undefined}>
            <DollarSign className="h-4 w-4" /> Avg transaction by day
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 min-h-0 flex flex-col">
        {height != null ? <div style={{ height }}><ResponsiveContainer width="100%" height={height}>{chart}</ResponsiveContainer></div> : <ResponsiveChartContainer minHeight={CHART_HEIGHT}>{chart}</ResponsiveChartContainer>}
        <ChartColorKey items={[{ color: "hsl(var(--primary))", label: "Avg transaction value ($)" }]} />
      </CardContent>
    </Card>
  )
}

export function TopCustomersByCountChart({ derived, height, hideTitle, onTitleClick }: { derived: DerivedData; height?: number; hideTitle?: boolean; onTitleClick?: () => void }) {
  const data = derived.topCustomersByCount.slice(0, 8).map((c) => ({ name: c.name.length > 20 ? c.name.slice(0, 18) + "…" : c.name, count: c.count }))
  if (data.length === 0) {
    return (
      <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
        {!hideTitle && <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Top customers by visit count</CardTitle></CardHeader>}
        <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-sm min-h-[200px]">No data</CardContent>
      </Card>
    )
  }
  const chart = (
    <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 16, left: 8 }}>
      <XAxis type="number" tick={{ fontSize: 11 }} />
      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
      <Tooltip cursor={false} formatter={(v) => [Number(v ?? 0), "Transactions"]} />
      <Bar dataKey="count" name="Transactions" fill="#a855f7" radius={[0, 4, 4, 0]} activeBar={{ opacity: 1 }} cursor="default" />
    </BarChart>
  )
  return (
    <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
      {!hideTitle && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 cursor-pointer hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded" onClick={onTitleClick} onKeyDown={(e) => e.key === "Enter" && onTitleClick?.()} role={onTitleClick ? "button" : undefined} tabIndex={onTitleClick ? 0 : undefined}>
            <User className="h-4 w-4" /> Top customers by visit count
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 min-h-0 flex flex-col">
        {height != null ? <div style={{ height }}><ResponsiveContainer width="100%" height={height}>{chart}</ResponsiveContainer></div> : <ResponsiveChartContainer minHeight={CHART_HEIGHT}>{chart}</ResponsiveChartContainer>}
        <ChartColorKey items={[{ color: "#a855f7", label: "Transaction count" }]} />
      </CardContent>
    </Card>
  )
}

export function StatusOverTimeChart({ derived, height, hideTitle, onTitleClick }: { derived: DerivedData; height?: number; hideTitle?: boolean; onTitleClick?: () => void }) {
  const data = derived.dailyByStatus
  if (!data.length) {
    return (
      <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
        {!hideTitle && <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Value by status over time</CardTitle></CardHeader>}
        <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-sm min-h-[200px]">No data</CardContent>
      </Card>
    )
  }
  const chart = (
    <AreaChart data={data} margin={CHART_MARGIN}>
      <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
      <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} width={60} />
      <Tooltip cursor={false} content={<CustomTooltip />} />
      <Area type="monotone" dataKey="OPEN" name="OPEN" stackId="1" stroke={STATUS_COLORS.OPEN} fill={STATUS_COLORS.OPEN} fillOpacity={0.5} />
      <Area type="monotone" dataKey="PRINTED" name="PRINTED" stackId="1" stroke={STATUS_COLORS.PRINTED} fill={STATUS_COLORS.PRINTED} fillOpacity={0.5} />
      <Area type="monotone" dataKey="VOID" name="VOID" stackId="1" stroke={STATUS_COLORS.VOID} fill={STATUS_COLORS.VOID} fillOpacity={0.5} />
    </AreaChart>
  )
  return (
    <Card className="border-0 shadow-lg overflow-visible h-full flex flex-col">
      {!hideTitle && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 cursor-pointer hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded" onClick={onTitleClick} onKeyDown={(e) => e.key === "Enter" && onTitleClick?.()} role={onTitleClick ? "button" : undefined} tabIndex={onTitleClick ? 0 : undefined}>
            <BarChart3 className="h-4 w-4" /> Value by status over time
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 min-h-0 flex flex-col">
        {height != null ? <div style={{ height }}><ResponsiveContainer width="100%" height={height}>{chart}</ResponsiveContainer></div> : <ResponsiveChartContainer minHeight={CHART_HEIGHT}>{chart}</ResponsiveChartContainer>}
        <ChartColorKey items={[{ color: STATUS_COLORS.OPEN, label: "OPEN (blue)" }, { color: STATUS_COLORS.PRINTED, label: "PRINTED (green)" }, { color: STATUS_COLORS.VOID, label: "VOID (grey)" }]} />
      </CardContent>
    </Card>
  )
}
