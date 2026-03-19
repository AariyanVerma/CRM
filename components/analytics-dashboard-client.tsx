"use client"

import { useState } from "react"
import { PowerBIDashboard } from "@/components/power-bi-dashboard"
import { PurityBreakdownView } from "@/components/purity-breakdown-view"
import { PercentageAnalyticsView } from "@/components/percentage-analytics-view"
import { Button } from "@/components/ui/button"
import { BarChart3, Gem, Percent } from "lucide-react"

export function AnalyticsDashboardClient() {
  const [tab, setTab] = useState<"analytics" | "purity" | "percentage">("analytics")
  return (
    <div className="analytics-dashboard flex-1 min-h-0 flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 shrink-0">
        <Button
          variant={tab === "analytics" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("analytics")}
          className="rounded-lg"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Analytics
        </Button>
        <Button
          variant={tab === "percentage" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("percentage")}
          className="rounded-lg"
        >
          <Percent className="h-4 w-4 mr-2" />
          Metal %
        </Button>
        <Button
          variant={tab === "purity" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("purity")}
          className="rounded-lg"
        >
          <Gem className="h-4 w-4 mr-2" />
          Metal by purity
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {tab === "analytics" && <PowerBIDashboard />}
        {tab === "percentage" && <PercentageAnalyticsView />}
        {tab === "purity" && <PurityBreakdownView />}
      </div>
    </div>
  )
}
