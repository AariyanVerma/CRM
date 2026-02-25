"use client"

import { PowerBIDashboard } from "@/components/power-bi-dashboard"

export function AnalyticsDashboardClient() {
  return (
    <div className="analytics-dashboard flex-1 min-h-0 flex flex-col">
      <PowerBIDashboard />
    </div>
  )
}
