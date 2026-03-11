"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Gem, Calendar, Layers, Percent, Users, Search } from "lucide-react"
import { getCustomerDisplayName } from "@/lib/utils"
import { GOLD_PURITIES, SILVER_PURITIES, PLATINUM_PURITIES } from "@/lib/pricing"
import Link from "next/link"

const SCRAP_PURITY_OPTIONS: Record<string, Array<{ label: string; percent: number }>> = {
  GOLD: GOLD_PURITIES.map((p) => ({ label: p, percent: Math.round((parseInt(p.replace("K", ""), 10) / 24) * 1000) / 10 })),
  SILVER: SILVER_PURITIES.map((p) => ({ label: p, percent: parseFloat(p) / 10 })),
  PLATINUM: PLATINUM_PURITIES.map((p) => ({ label: p, percent: parseFloat(p) / 10 })),
}

type CustomerOption = { id: string; fullName: string; isBusiness?: boolean; businessName?: string | null }

type PurityBreakdownData = {
  from: string
  to: string
  period: string
  type: string
  metal: string | null
  customerId: string | null
  purityPercent: number | null
  purityMin: number | null
  purityMax: number | null
  breakdown: Array<{
    metalType: string
    purityLabel: string
    purityPercentage: number | null
    lineItemCount: number
    totalDwt: number
    totalValue: number
  }>
  lineItems: Array<{
    id: string
    metalType: string
    purityLabel: string
    purityPercentage: number | null
    dwt: number
    lineTotal: number
    transactionId: string
    createdAt: string
    customer: { id: string; fullName: string; isBusiness?: boolean; businessName?: string | null }
  }>
  totalDwt: number
  totalValue: number
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { dateStyle: "short" })
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

