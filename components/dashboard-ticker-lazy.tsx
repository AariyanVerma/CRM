"use client"

import dynamic from "next/dynamic"
import { TickerTapeSkeleton } from "@/components/skeletons"

const TradingViewTickerTape = dynamic(
  () => import("@/components/trading-view-ticker-tape").then((m) => ({ default: m.TradingViewTickerTape })),
  { ssr: false, loading: () => <TickerTapeSkeleton /> }
)

export function DashboardTickerLazy() {
  return <TradingViewTickerTape />
}
