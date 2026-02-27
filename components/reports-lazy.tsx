"use client"

import dynamic from "next/dynamic"
import { ReportsPageSkeleton } from "@/components/skeletons"

const ReportsClient = dynamic(
  () => import("@/components/reports-client").then((m) => ({ default: m.ReportsClient })),
  { ssr: false, loading: () => <div className="min-h-[400px] p-4"><ReportsPageSkeleton /></div> }
)

export function ReportsLazy() {
  return <ReportsClient />
}