export function PurityBreakdownView() {
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("week")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [typeFilter, setTypeFilter] = useState<"SCRAP" | "MELT">("SCRAP")
  const [metalFilter, setMetalFilter] = useState<string>("ALL")
  const [purityPercent, setPurityPercent] = useState("")
  const [purityMin, setPurityMin] = useState("")
  const [purityMax, setPurityMax] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const customerSearchInputRef = useRef<HTMLInputElement>(null)
  const [data, setData] = useState<PurityBreakdownData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const query = customerSearch.trim()
    const t = setTimeout(() => {
      setCustomersLoading(true)
      fetch(`/api/customers?q=${encodeURIComponent(query)}`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => (Array.isArray(list) ? setCustomers(list) : []))
        .catch(() => setCustomers([]))
        .finally(() => setCustomersLoading(false))
    }, 200)
    return () => clearTimeout(t)
  }, [customerSearch])

  const setDatesFromPeriod = useCallback((p: "day" | "week" | "month" | "year") => {
    const today = new Date()
    const toStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    setTo(toStr)
    const fromDate = new Date(today)
    fromDate.setHours(0, 0, 0, 0)
    if (p === "day") setFrom(toStr)
    else if (p === "week") {
      fromDate.setDate(fromDate.getDate() - 7)
      setFrom(fromDate.toISOString().slice(0, 10))
    } else if (p === "month") {
      fromDate.setMonth(fromDate.getMonth() - 1)
      setFrom(fromDate.toISOString().slice(0, 10))
    } else {
      fromDate.setFullYear(fromDate.getFullYear() - 1)
      setFrom(fromDate.toISOString().slice(0, 10))
    }
  }, [])

  useEffect(() => {
    setDatesFromPeriod(period)
  }, [period, setDatesFromPeriod])

  const showPurityDropdown = typeFilter === "SCRAP" && metalFilter !== "ALL" && (metalFilter === "GOLD" || metalFilter === "SILVER" || metalFilter === "PLATINUM")
  const scrapPurityOptions = metalFilter === "GOLD" || metalFilter === "SILVER" || metalFilter === "PLATINUM" ? SCRAP_PURITY_OPTIONS[metalFilter] ?? [] : []
  const selectedPurityOption = scrapPurityOptions.find((o) => String(o.percent) === purityPercent)

  useEffect(() => {
    if (typeFilter === "MELT") setPurityPercent("")
  }, [typeFilter])
  useEffect(() => {
    if (typeFilter === "SCRAP" && metalFilter !== "ALL") {
      const opts = SCRAP_PURITY_OPTIONS[metalFilter]
      if (opts?.length && purityPercent && !opts.some((o) => String(o.percent) === purityPercent)) setPurityPercent("")
    }
  }, [typeFilter, metalFilter, purityPercent])

  const loadReport = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("period", period)
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      params.set("type", typeFilter)
      if (metalFilter !== "ALL") params.set("metal", metalFilter)
      if (customerId.trim()) params.set("customerId", customerId.trim())
      const pct = purityPercent.trim() ? Number(purityPercent) : undefined
      if (pct != null && !Number.isNaN(pct)) params.set("purityPercent", String(pct))
      const min = purityMin.trim() ? Number(purityMin) : undefined
      const max = purityMax.trim() ? Number(purityMax) : undefined
      if (min != null && !Number.isNaN(min)) params.set("purityMin", String(min))
      if (max != null && !Number.isNaN(max)) params.set("purityMax", String(max))
      const r = await fetch(`/api/reports/purity?${params}`, { credentials: "include" })
      if (!r.ok) throw new Error("Failed to load")
      const d = await r.json()
      setData(d)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [period, from, to, typeFilter, metalFilter, customerId, purityPercent, purityMin, purityMax])

  useEffect(() => {
    if (from && to) loadReport()
  }, [from, to, typeFilter, metalFilter, customerId, loadReport])

  const hasPurityFilter = (purityPercent.trim() && !Number.isNaN(Number(purityPercent))) || (purityMin.trim() && !Number.isNaN(Number(purityMin))) || (purityMax.trim() && !Number.isNaN(Number(purityMax)))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gem className="h-5 w-5" />
            Metal by purity
          </CardTitle>
          <CardDescription>
            Breakdown by metal type and purity. Select type, metal, date range, and optionally filter by purity % to see matching line items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</Label>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "SCRAP" | "MELT")}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCRAP">Scrap</SelectItem>
                  <SelectItem value="MELT">Melt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Metal</Label>
              <Select value={metalFilter} onValueChange={setMetalFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="GOLD">Gold</SelectItem>
                  <SelectItem value="SILVER">Silver</SelectItem>
                  <SelectItem value="PLATINUM">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Customer
              </Label>
              <Select
                value={customerId || "all"}
                onValueChange={(v) => {
                  if (v === "all") {
                    setCustomerId("")
                    setSelectedCustomer(null)
                  } else {
                    setCustomerId(v)
                    const c = customers.find((x) => x.id === v) ?? (selectedCustomer?.id === v ? selectedCustomer : null)
                    setSelectedCustomer(c ?? null)
                  }
                }}
              >
                <SelectTrigger className="w-[220px] h-11 rounded-xl border-primary/20 bg-background/80 shadow-sm">
                  <SelectValue placeholder="All customers" />
                </SelectTrigger>
                <SelectContent className="rounded-xl min-w-[220px]">
                  <div
                    className="p-1.5 pb-2 border-b border-border sticky top-0 bg-popover z-10"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <div className="relative flex items-center gap-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none shrink-0" />
                      <Input
                        ref={customerSearchInputRef}
                        placeholder="Search by name or phone..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        onPointerDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="h-9 pl-8 pr-3 text-sm rounded-lg border-input bg-background flex-1"
                      />
                      {customersLoading && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </div>
                  <SelectItem value="all">All customers</SelectItem>
                  {!customersLoading && customerSearch && customers.length === 0 && (
                    <SelectItem value="_empty" disabled className="pointer-events-none">
                      No customers found
                    </SelectItem>
                  )}
                  {(selectedCustomer && !customers.some((c) => c.id === selectedCustomer.id)
                    ? [selectedCustomer, ...customers]
                    : customers
                  ).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {getCustomerDisplayName(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Period
              </Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as "day" | "week" | "month" | "year")}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[140px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[140px]" />
            </div>
            {showPurityDropdown ? (
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Gem className="h-3.5 w-3.5" /> Purity
                </Label>
                <Select
                  value={selectedPurityOption ? String(selectedPurityOption.percent) : "_any"}
                  onValueChange={(v) => setPurityPercent(v === "_any" ? "" : v)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_any">
                      <span className="text-muted-foreground">Any</span>
                    </SelectItem>
                    {scrapPurityOptions.map((opt) => (
                      <SelectItem key={opt.label} value={String(opt.percent)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Percent className="h-3.5 w-3.5" /> Purity %
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  placeholder="e.g. 92.5"
                  value={purityPercent}
                  onChange={(e) => setPurityPercent(e.target.value)}
                  className="w-[100px]"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Purity min</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                placeholder="Min %"
                value={purityMin}
                onChange={(e) => setPurityMin(e.target.value)}
                className="w-[90px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Purity max</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                placeholder="Max %"
                value={purityMax}
                onChange={(e) => setPurityMax(e.target.value)}
                className="w-[90px]"
              />
            </div>
            <Button onClick={loadReport} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && !data && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {data && !loading && (
        <>
          <div className="text-sm text-muted-foreground">
            {formatDate(data.from)} – {formatDate(data.to)} · {data.type}
            {data.metal ? ` · ${data.metal}` : ""}
            {data.customerId && (selectedCustomer || customers.find((c) => c.id === data.customerId)) && (
              <> · {getCustomerDisplayName(selectedCustomer ?? customers.find((c) => c.id === data.customerId) ?? { fullName: "", isBusiness: false, businessName: null })}</>
            )}
            {hasPurityFilter && " · filtered by purity"}
          </div>

          <Card className="border border-slate-200 shadow-sm bg-gradient-to-b from-slate-50/60 via-background to-background">
            <CardHeader className="pb-3 border-b border-slate-100/80">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-extrabold tracking-tight text-slate-900">
                <Layers className="h-5 w-5 text-slate-800" />
                <span>Breakdown by purity</span>
              </CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-200">
                Totals per metal and purity label. Overall totals at the bottom show the DWT and value for the current filters.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-5">
              {data.breakdown.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm font-medium">No line items in this range</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-card shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900/95 text-slate-50">
                      <tr className="border-b border-slate-800">
                        <th className="text-left py-3 px-4 font-extrabold text-[12px] uppercase tracking-[0.16em]">
                          Metal
                        </th>
                        <th className="text-left py-3 px-4 font-extrabold text-[12px] uppercase tracking-[0.16em]">
                          Purity
                        </th>
                        <th className="text-right py-3 px-4 font-extrabold text-[12px] uppercase tracking-[0.16em]">
                          Purity %
                        </th>
                        <th className="text-right py-3 px-4 font-extrabold text-[12px] uppercase tracking-[0.16em]">
                          Line items
                        </th>
                        <th className="text-right py-3 px-4 font-extrabold text-[12px] uppercase tracking-[0.16em]">
                          Total DWT
                        </th>
                        <th className="text-right py-3 px-4 font-extrabold text-[12px] uppercase tracking-[0.16em]">
                          Total value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.breakdown.map((row, i) => (
                        <tr
                          key={i}
                          className={`border-b border-slate-100 ${
                            i % 2 === 0 ? "bg-white" : "bg-slate-50/70"
                          } hover:bg-slate-100 transition-colors`}
                        >
                          <td className="py-2.5 px-4 font-bold text-slate-900">{row.metalType}</td>
                          <td className="py-2.5 px-4 font-bold text-slate-900">{row.purityLabel}</td>
                          <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-slate-800">
                            {row.purityPercentage != null ? `${row.purityPercentage}%` : "–"}
                          </td>
                          <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-slate-800">
                            {row.lineItemCount}
                          </td>
                          <td className="py-2.5 px-4 text-right tabular-nums font-extrabold text-red-500">
                            {row.totalDwt.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-4 text-right tabular-nums font-extrabold text-red-500">
                            {formatCurrency(row.totalValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {(data.breakdown.length > 0 || data.lineItems.length > 0) && (
                <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">
                    Overall totals for selected filters
                  </span>
                  <div className="flex flex-wrap justify-end gap-3 sm:gap-4">
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-lg px-3.5 py-1.5 shadow-sm">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-red-500 block">
                        Total DWT
                      </span>
                      <span className="tabular-nums font-black text-red-500 text-base">
                        {data.totalDwt.toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-lg px-3.5 py-1.5 shadow-sm">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-red-500 block">
                        Total value
                      </span>
                      <span className="tabular-nums font-black text-red-500 text-base">
                        {formatCurrency(data.totalValue)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {hasPurityFilter && data.lineItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Line items (purity filter)</CardTitle>
                <CardDescription>
                  All line items matching the purity filter.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-slate-900/95 text-slate-50 dark:bg-white dark:text-slate-900">
                      <tr className="border-b border-slate-800">
                        <th className="text-center py-2.5 px-2 font-extrabold text-[11px] md:text-[12px] uppercase tracking-[0.1em] text-red-500">
                          Date
                        </th>
                        <th className="text-center py-2.5 px-2 font-extrabold text-[11px] md:text-[12px] uppercase tracking-[0.1em] text-red-500">
                          Customer
                        </th>
                        <th className="text-center py-2.5 px-2 font-extrabold text-[11px] md:text-[12px] uppercase tracking-[0.1em] text-red-500">
                          Metal
                        </th>
                        <th className="text-center py-2.5 px-2 font-extrabold text-[11px] md:text-[12px] uppercase tracking-[0.1em] text-red-500">
                          Purity
                        </th>
                        <th className="text-center py-2.5 px-2 font-extrabold text-[11px] md:text-[12px] uppercase tracking-[0.1em] text-red-500 whitespace-nowrap" style={{ width: "1%" }}>
                          Purity %
                        </th>
                        <th className="text-center py-2.5 px-2 font-extrabold text-[11px] md:text-[12px] uppercase tracking-[0.1em] text-red-500">
                          DWT
                        </th>
                        <th className="text-center py-2.5 px-2 font-extrabold text-[11px] md:text-[12px] uppercase tracking-[0.1em] text-red-500">
                          Value
                        </th>
                        <th className="text-center py-2.5 px-2 font-extrabold text-[11px] md:text-[12px] uppercase tracking-[0.1em] text-red-500">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.lineItems.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-2 text-center">{formatDate(item.createdAt)}</td>
                          <td className="py-2 px-2 text-center min-w-0 max-w-[120px] truncate" title={getCustomerDisplayName(item.customer)}>{getCustomerDisplayName(item.customer)}</td>
                          <td className="py-2 px-2 text-center">{item.metalType}</td>
                          <td className="py-2 px-2 text-center">{item.purityLabel}</td>
                          <td className="py-2 px-2 text-center tabular-nums whitespace-nowrap" style={{ width: "1%" }}>{item.purityPercentage != null ? `${item.purityPercentage}%` : "–"}</td>
                          <td className="py-2 px-2 text-center tabular-nums">{item.dwt.toFixed(2)}</td>
                          <td className="py-2 px-2 text-center tabular-nums font-medium">{formatCurrency(item.lineTotal)}</td>
                          <td className="py-2 px-2 text-center">
                            <Link href={`/print/${item.transactionId}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-blue-500 text-red-500 hover:bg-blue-500 hover:text-white hover:border-blue-500"
                              >
                                Print
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
