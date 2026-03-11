"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts"
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
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"
import { FileDown, Printer, Loader2, BarChart3, Calendar, Users, Coins, TrendingUp, Search, Layers, Filter, LayoutGrid, List, PieChart, Table, Gem, Save, X, ChevronUp, ChevronDown } from "lucide-react"
import { getCustomerDisplayName } from "@/lib/utils"
import { PurityBreakdownView } from "@/components/purity-breakdown-view"

type ReportData = {
  from: string
  to: string
  period: string
  summary: {
    transactionCount: number
    grandTotal: number
    avgTransaction?: number
    minTotal?: number
    maxTotal?: number
    byType: { SCRAP: { count: number; total: number }; MELT: { count: number; total: number } }
    byStatus?: { OPEN: { count: number; total: number }; PRINTED: { count: number; total: number }; VOID: { count: number; total: number } }
    byMetal: { GOLD: number; SILVER: number; PLATINUM: number }
  }
  transactions: Array<{
    id: string
    type: string
    status: string
    createdAt: string
    customer: { id?: string; fullName: string; isBusiness?: boolean; businessName?: string | null }
    total: number
    lineItems: Array<{ metalType: string; lineTotal: number; purityLabel?: string; dwt?: number }>
  }>
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { dateStyle: "short" })
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function getStatusBadgeClassName(status: string) {
  return status === "PRINTED"
    ? "bg-green-500 text-white border-green-600"
    : status === "VOID"
      ? "bg-red-500 text-white border-red-600"
      : status === "OPEN" || status === "APPROVED"
        ? "bg-blue-500 text-white border-blue-600"
        : "bg-yellow-500 text-white border-yellow-600"
}

function getStatusDisplayLabel(status: string) {
  return status === "OPEN" || status === "APPROVED" ? "Approved" : status === "VOID" ? "Cancelled" : status
}

type ViewMode = "full" | "simplified" | "summary" | "table" | "byCustomer" | "byDay" | "timeline" | "purity"
type SortKey = "date" | "customer" | "total" | "type" | "status"
type TableDensity = "normal" | "compact"
const SAVED_FILTERS_KEY = "reportSavedFilters"

