"use client"

import { useMemo } from "react"
import { Carousel } from "@/components/carousel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Coins, Layers, BarChart3, PieChart, User, Calendar, Award, Hash } from "lucide-react"
import { getCustomerDisplayName } from "@/lib/utils"

type ReportData = {
  from: string
  to: string
  summary: {
    transactionCount: number
    grandTotal: number
    byType: { SCRAP: { count: number; total: number }; MELT: { count: number; total: number } }
    byMetal: { GOLD: number; SILVER: number; PLATINUM: number }
  }
  transactions: Array<{
    id: string
    type: string
    status: string
    createdAt: string
    customer: { fullName: string; isBusiness?: boolean; businessName?: string | null }
    total: number
  }>
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { dateStyle: "short" })
}

export function ReportsAnalyticsCarousel({ data }: { data: ReportData }) {
  const derived = useMemo(() => {
    const byStatus: Record<string, { count: number; total: number }> = {}
    const byCustomer: Record<string, number> = {}
    const byDate: Record<string, { count: number; total: number }> = {}
    let maxTotal = 0
    for (const t of data.transactions) {
      byStatus[t.status] = byStatus[t.status] || { count: 0, total: 0 }
      byStatus[t.status].count += 1
      byStatus[t.status].total += t.total
      const custName = getCustomerDisplayName(t.customer)
      byCustomer[custName] = (byCustomer[custName] || 0) + t.total
      const day = new Date(t.createdAt).toDateString()
      byDate[day] = byDate[day] || { count: 0, total: 0 }
      byDate[day].count += 1
      byDate[day].total += t.total
      if (t.total > maxTotal) maxTotal = t.total
    }
    const topCustomers = Object.entries(byCustomer)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
    const dailySorted = Object.entries(byDate).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime()).slice(-7)
    const avgTx = data.summary.transactionCount ? data.summary.grandTotal / data.summary.transactionCount : 0
    const scrapPct = data.summary.grandTotal
      ? (data.summary.byType.SCRAP.total / data.summary.grandTotal) * 100
      : 0
    const meltPct = data.summary.grandTotal ? (data.summary.byType.MELT.total / data.summary.grandTotal) * 100 : 0
    return {
      byStatus,
      topCustomers,
      dailySorted,
      maxTotal,
      avgTx,
      scrapPct,
      meltPct,
    }
  }, [data])

  const slides = useMemo(
    () => [
      // 1. Overview
      <div key="overview" className="w-full flex-shrink-0 h-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg bg-gradient-to-br from-background to-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-4xl font-bold tabular-nums">{data.summary.transactionCount}</p>
              <p className="text-sm text-muted-foreground">Transactions</p>
            </div>
            <div className="text-center pt-2 border-t">
              <p className="text-3xl font-bold text-primary tabular-nums">{formatCurrency(data.summary.grandTotal)}</p>
              <p className="text-sm text-muted-foreground">Grand total</p>
            </div>
          </CardContent>
        </Card>
      </div>,
      // 2. By Type (SCRAP vs MELT)
      <div key="by-type" className="w-full flex-shrink-0 h-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg bg-gradient-to-br from-background to-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5" />
              By type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">SCRAP</span>
                  <span className="tabular-nums">{data.summary.byType.SCRAP.count} · {formatCurrency(data.summary.byType.SCRAP.total)}</span>
                </div>
                <div className="h-4 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${derived.scrapPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">MELT</span>
                  <span className="tabular-nums">{data.summary.byType.MELT.count} · {formatCurrency(data.summary.byType.MELT.total)}</span>
                </div>
                <div className="h-4 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-destructive rounded-full" style={{ width: `${derived.meltPct}%` }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>,
      // 3. By Metal
      <div key="by-metal" className="w-full flex-shrink-0 h-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg bg-gradient-to-br from-background to-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-600" />
              By metal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center rounded-lg bg-amber-500/10 dark:bg-amber-500/20 px-4 py-3">
              <span className="font-medium">Gold</span>
              <span className="font-bold tabular-nums">{formatCurrency(data.summary.byMetal.GOLD || 0)}</span>
            </div>
            <div className="flex justify-between items-center rounded-lg bg-slate-400/10 dark:bg-slate-400/20 px-4 py-3">
              <span className="font-medium">Silver</span>
              <span className="font-bold tabular-nums">{formatCurrency(data.summary.byMetal.SILVER || 0)}</span>
            </div>
            <div className="flex justify-between items-center rounded-lg bg-slate-300/20 dark:bg-slate-300/30 px-4 py-3">
              <span className="font-medium">Platinum</span>
              <span className="font-bold tabular-nums">{formatCurrency(data.summary.byMetal.PLATINUM || 0)}</span>
            </div>
          </CardContent>
        </Card>
      </div>,
      // 4. By Status
      <div key="by-status" className="w-full flex-shrink-0 h-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg bg-gradient-to-br from-background to-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              By status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["OPEN", "PRINTED", "VOID"].map((status) => {
              const s = derived.byStatus[status] || { count: 0, total: 0 }
              return (
                <div key={status} className="flex justify-between items-center rounded-lg bg-muted/50 px-4 py-3">
                  <span className="font-medium">{status}</span>
                  <span className="tabular-nums text-sm">{s.count} trans · {formatCurrency(s.total)}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>,
      // 5. SCRAP only
      <div key="scrap-only" className="w-full flex-shrink-0 h-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">SCRAP only</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-center">
            <p className="text-3xl font-bold tabular-nums">{data.summary.byType.SCRAP.count}</p>
            <p className="text-sm text-muted-foreground">Transactions</p>
            <p className="text-2xl font-bold text-primary tabular-nums pt-2">{formatCurrency(data.summary.byType.SCRAP.total)}</p>
          </CardContent>
        </Card>
      </div>,
      // 6. MELT only
      <div key="melt-only" className="w-full flex-shrink-0 h-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg bg-gradient-to-br from-secondary/20 to-secondary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">MELT only</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-center">
            <p className="text-3xl font-bold tabular-nums">{data.summary.byType.MELT.count}</p>
            <p className="text-sm text-muted-foreground">Transactions</p>
            <p className="text-2xl font-bold tabular-nums pt-2">{formatCurrency(data.summary.byType.MELT.total)}</p>
          </CardContent>
        </Card>
      </div>,
      // 7. Top customers
      <div key="top-customers" className="w-full flex-shrink-0 h-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg bg-gradient-to-br from-background to-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Top customers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {derived.topCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              derived.topCustomers.map((c, i) => (
                <div key={c.name} className="flex justify-between items-center rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="truncate flex-1 mr-2">{i + 1}. {c.name}</span>
                  <span className="tabular-nums font-medium shrink-0">{formatCurrency(c.total)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>,
      // 8. Daily trend (last 7 days)
      <div key="daily" className="w-full flex-shrink-0 h-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg bg-gradient-to-br from-background to-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily trend
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {derived.dailySorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              derived.dailySorted.map(([day, d]) => (
                <div key={day} className="flex justify-between items-center rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span>{formatDate(day)}</span>
                  <span className="tabular-nums">{d.count} trans · {formatCurrency(d.total)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>,
      // 9. Average & max
      <div key="avg-max" className="w-full flex-shrink-0 h-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg bg-gradient-to-br from-background to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Averages & peak
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(derived.avgTx)}</p>
              <p className="text-sm text-muted-foreground">Avg per transaction</p>
            </div>
            <div className="text-center pt-2 border-t">
              <p className="text-2xl font-bold text-primary tabular-nums">{formatCurrency(derived.maxTotal)}</p>
              <p className="text-sm text-muted-foreground">Highest single transaction</p>
            </div>
          </CardContent>
        </Card>
      </div>,
      // 10. Type + Status matrix (SCRAP OPEN, SCRAP PRINTED, etc.)
      <div key="type-status" className="w-full flex-shrink-0 h-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg bg-gradient-to-br from-background to-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Type × Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(["SCRAP", "MELT"] as const).flatMap((type) =>
              (["OPEN", "PRINTED", "VOID"] as const).map((status) => {
                const count = data.transactions.filter((t) => t.type === type && t.status === status).length
                const total = data.transactions
                  .filter((t) => t.type === type && t.status === status)
                  .reduce((s, t) => s + t.total, 0)
                return (
                  <div key={`${type}-${status}`} className="flex justify-between items-center rounded-lg bg-muted/50 px-3 py-2">
                    <span className="font-medium">{type} · {status}</span>
                    <span className="tabular-nums">{count} · {formatCurrency(total)}</span>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>,
      // 11. Summary numbers (all in one)
      <div key="all-summary" className="w-full flex-shrink-0 h-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg bg-gradient-to-br from-background to-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              All summary
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xl font-bold tabular-nums">{data.summary.transactionCount}</p>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-lg font-bold tabular-nums">{formatCurrency(data.summary.grandTotal)}</p>
              <p className="text-xs text-muted-foreground">Grand total</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-lg font-bold tabular-nums">{formatCurrency(data.summary.byMetal.GOLD || 0)}</p>
              <p className="text-xs text-muted-foreground">Gold</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-lg font-bold tabular-nums">{formatCurrency(data.summary.byMetal.SILVER || 0)}</p>
              <p className="text-xs text-muted-foreground">Silver</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center col-span-2">
              <p className="text-lg font-bold tabular-nums">{formatCurrency(data.summary.byMetal.PLATINUM || 0)}</p>
              <p className="text-xs text-muted-foreground">Platinum</p>
            </div>
          </CardContent>
        </Card>
      </div>,
    ],
    [data, derived]
  )

  if (data.transactions.length === 0 && data.summary.transactionCount === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wider">Visual analytics</h2>
    <Card className="border-0 shadow-xl overflow-hidden">
      <CardHeader className="border-b bg-muted/20">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Slide through views
        </CardTitle>
        <p className="text-sm text-muted-foreground">Swipe or use arrows · {formatDate(data.from)} – {formatDate(data.to)}</p>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[320px] w-full relative">
          <Carousel
            showArrows={true}
            showIndicators={true}
            autoPlay={true}
            autoPlayInterval={4000}
            className="w-full h-full"
          >
            {slides}
          </Carousel>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}
