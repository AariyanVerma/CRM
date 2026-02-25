"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Coins, Receipt, DollarSign, Award } from "lucide-react"
import { formatCurrency } from "./utils"

type Summary = {
  transactionCount: number
  grandTotal: number
  byType: { SCRAP: { count: number; total: number }; MELT: { count: number; total: number } }
  byMetal: { GOLD: number; SILVER: number; PLATINUM: number }
}

type KPITilesProps = {
  summary: Summary
  avgTx: number
  maxTotal: number
}

const tileConfig = [
  { title: "Transactions", key: "count", icon: TrendingUp, className: "from-blue-500/10 to-blue-500/5 border-blue-500/20", iconClass: "text-blue-600" },
  { title: "Grand total", key: "grand", icon: Coins, className: "from-primary/10 to-primary/5 border-primary/20", iconClass: "text-primary" },
  { title: "Avg per transaction", key: "avg", icon: Receipt, className: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20", iconClass: "text-emerald-600" },
  { title: "Highest single", key: "max", icon: Award, className: "from-amber-500/10 to-amber-500/5 border-amber-500/20", iconClass: "text-amber-600" },
  { title: "SCRAP", key: "scrap", icon: DollarSign, className: "from-slate-500/10 to-slate-500/5 border-slate-500/20", iconClass: "text-slate-600" },
  { title: "MELT", key: "melt", icon: DollarSign, className: "from-purple-500/10 to-purple-500/5 border-purple-500/20", iconClass: "text-purple-600" },
]

export function KPITiles({ summary, avgTx, maxTotal }: KPITilesProps) {
  const values: Record<string, string> = {
    count: String(summary.transactionCount),
    grand: formatCurrency(summary.grandTotal),
    avg: formatCurrency(avgTx),
    max: formatCurrency(maxTotal),
    scrap: `${summary.byType.SCRAP.count} · ${formatCurrency(summary.byType.SCRAP.total)}`,
    melt: `${summary.byType.MELT.count} · ${formatCurrency(summary.byType.MELT.total)}`,
  }
  const subtitles: Record<string, string> = {
    count: "Count",
    grand: "Revenue",
    avg: "Average",
    max: "Peak transaction",
    scrap: "SCRAP total",
    melt: "MELT total",
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {tileConfig.map((t) => (
        <Card key={t.title} className={`border bg-gradient-to-br ${t.className} shadow-sm overflow-hidden`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{t.title}</p>
                <p className="text-lg font-bold tabular-nums mt-0.5 truncate" title={values[t.key]}>{values[t.key]}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{subtitles[t.key]}</p>
              </div>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/80 ${t.iconClass}`}>
                <t.icon className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