export function ReportsClient() {
  const [period, setPeriod] = useState<"day" | "week" | "month" | "quarter" | "ytd">("week")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [customerIds, setCustomerIds] = useState<string[]>([])
  const [customerSearch, setCustomerSearch] = useState("")
  const [customers, setCustomers] = useState<Array<{ id: string; fullName: string }>>([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [metalFilter, setMetalFilter] = useState<string>("ALL")
  const [minAmount, setMinAmount] = useState("")
  const [maxAmount, setMaxAmount] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("full")
  const [data, setData] = useState<ReportData | null>(null)
  const [comparisonData, setComparisonData] = useState<ReportData | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [searchQuery, setSearchQuery] = useState("")
  const [tableDensity, setTableDensity] = useState<TableDensity>("normal")
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [savedFilters, setSavedFilters] = useState<Array<{ name: string; filters: Record<string, unknown> }>>([])
  const customerSearchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_FILTERS_KEY)
      if (raw) setSavedFilters(JSON.parse(raw))
    } catch (_) {}
  }, [])

  const setDatesFromPeriod = useCallback((p: "day" | "week" | "month" | "quarter" | "ytd") => {
    const today = new Date()
    const toStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    setTo(toStr)
    const fromDate = new Date(today)
    if (p === "day") setFrom(toStr)
    else if (p === "week") {
      fromDate.setDate(fromDate.getDate() - 7)
      setFrom(`${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}-${String(fromDate.getDate()).padStart(2, "0")}`)
    } else if (p === "month") {
      fromDate.setDate(fromDate.getDate() - 30)
      setFrom(`${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}-${String(fromDate.getDate()).padStart(2, "0")}`)
    } else if (p === "quarter") {
      const q = Math.floor(fromDate.getMonth() / 3) + 1
      fromDate.setMonth((q - 1) * 3)
      fromDate.setDate(1)
      setFrom(`${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}-01`)
    } else {
      fromDate.setMonth(0)
      fromDate.setDate(1)
      setFrom(`${fromDate.getFullYear()}-01-01`)
    }
  }, [])

  useEffect(() => {
    setDatesFromPeriod(period)
  }, [period, setDatesFromPeriod])

  useEffect(() => {
    const query = customerSearch.trim()
    const t = setTimeout(() => {
      setCustomersLoading(true)
      fetch(`/api/customers?q=${encodeURIComponent(query)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => (Array.isArray(list) ? setCustomers(list) : []))
        .catch(() => setCustomers([]))
        .finally(() => {
          setCustomersLoading(false)
          requestAnimationFrame(() => {
            customerSearchInputRef.current?.focus()
          })
        })
    }, 200)
    return () => clearTimeout(t)
  }, [customerSearch])

  const buildParams = useCallback((opts: { fromOverride?: string; toOverride?: string } = {}) => {
    const params = new URLSearchParams()
    params.set("period", period)
    const f = opts.fromOverride ?? from
    const t = opts.toOverride ?? to
    if (f) params.set("from", f)
    if (t) params.set("to", t)
    if (customerIds.length > 0) params.set("customerIds", customerIds.join(","))
    else if (customerId) params.set("customerId", customerId)
    if (typeFilter && typeFilter !== "ALL") params.set("type", typeFilter)
    if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter)
    if (metalFilter && metalFilter !== "ALL") params.set("metal", metalFilter)
    const min = minAmount.trim() ? Number(minAmount) : undefined
    const max = maxAmount.trim() ? Number(maxAmount) : undefined
    if (min != null && !Number.isNaN(min)) params.set("minTotal", String(min))
    if (max != null && !Number.isNaN(max)) params.set("maxTotal", String(max))
    return params
  }, [period, from, to, customerId, customerIds, typeFilter, statusFilter, metalFilter, minAmount, maxAmount])

  const loadReport = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/reports?${buildParams()}`, { credentials: "include" })
      const d = r.ok ? await r.json() : null
      if (!r.ok) throw new Error("Failed to load report")
      setData(d)
      if (showComparison && from && to && d) {
        const fromD = new Date(from)
        const toD = new Date(to)
        const days = Math.round((toD.getTime() - fromD.getTime()) / (1000 * 60 * 60 * 24))
        const prevTo = new Date(fromD)
        prevTo.setDate(prevTo.getDate() - 1)
        const prevFrom = new Date(prevTo)
        prevFrom.setDate(prevFrom.getDate() - days)
        const prevFromStr = prevFrom.toISOString().slice(0, 10)
        const prevToStr = prevTo.toISOString().slice(0, 10)
        try {
          const r2 = await fetch(`/api/reports?${buildParams({ fromOverride: prevFromStr, toOverride: prevToStr })}`, { credentials: "include" })
          setComparisonData(r2.ok ? await r2.json() : null)
        } catch {
          setComparisonData(null)
        }
      } else {
        setComparisonData(null)
      }
    } catch {
      setData(null)
      setComparisonData(null)
    } finally {
      setLoading(false)
    }
  }, [buildParams, from, to, showComparison])

  useEffect(() => {
    if (from && to) loadReport()
  }, [period, from, to, customerId, customerIds, typeFilter, statusFilter, metalFilter, minAmount, maxAmount])

  const filteredTransactions = data?.transactions.filter((t) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return t.customer.fullName.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
  }) ?? []
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let cmp = 0
    if (sortKey === "date") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    else if (sortKey === "customer") cmp = a.customer.fullName.localeCompare(b.customer.fullName)
    else if (sortKey === "total") cmp = a.total - b.total
    else if (sortKey === "type") cmp = a.type.localeCompare(b.type)
    else if (sortKey === "status") cmp = a.status.localeCompare(b.status)
    return sortDir === "asc" ? cmp : -cmp
  })

  const saveCurrentFilters = () => {
    const name = window.prompt("Name for this filter set")
    if (!name?.trim()) return
    const next = [...savedFilters, { name: name.trim(), filters: { period, from, to, customerId, customerIds, typeFilter, statusFilter, metalFilter, minAmount, maxAmount } }]
    setSavedFilters(next)
    try {
      localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(next))
    } catch (_) {}
  }
  const loadSavedFilter = (idx: number) => {
    const s = savedFilters[idx]?.filters as Record<string, unknown>
    if (!s) return
    if (s.period != null) setPeriod(s.period as typeof period)
    if (s.from != null) setFrom(String(s.from))
    if (s.to != null) setTo(String(s.to))
    if (s.customerId != null) setCustomerId(String(s.customerId))
    if (Array.isArray(s.customerIds)) setCustomerIds(s.customerIds as string[])
    if (s.typeFilter != null) setTypeFilter(String(s.typeFilter))
    if (s.statusFilter != null) setStatusFilter(String(s.statusFilter))
    if (s.metalFilter != null) setMetalFilter(String(s.metalFilter))
    if (s.minAmount != null) setMinAmount(String(s.minAmount))
    if (s.maxAmount != null) setMaxAmount(String(s.maxAmount))
  }

  const exportCsv = () => {
    if (!data?.transactions.length) return
    const headers = ["Date", "ID", "Type", "Status", "Customer", "Total"]
    const rows = data.transactions.map((t) => [
      formatDate(t.createdAt),
      t.id,
      t.type,
      t.status,
      getCustomerDisplayName(t.customer),
      t.total.toFixed(2),
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `report-${from}-to-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportExcel = () => {
    if (!data?.transactions.length) return
    const headers = ["Date", "ID", "Type", "Status", "Customer", "Total"]
    const rows = data.transactions.map((t) => [
      formatDate(t.createdAt),
      t.id,
      t.type,
      t.status,
      getCustomerDisplayName(t.customer),
      t.total.toFixed(2),
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n")
    const BOM = "\uFEFF"
    const blob = new Blob([BOM + csv], { type: "application/vnd.ms-excel;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `report-${from}-to-${to}.xls`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrintReport = () => {
    window.print()
  }

  return (
    <div className="reports-page min-h-full">
      <div className="space-y-10 print:hidden pb-12">
      <section className="dashboard-section">
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10 shadow-xl shadow-primary/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.15),transparent)] pointer-events-none" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            Report filters
          </CardTitle>
          <CardDescription className="text-muted-foreground/90">
            Choose date range, type, status, metal, and optional customer. Changing period updates the date range automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="flex flex-wrap gap-6 items-end">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Quick period</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as "day" | "week" | "month" | "quarter" | "ytd")}>
              <SelectTrigger className="w-[160px] h-11 rounded-xl border-primary/20 bg-background/80 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="quarter">Quarter to date</SelectItem>
                <SelectItem value="ytd">Year to date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> From
            </Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px] h-11 rounded-xl border-primary/20 bg-background/80" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> To
            </Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px] h-11 rounded-xl border-primary/20 bg-background/80" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Customer(s)
            </Label>
            <Select
              value={customerIds.length > 0 ? customerIds[customerIds.length - 1]! : (customerId || "all")}
              onValueChange={(v) => {
                if (v === "all") {
                  setCustomerIds([])
                  setCustomerId("")
                } else if (!customerIds.includes(v)) {
                  setCustomerIds((prev) => [...prev, v])
                  setCustomerId("")
                }
              }}
            >
              <SelectTrigger className="w-[220px] h-11 rounded-xl border-primary/20 bg-background/80 shadow-sm">
                <SelectValue placeholder={customerIds.length > 0 ? `${customerIds.length} selected` : "All customers"} />
              </SelectTrigger>
              <SelectContent className="rounded-xl min-w-[220px]">
                <div
                  className="p-1.5 pb-2 border-b border-border sticky top-0 bg-popover z-10"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      ref={customerSearchInputRef}
                      placeholder="Search by name or phone..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      onPointerDown={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="h-9 pl-8 pr-3 text-sm rounded-lg border-input bg-background"
                    />
                  </div>
                </div>
                <SelectItem value="all">All customers</SelectItem>
                {customersLoading && (
                  <SelectItem value="_loading" disabled className="pointer-events-none">
                    Searching...
                  </SelectItem>
                )}
                {!customersLoading && customerSearch && customers.length === 0 && (
                  <SelectItem value="_empty" disabled className="pointer-events-none">
                    No customers found
                  </SelectItem>
                )}
                {!customersLoading &&
                  customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName} {customerIds.includes(c.id) ? "✓" : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {customerIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {customerIds.map((id) => {
                  const name = customers.find((c) => c.id === id)?.fullName ?? id.slice(0, 8)
                  return (
                    <Badge key={id} variant="secondary" className="pr-1">
                      {name.length > 20 ? name.slice(0, 18) + "…" : name}
                      <button type="button" onClick={() => setCustomerIds((p) => p.filter((x) => x !== id))} className="ml-1 rounded hover:bg-muted-foreground/20" aria-label="Remove">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Type
            </Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] h-11 rounded-xl border-primary/20 bg-background/80 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="SCRAP">SCRAP</SelectItem>
                <SelectItem value="MELT">MELT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Status
            </Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-11 rounded-xl border-primary/20 bg-background/80 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="OPEN">Approved</SelectItem>
                <SelectItem value="PRINTED">PRINTED</SelectItem>
                <SelectItem value="VOID">VOID</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Gem className="h-3.5 w-3.5" /> Metal
            </Label>
            <Select value={metalFilter} onValueChange={setMetalFilter}>
              <SelectTrigger className="w-[140px] h-11 rounded-xl border-primary/20 bg-background/80 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">All metals</SelectItem>
                <SelectItem value="GOLD">Gold</SelectItem>
                <SelectItem value="SILVER">Silver</SelectItem>
                <SelectItem value="PLATINUM">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Min $</Label>
            <Input type="number" min={0} step={1} placeholder="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-[100px] h-11 rounded-xl border-primary/20 bg-background/80" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Max $</Label>
            <Input type="number" min={0} step={1} placeholder="Any" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="w-[100px] h-11 rounded-xl border-primary/20 bg-background/80" />
          </div>
          <Button onClick={loadReport} disabled={loading} className="h-11 px-6 rounded-xl bg-primary shadow-lg shadow-primary/25 hover:shadow-primary/30 transition-shadow">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
          </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" /> View
            </Label>
            <div className="flex rounded-xl border border-primary/20 bg-background/80 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("full")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === "full" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                title="Full view"
              >
                <LayoutGrid className="h-4 w-4" />
                Full
              </button>
              <button
                type="button"
                onClick={() => setViewMode("simplified")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === "simplified" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                title="Simplified view"
              >
                <List className="h-4 w-4" />
                Simplified
              </button>
              <button
                type="button"
                onClick={() => setViewMode("summary")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === "summary" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                title="Summary only"
              >
                <PieChart className="h-4 w-4" />
                Summary
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === "table" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                title="Table only"
              >
                <Table className="h-4 w-4" />
                Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode("byCustomer")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === "byCustomer" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                title="By customer"
              >
                <Users className="h-4 w-4" />
                By customer
              </button>
              <button
                type="button"
                onClick={() => setViewMode("byDay")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === "byDay" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                title="By day"
              >
                <Calendar className="h-4 w-4" />
                By day
              </button>
              <button
                type="button"
                onClick={() => setViewMode("timeline")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === "timeline" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                title="Timeline"
              >
                <BarChart3 className="h-4 w-4" />
                Timeline
              </button>
              <button
                type="button"
                onClick={() => setViewMode("purity")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === "purity" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                title="Metal by purity"
              >
                <Gem className="h-4 w-4" />
                Purity
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Saved filters</Label>
            <Button type="button" variant="outline" size="sm" onClick={saveCurrentFilters} className="rounded-lg h-9">
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save current
            </Button>
            {savedFilters.length > 0 && (
              <Select onValueChange={(v) => loadSavedFilter(Number(v))}>
                <SelectTrigger className="w-[180px] h-9 rounded-lg">
                  <SelectValue placeholder="Load saved..." />
                </SelectTrigger>
                <SelectContent>
                  {savedFilters.map((s, i) => (
                    <SelectItem key={i} value={String(i)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={showComparison} onChange={(e) => setShowComparison(e.target.checked)} className="rounded border-input" />
              Compare to previous period
            </label>
          </div>
        </CardContent>
      </Card>
      </section>

      {data && !loading && (
        <div className="rounded-lg bg-muted/30 border border-border/50 px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="font-medium text-muted-foreground">Quick stats:</span>
          <span className="tabular-nums"><strong>{data.summary.transactionCount}</strong> transactions</span>
          <span className="tabular-nums"><strong>{formatCurrency(data.summary.grandTotal)}</strong> total</span>
          {data.summary.avgTransaction != null && <span className="tabular-nums">Avg: {formatCurrency(data.summary.avgTransaction)}</span>}
          {data.summary.minTotal != null && data.summary.maxTotal != null && (
            <span className="tabular-nums text-muted-foreground">Range: {formatCurrency(data.summary.minTotal)} – {formatCurrency(data.summary.maxTotal)}</span>
          )}
        </div>
      )}

      {comparisonData && data && !loading && showComparison && (
        <Card className="border-2 border-primary/20 overflow-hidden">
          <CardHeader className="py-3 bg-muted/20">
            <CardTitle className="text-base">Comparison: current vs previous period</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground mb-1">Current period</p>
                <p className="tabular-nums">{data.summary.transactionCount} trans · {formatCurrency(data.summary.grandTotal)}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground mb-1">Previous period</p>
                <p className="tabular-nums">{comparisonData.summary.transactionCount} trans · {formatCurrency(comparisonData.summary.grandTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && !data && viewMode !== "purity" && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {viewMode === "purity" && <PurityBreakdownView />}

      {data && !loading && viewMode !== "purity" && (
        <>
          {(viewMode === "full" || viewMode === "simplified" || viewMode === "summary" || viewMode === "byCustomer" || viewMode === "byDay" || viewMode === "timeline") && (
          <section className="dashboard-section" aria-label="Key metrics">
            <h2 className="text-lg font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Key metrics</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/30 overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                    <p className="text-2xl font-bold tabular-nums">{data.summary.transactionCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-primary/5 overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Coins className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Grand total</p>
                    <p className="text-2xl font-bold tabular-nums">{formatCurrency(data.summary.grandTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/30 overflow-hidden">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">By type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between items-center rounded-lg bg-muted/50 px-3 py-2">
                  <span className="font-medium">SCRAP</span>
                  <span className="tabular-nums">{data.summary.byType.SCRAP.count} trans · {formatCurrency(data.summary.byType.SCRAP.total)}</span>
                </div>
                <div className="flex justify-between items-center rounded-lg bg-muted/50 px-3 py-2">
                  <span className="font-medium">MELT</span>
                  <span className="tabular-nums">{data.summary.byType.MELT.count} trans · {formatCurrency(data.summary.byType.MELT.total)}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/30 overflow-hidden">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">By metal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between items-center rounded-lg bg-amber-500/10 px-3 py-2 dark:bg-amber-500/20">
                  <span className="font-medium">Gold</span>
                  <span className="tabular-nums font-medium">{formatCurrency(data.summary.byMetal.GOLD || 0)}</span>
                </div>
                <div className="flex justify-between items-center rounded-lg bg-slate-400/10 px-3 py-2 dark:bg-slate-400/20">
                  <span className="font-medium">Silver</span>
                  <span className="tabular-nums font-medium">{formatCurrency(data.summary.byMetal.SILVER || 0)}</span>
                </div>
                <div className="flex justify-between items-center rounded-lg bg-slate-300/20 px-3 py-2 dark:bg-slate-300/30">
                  <span className="font-medium">Platinum</span>
                  <span className="tabular-nums font-medium">{formatCurrency(data.summary.byMetal.PLATINUM || 0)}</span>
                </div>
              </CardContent>
            </Card>
            {data.summary.avgTransaction != null && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/30 overflow-hidden">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground">Avg transaction</p>
                <p className="text-2xl font-bold tabular-nums">{formatCurrency(data.summary.avgTransaction)}</p>
              </CardContent>
            </Card>
            )}
            {data.summary.minTotal != null && data.summary.maxTotal != null && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/30 overflow-hidden">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground">Min / Max</p>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(data.summary.minTotal)} – {formatCurrency(data.summary.maxTotal)}</p>
              </CardContent>
            </Card>
            )}
            {data.summary.byStatus && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/30 overflow-hidden md:col-span-2">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">By status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between items-center rounded-lg bg-muted/50 px-3 py-2">
                  <span className="font-medium">Approved</span>
                  <span className="tabular-nums">{data.summary.byStatus.OPEN.count} trans · {formatCurrency(data.summary.byStatus.OPEN.total)}</span>
                </div>
                <div className="flex justify-between items-center rounded-lg bg-muted/50 px-3 py-2">
                  <span className="font-medium">PRINTED</span>
                  <span className="tabular-nums">{data.summary.byStatus.PRINTED.count} trans · {formatCurrency(data.summary.byStatus.PRINTED.total)}</span>
                </div>
                <div className="flex justify-between items-center rounded-lg bg-muted/50 px-3 py-2">
                  <span className="font-medium">VOID</span>
                  <span className="tabular-nums">{data.summary.byStatus.VOID.count} trans · {formatCurrency(data.summary.byStatus.VOID.total)}</span>
                </div>
              </CardContent>
            </Card>
            )}
          </div>
          </section>
          )}

          {viewMode === "full" && (
          <section className="dashboard-section" aria-label="Report at a glance and transaction list">
            {data.transactions.length > 0 && (() => {
              const byDay = data.transactions.reduce<Record<string, number>>((acc, t) => {
                const day = new Date(t.createdAt).toISOString().slice(0, 10)
                acc[day] = (acc[day] ?? 0) + t.total
                return acc
              }, {})
              const chartData = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0])).map(([date, total]) => ({ date: formatDate(date), total }))
              return (
                <div className="rounded-xl border border-border bg-muted/10 p-4 mb-4" style={{ height: 180 }}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Total by day</p>
                  <div className="chart-always-black bg-black rounded-lg overflow-hidden" style={{ height: 140 }}>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`} width={36} />
                        <Tooltip formatter={(v: number | undefined) => [formatCurrency(v ?? 0), "Total"]} contentStyle={{ fontSize: 12 }} />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            })()}
            <div className="rounded-xl border border-primary/15 bg-gradient-to-r from-muted/40 to-muted/20 px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-muted-foreground">Report at a glance</span>
              <span className="text-sm tabular-nums">
                <strong className="text-foreground">{data.summary.transactionCount}</strong> transactions
                <span className="mx-2 text-muted-foreground">·</span>
                <strong className="text-foreground">{formatCurrency(data.summary.grandTotal)}</strong> total
                <span className="mx-2 text-muted-foreground">·</span>
                SCRAP: {data.summary.byType.SCRAP.count} ({formatCurrency(data.summary.byType.SCRAP.total)})
                <span className="mx-2 text-muted-foreground">·</span>
                MELT: {data.summary.byType.MELT.count} ({formatCurrency(data.summary.byType.MELT.total)})
              </span>
            </div>
            <h2 className="text-lg font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Transaction list</h2>
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b bg-muted/20">
                <div>
                  <CardTitle className="text-lg">Transactions</CardTitle>
                  <CardDescription>
                    {formatDate(data.from)} – {formatDate(data.to)}
                    {searchQuery && ` · "${searchQuery}" (${sortedTransactions.length} shown)`}
                  </CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search customer or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 w-[200px] h-9 rounded-lg" />
                  </div>
                  <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data.transactions.length} className="rounded-lg">
                    <FileDown className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportExcel} disabled={!data.transactions.length} className="rounded-lg">
                    <FileDown className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrintReport} disabled={!data.transactions.length} className="rounded-lg">
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {sortedTransactions.length === 0 ? (
                  <p className="text-muted-foreground py-12 text-center">No transactions in this range{searchQuery ? " matching search" : ""}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm table-fixed">
                      <colgroup>
                        <col style={{ width: "16.666%" }} />
                        <col style={{ width: "16.666%" }} />
                        <col style={{ width: "16.666%" }} />
                        <col style={{ width: "16.666%" }} />
                        <col style={{ width: "16.666%" }} />
                        <col style={{ width: "16.666%" }} />
                      </colgroup>
                      <thead>
                        <tr className="border-b bg-muted/30">
                          {(["date", "type", "status", "customer", "total"] as const).map((key) => (
                            <th key={key} className="text-center py-3 px-4">
                              <button type="button" onClick={() => { setSortKey(key); setSortDir((d) => (sortKey === key ? (d === "asc" ? "desc" : "asc") : "desc")) }} className="flex items-center justify-center gap-1 w-full font-medium hover:text-foreground">
                                {key === "date" ? "Date" : key === "customer" ? "Customer" : key === "total" ? "Total" : key.charAt(0).toUpperCase() + key.slice(1)}
                                {sortKey === key ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : null}
                              </button>
                            </th>
                          ))}
                          <th className="text-center py-3 px-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedTransactions.map((t) => (
                          <tr key={t.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedTransactionId(t.id)}>
                            <td className="py-2.5 px-4 text-center align-middle truncate" title={formatDate(t.createdAt)}>{formatDate(t.createdAt)}</td>
                            <td className="py-2.5 px-4 text-center align-middle">
                              <Badge variant={t.type === "SCRAP" ? "default" : "destructive"}>{t.type}</Badge>
                            </td>
                            <td className="py-2.5 px-4 text-center align-middle">
                              <Badge variant="outline" className={getStatusBadgeClassName(t.status)}>{getStatusDisplayLabel(t.status)}</Badge>
                            </td>
                            <td className="py-2.5 px-4 text-center align-middle truncate" title={getCustomerDisplayName(t.customer)}>{getCustomerDisplayName(t.customer)}</td>
                            <td className="py-2.5 px-4 text-center align-middle font-medium tabular-nums">{formatCurrency(t.total)}</td>
                            <td className="py-2.5 px-4 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                              <Link href={`/print/${t.id}`}>
                                <Button variant="ghost" size="sm">
                                  Print
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
          )}

          {viewMode === "simplified" && (
          <section className="dashboard-section" aria-label="Transactions (card view)">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wider">Transactions</h2>
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 w-[180px] h-9 rounded-lg" />
                </div>
                <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data.transactions.length} className="rounded-lg">
                  <FileDown className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrintReport} disabled={!data.transactions.length} className="rounded-lg">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
            {sortedTransactions.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center rounded-xl border border-dashed bg-muted/20">No transactions in this range{searchQuery ? " matching search" : ""}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedTransactions.map((t) => (
                  <Card key={t.id} className="border-2 border-border/60 hover:border-primary/30 hover:shadow-md transition-all overflow-hidden bg-gradient-to-b from-card to-muted/20">
                    <CardContent className="p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs text-muted-foreground tabular-nums">{formatDate(t.createdAt)}</span>
                        <div className="flex gap-1">
                          <Badge variant={t.type === "SCRAP" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">{t.type}</Badge>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusBadgeClassName(t.status)}`}>{getStatusDisplayLabel(t.status)}</Badge>
                        </div>
                      </div>
                      <p className="font-semibold text-foreground truncate" title={getCustomerDisplayName(t.customer)}>{getCustomerDisplayName(t.customer)}</p>
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                        <span className="text-lg font-bold tabular-nums text-primary">{formatCurrency(t.total)}</span>
                        <Link href={`/print/${t.id}`}>
                          <Button variant="outline" size="sm" className="rounded-lg h-8">
                            <Printer className="h-3.5 w-3.5 mr-1.5" />
                            Print
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
          )}

          {viewMode === "table" && (
          <section className="dashboard-section" aria-label="Transaction data">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  Transactions · {formatDate(data.from)} – {formatDate(data.to)}
                  {searchQuery && ` · ${sortedTransactions.length} shown`}
                </p>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-7 h-8 w-[140px] text-xs rounded" />
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setTableDensity((d) => (d === "normal" ? "compact" : "normal"))}>
                  {tableDensity === "compact" ? "Normal density" : "Compact"}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data.transactions.length} className="rounded-lg h-8 text-xs">
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportExcel} disabled={!data.transactions.length} className="rounded-lg h-8 text-xs">
                  Excel
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrintReport} disabled={!data.transactions.length} className="rounded-lg h-8 text-xs">
                  Print
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-border overflow-hidden bg-background">
              {sortedTransactions.length === 0 ? (
                <p className="text-muted-foreground py-10 text-center text-sm">No transactions in this range{searchQuery ? " matching search" : ""}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className={`w-full text-sm table-fixed ${tableDensity === "compact" ? "text-xs" : ""}`}>
                    <colgroup>
                      <col style={{ width: "16.666%" }} />
                      <col style={{ width: "16.666%" }} />
                      <col style={{ width: "16.666%" }} />
                      <col style={{ width: "16.666%" }} />
                      <col style={{ width: "16.666%" }} />
                      <col style={{ width: "16.666%" }} />
                    </colgroup>
                    <thead>
                      <tr className="border-b bg-muted/30 text-muted-foreground font-medium">
                        <th className="text-center py-3 px-4">Date</th>
                        <th className="text-center py-3 px-4">Type</th>
                        <th className="text-center py-3 px-4">Status</th>
                        <th className="text-center py-3 px-4">Customer</th>
                        <th className="text-center py-3 px-4">Total</th>
                        <th className="text-center py-3 px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTransactions.map((t, i) => (
                        <tr
                          key={t.id}
                          className={`border-b hover:bg-muted/50 cursor-pointer ${i % 2 === 1 ? "bg-muted/10" : ""}`}
                          onClick={() => setSelectedTransactionId(t.id)}
                        >
                          <td className={`tabular-nums text-center align-middle truncate ${tableDensity === "compact" ? "py-1.5 px-3" : "py-2.5 px-4"}`} title={formatDate(t.createdAt)}>{formatDate(t.createdAt)}</td>
                          <td className={`text-center align-middle ${tableDensity === "compact" ? "py-1.5 px-3" : "py-2.5 px-4"}`}>
                            <Badge variant={t.type === "SCRAP" ? "default" : "destructive"}>{t.type}</Badge>
                          </td>
                          <td className={`text-center align-middle ${tableDensity === "compact" ? "py-1.5 px-3" : "py-2.5 px-4"}`}>
                            <Badge variant="outline" className={getStatusBadgeClassName(t.status)}>{getStatusDisplayLabel(t.status)}</Badge>
                          </td>
                          <td className={`text-center align-middle truncate ${tableDensity === "compact" ? "py-1.5 px-3" : "py-2.5 px-4"}`} title={getCustomerDisplayName(t.customer)}>{getCustomerDisplayName(t.customer)}</td>
                          <td className={`text-center font-medium tabular-nums align-middle ${tableDensity === "compact" ? "py-1.5 px-3" : "py-2.5 px-4"}`}>{formatCurrency(t.total)}</td>
                          <td className={`text-center align-middle ${tableDensity === "compact" ? "py-1.5 px-3" : "py-2.5 px-4"}`} onClick={(e) => e.stopPropagation()}>
                            <Link href={`/print/${t.id}`}>
                              <Button variant="ghost" size="sm" className={tableDensity === "compact" ? "h-6 text-xs" : ""}>
                                Print
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
          )}

          {viewMode === "byCustomer" && data && (
          <section className="dashboard-section" aria-label="By customer">
            <h2 className="text-lg font-semibold text-muted-foreground mb-4 uppercase tracking-wider">By customer</h2>
            {(() => {
              const byCustomer = sortedTransactions.reduce<Record<string, typeof sortedTransactions>>((acc, t) => {
                const name = getCustomerDisplayName(t.customer) || "Unknown"
                if (!acc[name]) acc[name] = []
                acc[name].push(t)
                return acc
              }, {})
              const entries = Object.entries(byCustomer).sort((a, b) => b[1].reduce((s, x) => s + x.total, 0) - a[1].reduce((s, x) => s + x.total, 0))
              return entries.length === 0 ? (
                <p className="text-muted-foreground py-12 text-center">No transactions</p>
              ) : (
                <div className="space-y-4">
                  {entries.map(([name, txns]) => {
                    const subtotal = txns.reduce((s, t) => s + t.total, 0)
                    return (
                      <Card key={name} className="overflow-hidden">
                        <CardHeader className="py-3 bg-muted/20 flex flex-row items-center justify-between">
                          <CardTitle className="text-base">{name}</CardTitle>
                          <span className="font-bold tabular-nums">{txns.length} trans · {formatCurrency(subtotal)}</span>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm table-fixed">
                              <colgroup>
                                <col style={{ width: "20%" }} />
                                <col style={{ width: "20%" }} />
                                <col style={{ width: "20%" }} />
                                <col style={{ width: "20%" }} />
                                <col style={{ width: "20%" }} />
                              </colgroup>
                              <thead>
                                <tr className="border-b bg-muted/40 text-muted-foreground font-medium">
                                  <th className="text-center py-2 px-3">Date</th>
                                  <th className="text-center py-2 px-3">Type</th>
                                  <th className="text-center py-2 px-3">Status</th>
                                  <th className="text-center py-2 px-3">Total</th>
                                  <th className="text-center py-2 px-3">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {txns.map((t) => (
                                  <tr key={t.id} className="border-b hover:bg-muted/30 last:border-b-0" onClick={() => setSelectedTransactionId(t.id)}>
                                    <td className="py-2 px-3 text-center tabular-nums align-middle">{formatDate(t.createdAt)}</td>
                                    <td className="py-2 px-3 text-center align-middle">
                                      <Badge variant={t.type === "SCRAP" ? "default" : "destructive"}>{t.type}</Badge>
                                    </td>
                                    <td className="py-2 px-3 text-center align-middle">
                                      <Badge variant="outline" className={getStatusBadgeClassName(t.status)}>{getStatusDisplayLabel(t.status)}</Badge>
                                    </td>
                                    <td className="py-2 px-3 text-center font-medium tabular-nums align-middle">{formatCurrency(t.total)}</td>
                                    <td className="py-2 px-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                                      <Link href={`/print/${t.id}`}>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs">Print</Button>
                                      </Link>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )
            })()}
          </section>
          )}

          {viewMode === "byDay" && data && (
          <section className="dashboard-section" aria-label="By day">
            <h2 className="text-lg font-semibold text-muted-foreground mb-4 uppercase tracking-wider">By day</h2>
            {(() => {
              const byDay = sortedTransactions.reduce<Record<string, typeof sortedTransactions>>((acc, t) => {
                const day = new Date(t.createdAt).toISOString().slice(0, 10)
                if (!acc[day]) acc[day] = []
                acc[day].push(t)
                return acc
              }, {})
              const entries = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0]))
              return entries.length === 0 ? (
                <p className="text-muted-foreground py-12 text-center">No transactions</p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-right py-3 px-4">Transactions</th>
                        <th className="text-right py-3 px-4">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map(([day, txns]) => (
                        <tr key={day} className="border-t hover:bg-muted/20">
                          <td className="py-2.5 px-4 font-medium">{formatDate(day)}</td>
                          <td className="py-2.5 px-4 text-right tabular-nums">{txns.length}</td>
                          <td className="py-2.5 px-4 text-right font-medium tabular-nums">{formatCurrency(txns.reduce((s, t) => s + t.total, 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </section>
          )}

          {viewMode === "timeline" && data && (
          <section className="dashboard-section" aria-label="Timeline">
            <h2 className="text-lg font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Timeline</h2>
            {(() => {
              const byDay = sortedTransactions.reduce<Record<string, typeof sortedTransactions>>((acc, t) => {
                const day = new Date(t.createdAt).toISOString().slice(0, 10)
                if (!acc[day]) acc[day] = []
                acc[day].push(t)
                return acc
              }, {})
              const entries = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0]))
              return entries.length === 0 ? (
                <p className="text-muted-foreground py-12 text-center">No transactions</p>
              ) : (
                <div className="space-y-6">
                  {entries.map(([day, txns]) => {
                    const dayTotal = txns.reduce((s, t) => s + t.total, 0)
                    return (
                      <div key={day} className="border-l-2 border-primary/30 pl-4">
                        <p className="text-sm font-semibold text-muted-foreground mb-2">{formatDate(day)} · {txns.length} trans · {formatCurrency(dayTotal)}</p>
                        <div className="rounded-lg border border-border overflow-hidden bg-background">
                          <table className="w-full text-sm table-fixed">
                            <colgroup>
                              <col style={{ width: "16.666%" }} />
                              <col style={{ width: "16.666%" }} />
                              <col style={{ width: "16.666%" }} />
                              <col style={{ width: "16.666%" }} />
                              <col style={{ width: "16.666%" }} />
                              <col style={{ width: "16.666%" }} />
                            </colgroup>
                            <thead>
                              <tr className="border-b bg-muted/30 text-muted-foreground font-medium">
                                <th className="text-center py-3 px-4">Date</th>
                                <th className="text-center py-3 px-4">Type</th>
                                <th className="text-center py-3 px-4">Status</th>
                                <th className="text-center py-3 px-4">Customer</th>
                                <th className="text-center py-3 px-4">Total</th>
                                <th className="text-center py-3 px-4">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {txns.map((t) => (
                                <tr key={t.id} className="border-b hover:bg-muted/50 cursor-pointer last:border-b-0" onClick={() => setSelectedTransactionId(t.id)}>
                                  <td className="py-2.5 px-4 text-center align-middle tabular-nums truncate" title={formatDate(t.createdAt)}>{formatDate(t.createdAt)}</td>
                                  <td className="py-2.5 px-4 text-center align-middle">
                                    <Badge variant={t.type === "SCRAP" ? "default" : "destructive"}>{t.type}</Badge>
                                  </td>
                                  <td className="py-2.5 px-4 text-center align-middle">
                                    <Badge variant="outline" className={getStatusBadgeClassName(t.status)}>{getStatusDisplayLabel(t.status)}</Badge>
                                  </td>
                                  <td className="py-2.5 px-4 text-center align-middle truncate" title={getCustomerDisplayName(t.customer)}>{getCustomerDisplayName(t.customer)}</td>
                                  <td className="py-2.5 px-4 text-center align-middle font-medium tabular-nums">{formatCurrency(t.total)}</td>
                                  <td className="py-2.5 px-4 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                                    <Link href={`/print/${t.id}`}>
                                      <Button variant="ghost" size="sm">Print</Button>
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </section>
          )}

          <Dialog open={!!selectedTransactionId} onOpenChange={(open) => !open && setSelectedTransactionId(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Transaction detail</DialogTitle>
              </DialogHeader>
              {selectedTransactionId && data && (() => {
                const t = data.transactions.find((x) => x.id === selectedTransactionId)
                if (!t) return <p className="text-muted-foreground">Not found</p>
                return (
                  <div className="space-y-3 text-sm">
                    <p><span className="text-muted-foreground">Date:</span> {formatDate(t.createdAt)}</p>
                    <p><span className="text-muted-foreground">Customer:</span> {getCustomerDisplayName(t.customer)}</p>
                    <p><span className="text-muted-foreground">Type:</span> <Badge variant={t.type === "SCRAP" ? "default" : "destructive"}>{t.type}</Badge></p>
                    <p><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={getStatusBadgeClassName(t.status)}>{getStatusDisplayLabel(t.status)}</Badge></p>
                    <p><span className="text-muted-foreground">Total:</span> <strong>{formatCurrency(t.total)}</strong></p>
                    {t.lineItems?.length > 0 && (
                      <div>
                        <p className="text-muted-foreground mb-1">Line items</p>
                        <ul className="space-y-1 rounded-lg bg-muted/30 p-2">
                          {t.lineItems.map((item, i) => (
                            <li key={i} className="flex justify-between">
                              <span>{item.metalType} {item.purityLabel ?? ""}</span>
                              <span className="tabular-nums">{formatCurrency(item.lineTotal)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="pt-2">
                      <Link href={`/print/${t.id}`}>
                        <Button variant="outline" size="sm">Open print view</Button>
                      </Link>
                    </div>
                  </div>
                )
              })()}
            </DialogContent>
          </Dialog>
        </>
      )}
      </div>
      {data && !loading && (
        <div id="report-print-area" className="hidden print:block p-8 print:min-h-0">
          <h1 className="text-2xl font-bold mb-4">Transaction Report</h1>
          <p className="text-muted-foreground mb-6">
            {formatDate(data.from)} – {formatDate(data.to)}
          </p>
          <p className="mb-2">Total transactions: {data.summary.transactionCount}</p>
          <p className="mb-2">Grand total: {formatCurrency(data.summary.grandTotal)}</p>
          {data.summary.avgTransaction != null && <p className="mb-2">Avg transaction: {formatCurrency(data.summary.avgTransaction)}</p>}
          {data.summary.byStatus && (
            <p className="mb-6 text-sm">By status: Approved {data.summary.byStatus.OPEN.count} · PRINTED {data.summary.byStatus.PRINTED.count} · VOID {data.summary.byStatus.VOID.count}</p>
          )}
          {!data.summary.byStatus && <p className="mb-6" />}
          <table className="w-full text-sm border-collapse table-fixed">
            <colgroup>
              <col style={{ width: "20%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "20%" }} />
            </colgroup>
            <thead>
              <tr className="border-b">
                <th className="text-center py-2 px-4">Date</th>
                <th className="text-center py-2 px-4">Type</th>
                <th className="text-center py-2 px-4">Status</th>
                <th className="text-center py-2 px-4">Customer</th>
                <th className="text-center py-2 px-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((t) => (
                <tr key={t.id} className="border-b">
                  <td className="py-2 px-4 text-center truncate">{formatDate(t.createdAt)}</td>
                  <td className="py-2 px-4 text-center">{t.type}</td>
                  <td className="py-2 px-4 text-center">
                  <Badge variant="outline" className={getStatusBadgeClassName(t.status)}>{getStatusDisplayLabel(t.status)}</Badge>
                </td>
                  <td className="py-2 px-4 text-center truncate">{getCustomerDisplayName(t.customer)}</td>
                  <td className="py-2 px-4 text-center tabular-nums">{formatCurrency(t.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
