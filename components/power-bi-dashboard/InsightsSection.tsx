"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Lightbulb, Target } from "lucide-react"
import { formatCurrency } from "./utils"
import type { DerivedData } from "./types"

type Summary = {
  transactionCount: number
  grandTotal: number
  byType: { SCRAP: { count: number; total: number }; MELT: { count: number; total: number } }
  byMetal: { GOLD: number; SILVER: number; PLATINUM: number }
}

export function InsightsSection({ summary, derived }: { summary: Summary; derived: DerivedData }) {
  const scrapPct = summary.grandTotal > 0 ? (summary.byType.SCRAP.total / summary.grandTotal) * 100 : 0
  const meltPct = summary.grandTotal > 0 ? (summary.byType.MELT.total / summary.grandTotal) * 100 : 0
  const goldPct = summary.grandTotal > 0 ? ((summary.byMetal.GOLD || 0) / summary.grandTotal) * 100 : 0
  const silverPct = summary.grandTotal > 0 ? ((summary.byMetal.SILVER || 0) / summary.grandTotal) * 100 : 0
  const platinumPct = summary.grandTotal > 0 ? ((summary.byMetal.PLATINUM || 0) / summary.grandTotal) * 100 : 0

  const topStatus = (["OPEN", "PRINTED", "VOID"] as const).reduce(
    (a, s) => {
      const v = derived.byStatus[s]?.total ?? 0
      return v > a.total ? { status: s, total: v } : a
    },
    { status: "OPEN" as const, total: 0 }
  )

  const peakDay = derived.dailySorted.length
    ? derived.dailySorted.reduce(
        (best, [day, d]) => (d.total > best.total ? { day, ...d } : best),
        { day: "", count: 0, total: 0 }
      )
    : null

  const avgDaily = derived.dailySorted.length
    ? derived.dailySorted.reduce((s, [, d]) => s + d.total, 0) / derived.dailySorted.length
    : 0
  const predictedNext7 = avgDaily * 7
  const trendDirection = derived.dailySorted.length >= 2
    ? (derived.dailySorted[derived.dailySorted.length - 1][1].total -
        derived.dailySorted[0][1].total) >= 0
      ? "up"
      : "down"
    : "flat"

  const insights: string[] = []
  if (scrapPct >= 60) insights.push(`SCRAP dominates at ${scrapPct.toFixed(0)}% of total value`)
  else if (meltPct >= 60) insights.push(`MELT dominates at ${meltPct.toFixed(0)}% of total value`)
  else insights.push(`Type mix: SCRAP ${scrapPct.toFixed(0)}% · MELT ${meltPct.toFixed(0)}%`)
  if (goldPct >= 70) insights.push(`Gold represents ${goldPct.toFixed(0)}% of metal value`)
  else if (goldPct >= 50) insights.push(`Gold leads metals at ${goldPct.toFixed(0)}%`)
  if (topStatus.total > 0)
    insights.push(`${topStatus.status} has the highest total value (${formatCurrency(topStatus.total)})`)
  if (peakDay && peakDay.day)
    insights.push(`Peak day: ${new Date(peakDay.day).toLocaleDateString(undefined, { month: "short", day: "numeric" })} with ${formatCurrency(peakDay.total)}`)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background dark:from-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {insights.length === 0 ? (
              <li className="text-muted-foreground">No insights for this period</li>
            ) : (
              insights.map((text, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{text}</span>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-br from-emerald-500/5 via-background to-background dark:from-emerald-500/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-600" />
            Trend & prediction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {derived.dailySorted.length >= 2 ? (
            <>
              <div className="flex items-center gap-2">
                <TrendingUp className={`h-4 w-4 ${trendDirection === "up" ? "text-emerald-600" : trendDirection === "down" ? "text-rose-500" : "text-muted-foreground"}`} />
                <span>
                  Trend: <strong>{trendDirection === "up" ? "Upward" : trendDirection === "down" ? "Downward" : "Flat"}</strong> vs start of period
                </span>
              </div>
              <div className="rounded-lg bg-muted/50 dark:bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Simple 7-day forecast</p>
                <p className="font-semibold tabular-nums">If daily average continues: ~{formatCurrency(predictedNext7)} next 7 days</p>
                <p className="text-xs text-muted-foreground mt-1">Based on avg {formatCurrency(avgDaily)}/day in selected range</p>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Need at least 2 days of data for trend and prediction</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
