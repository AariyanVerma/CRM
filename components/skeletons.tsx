"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

/** Skeleton for dashboard content only (KPI + charts + table), no filter row. Use when FilterBar is already shown. */
export function DashboardContentSkeleton() {
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6 pb-8">
      <section className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border shadow-sm">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border shadow-sm">
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-[260px] w-full" /></CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
            <CardContent><Skeleton className="h-[260px] w-full" /></CardContent>
          </Card>
        </div>
      </section>
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b bg-muted/30 flex flex-row justify-between">
          <div>
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-9 w-24" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/** Skeleton for Analytics Dashboard / PowerBI: filter bar + KPI + charts + table */
export function AnalyticsDashboardSkeleton() {
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6 pb-8">
      <div className="flex flex-wrap gap-4 items-end">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-20" />
      </div>
      <section className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border shadow-sm">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border shadow-sm">
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-[260px] w-full" /></CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
            <CardContent><Skeleton className="h-[260px] w-full" /></CardContent>
          </Card>
        </div>
      </section>
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b bg-muted/30 flex flex-row justify-between">
          <div>
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-9 w-24" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/** Skeleton for Reports page */
export function ReportsPageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4 items-end">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Card className="border shadow-sm">
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/** Skeleton for dashboard ticker tape */
export function TickerTapeSkeleton() {
  return (
    <div className="w-full h-[86px] rounded-lg bg-muted/30 flex items-center justify-center overflow-hidden">
      <div className="flex gap-3 w-full px-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-12 flex-1 min-w-[80px]" />
        ))}
      </div>
    </div>
  )
}

/** Skeleton for transactions list (filters + table rows) – used as lazy-loading fallback for the whole page */
export function TransactionsListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-36 mb-2" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <Skeleton className="h-10 w-[220px]" />
          <Skeleton className="h-10 w-[120px]" />
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-20" />
        </div>
        <TransactionTableSkeleton />
      </CardContent>
    </Card>
  )
}

/** Table-only skeleton (header + rows). Use when filters are already visible and data is loading. */
export function TransactionTableSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="border-b bg-muted/20 p-3 flex gap-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="divide-y p-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="flex gap-4 py-3 px-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 flex-1 max-w-[120px]" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Skeleton for scan page content */
export function ScanPageSkeleton() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-6 p-6">
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-10 w-full max-w-[280px]" />
      <div className="flex gap-4 w-full max-w-md">
        <Skeleton className="h-24 flex-1 rounded-lg" />
        <Skeleton className="h-24 flex-1 rounded-lg" />
      </div>
    </div>
  )
}

/** Skeleton for print view (full page) */
export function PrintViewSkeleton() {
  return (
    <div className="min-h-screen bg-background p-8 space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-md" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
      <Skeleton className="h-32 w-full" />
    </div>
  )
}
