"use client"

import dynamic from "next/dynamic"
import { AnalyticsDashboardSkeleton } from "@/components/skeletons"

const AnalyticsDashboardClient = dynamic(
  () => import("@/components/analytics-dashboard-client").then((m) => ({ default: m.AnalyticsDashboardClient })),
  { ssr: false, loading: () => <div className="flex-1 min-h-0 flex flex-col px-4 py-6"><AnalyticsDashboardSkeleton /></div> }
)

export function AnalyticsDashboardLazy() {
  return <AnalyticsDashboardClient />
}
