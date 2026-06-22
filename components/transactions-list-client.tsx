"use client"

import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSocket } from "@/lib/socketClient"
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
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { Search, Loader2, Printer, CalendarDays, Layers, Sparkles, TrendingUp } from "lucide-react"
import { TransactionTableSkeleton } from "@/components/skeletons"
import { TransactionActions } from "@/components/transaction-actions"
import { useToast } from "@/hooks/use-toast"
import { getCustomerDisplayName } from "@/lib/utils"
import {
  formatCurrency,
  formatTransactionDateLabel,
  getTransactionDateKey,
  type DailyTransactionTotals,
  type TransactionTypeTotals,
} from "@/lib/transaction-totals"

type Tx = {
  id: string
  type: string
  status: string
  createdAt: string
  customer: { id: string; fullName: string; isBusiness?: boolean; businessName?: string | null }
  total: number
  lineItems: Array<{ id: string; lineTotal: number }>
  pendingApprovalRequestId?: string | null
}

type TransactionsSummary = {
  dailyTotals: DailyTransactionTotals[]
  filteredTotals: TransactionTypeTotals
  grandTotalAllTime: TransactionTypeTotals
}

type TransactionsResponse = {
  transactions: Tx[]
  total: number
  summary?: TransactionsSummary
}

interface TransactionsListClientProps {
  customerId?: string | null
  showCustomerColumn?: boolean
  userRole?: "ADMIN" | "STAFF"
}

export function TransactionsListClient({ customerId = null, showCustomerColumn = false, userRole = "ADMIN" }: TransactionsListClientProps) {
  const { toast } = useToast()
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [type, setType] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [data, setData] = useState<TransactionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q.trim()) params.set("q", q.trim())
    if (status) params.set("status", status)
    if (type) params.set("type", type)
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    if (customerId) params.set("customerId", customerId)
    params.set("limit", "50")
    fetch(`/api/transactions?${params}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setData({ transactions: [], total: 0, summary: undefined }))
      .finally(() => setLoading(false))
  }, [q, status, type, from, to, customerId])

  useEffect(() => {
    load()
  }, [load])

  const loadRef = useRef(load)
  loadRef.current = load
  useEffect(() => {
    if (typeof window === "undefined") return
    const socket = getSocket()
    const onApprovalOrChange = () => {
      loadRef.current()
    }
    socket.on("approval_status", onApprovalOrChange)
    socket.on("transaction_changed", onApprovalOrChange)
    return () => {
      socket.off("approval_status", onApprovalOrChange)
      socket.off("transaction_changed", onApprovalOrChange)
    }
  }, [])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    if (!data?.transactions.length) return
    if (selectedIds.size === data.transactions.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(data.transactions.map((t) => t.id)))
  }
  const bulkSetStatus = async (newStatus: "OPEN" | "PRINTED" | "VOID") => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    setBulkLoading(true)
    try {
      const res = await fetch("/api/transactions/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: newStatus }),
        credentials: "include",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Bulk update failed")
      }
      setSelectedIds(new Set())
      load()
      toast({ title: "Updated", description: `${ids.length} transaction(s) set to ${newStatus}`, variant: "success" })
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Bulk update failed", variant: "destructive" })
    } finally {
      setBulkLoading(false)
    }
  }
  const bulkPrint = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    if (ids.length === 1) {
      window.location.href = `/print/${ids[0]}`
    } else {
      window.location.href = `/print/batch?ids=${ids.join(",")}`
    }
  }

  const dailyTotalsByDate = useMemo(() => {
    const map = new Map<string, DailyTransactionTotals>()
    for (const day of data?.summary?.dailyTotals ?? []) {
      map.set(day.date, day)
    }
    return map
  }, [data?.summary?.dailyTotals])

  const groupedTransactions = useMemo(() => {
    if (!data?.transactions.length) return []

    const groups: Array<{ dateKey: string; transactions: Tx[] }> = []
    for (const transaction of data.transactions) {
      const dateKey = getTransactionDateKey(transaction.createdAt)
      const lastGroup = groups[groups.length - 1]
      if (!lastGroup || lastGroup.dateKey !== dateKey) {
        groups.push({ dateKey, transactions: [transaction] })
      } else {
        lastGroup.transactions.push(transaction)
      }
    }
    return groups
  }, [data?.transactions])

  const renderTypeChip = (label: string, amount: number, tone: "scrap" | "sale" | "melt") => (
    <div
      className={`inline-flex min-w-[7.5rem] flex-col rounded-lg border px-3 py-2 ${
        tone === "scrap"
          ? "border-blue-500/20 bg-blue-500/10"
          : tone === "sale"
            ? "border-violet-500/20 bg-violet-500/10"
            : "border-rose-500/20 bg-rose-500/10"
      }`}
    >
      <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
        tone === "scrap"
          ? "text-blue-700 dark:text-blue-300"
          : tone === "sale"
            ? "text-violet-700 dark:text-violet-300"
            : "text-rose-700 dark:text-rose-300"
      }`}>
        {label}
      </span>
      <span className="mt-0.5 text-sm font-bold tabular-nums text-foreground">{formatCurrency(amount)}</span>
    </div>
  )

  const renderGrandStatCard = (
    title: string,
    value: string,
    subtitle: string,
    icon: ReactNode,
    accent: "primary" | "scrap" | "sale" | "melt" | "neutral"
  ) => {
    const accentClasses = {
      primary: "border-primary/25 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent",
      scrap: "border-blue-500/25 bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent",
      sale: "border-violet-500/25 bg-gradient-to-br from-violet-500/15 via-violet-500/5 to-transparent",
      melt: "border-rose-500/25 bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent",
      neutral: "border-border bg-gradient-to-br from-muted/80 via-background to-transparent",
    }[accent]

    return (
      <div className={`rounded-2xl border p-4 shadow-sm ${accentClasses}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/80 text-primary shadow-sm">
            {icon}
          </div>
        </div>
      </div>
    )
  }

  const renderStatusBadge = (status: string) => (
    <Badge
      variant="outline"
      className={
        status === "PRINTED"
          ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300"
          : status === "VOID"
            ? "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-300"
            : status === "APPROVED" || status === "OPEN"
              ? "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300"
              : "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300"
      }
    >
      {status === "VOID" ? "Cancelled" : status === "PENDING_APPROVAL" ? "Pending approval" : (status === "APPROVED" || status === "OPEN") ? "Approved" : status}
    </Badge>
  )

  const renderTransactionRow = (t: Tx) => (
    <tr key={t.id} className="border-b border-border/60 transition-colors hover:bg-muted/35 last:border-b-0">
      {userRole === "ADMIN" && (
        <td className="py-3 px-2 text-center align-middle">
          <Checkbox
            checked={selectedIds.has(t.id)}
            onCheckedChange={() => toggleSelect(t.id)}
            aria-label={`Select ${t.id}`}
          />
        </td>
      )}
      <td className="py-3 px-3 text-center align-middle">
        <div className="font-medium tabular-nums text-foreground">{new Date(t.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
        <div className="text-[11px] text-muted-foreground tabular-nums">{new Date(t.createdAt).toLocaleDateString()}</div>
      </td>
      <td className="py-3 px-3 text-center align-middle">
        <Badge variant={t.type === "SCRAP" ? "default" : t.type === "SALE" ? "secondary" : "destructive"} className={`px-2.5 font-semibold ${t.type === "SALE" ? "bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-300" : ""}`}>{t.type}</Badge>
      </td>
      <td className="py-3 px-3 text-center align-middle">{renderStatusBadge(t.status)}</td>
      {showCustomerColumn && (
        <td className="py-3 px-3 text-center align-middle truncate" title={getCustomerDisplayName(t.customer)}>
          <Link href={`/customers/${t.customer.id}`} className="font-medium text-primary hover:underline inline-block truncate max-w-full">
            {getCustomerDisplayName(t.customer)}
          </Link>
        </td>
      )}
      <td className="py-3 px-3 text-center align-middle">
        <span className="inline-flex rounded-lg bg-muted/60 px-3 py-1.5 text-sm font-bold tabular-nums text-foreground">
          {formatCurrency(t.total)}
        </span>
      </td>
      <td className="py-3 px-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
        <span className="inline-flex items-center justify-center gap-1">
          {t.status === "PENDING_APPROVAL" && t.pendingApprovalRequestId ? (
            <Link href={`/dashboard/approvals/review/${t.pendingApprovalRequestId}`}>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                Review
              </Button>
            </Link>
          ) : (t.status === "APPROVED" || t.status === "OPEN" || t.status === "PRINTED") ? (
            <Link href={`/print/${t.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-blue-600 border border-blue-500/60 rounded-md hover:bg-blue-500 hover:text-white hover:border-blue-600 hover:opacity-95 transition-colors"
              >
                Print
              </Button>
            </Link>
          ) : null}
          <TransactionActions
            transaction={{
              id: t.id,
              type: t.type as "SCRAP" | "SALE" | "MELT",
              status: t.status as "OPEN" | "PRINTED" | "VOID" | "PENDING_APPROVAL" | "APPROVED",
              createdAt: new Date(t.createdAt),
              lineItems: t.lineItems,
              pendingApprovalRequestId: t.pendingApprovalRequestId ?? undefined,
            }}
            customerId={t.customer.id}
            userRole={userRole}
            onUpdate={load}
          />
        </span>
      </td>
    </tr>
  )

  const renderTableHead = () => (
    <thead>
      <tr className="border-b border-border/70 bg-muted/30 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {userRole === "ADMIN" && (
          <th className="py-3 px-2 text-center">
            <Checkbox
              checked={data!.transactions.length > 0 && selectedIds.size === data!.transactions.length}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all"
            />
          </th>
        )}
        <th className="text-center py-3 px-3">Time</th>
        <th className="text-center py-3 px-3">Type</th>
        <th className="text-center py-3 px-3">Status</th>
        {showCustomerColumn && <th className="text-center py-3 px-3">Customer</th>}
        <th className="text-center py-3 px-3">Total</th>
        <th className="text-center py-3 px-3">Action</th>
      </tr>
    </thead>
  )

  const renderDaySection = (dateKey: string, transactions: Tx[]) => {
    const dayTotals = dailyTotalsByDate.get(dateKey)

    return (
      <section
        key={dateKey}
        className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.03]"
      >
        <div className="flex flex-col gap-4 border-b border-border/70 bg-gradient-to-r from-primary/12 via-primary/5 to-transparent px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">{formatTransactionDateLabel(dateKey)}</h3>
              <p className="text-xs text-muted-foreground">
                {dayTotals?.count ?? transactions.length} transaction{(dayTotals?.count ?? transactions.length) === 1 ? "" : "s"} recorded
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {renderTypeChip("Scrap", dayTotals?.scrap ?? 0, "scrap")}
            {renderTypeChip("Sale", dayTotals?.sale ?? 0, "sale")}
            {renderTypeChip("Melt", dayTotals?.melt ?? 0, "melt")}
            <div className="inline-flex min-w-[8.5rem] flex-col rounded-xl border border-primary/30 bg-primary px-4 py-2.5 text-primary-foreground shadow-md shadow-primary/20">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/85">Day total</span>
              <span className="mt-0.5 text-xl font-bold tabular-nums">{formatCurrency(dayTotals?.total ?? 0)}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              {userRole === "ADMIN" && <col style={{ width: "8%" }} />}
              {[...Array(showCustomerColumn ? 6 : 5)].map((_, i) => {
                const dataCols = showCustomerColumn ? 6 : 5
                const pct = userRole === "ADMIN" ? (92 / dataCols).toFixed(2) : (100 / dataCols).toFixed(2)
                return <col key={i} style={{ width: `${pct}%` }} />
              })}
            </colgroup>
            {renderTableHead()}
            <tbody>{transactions.map(renderTransactionRow)}</tbody>
          </table>
        </div>
      </section>
    )
  }

  const renderTotalsFooter = (title: string, totals: TransactionTypeTotals, emphasize = false) => (
    <section
      className={`overflow-hidden rounded-2xl border shadow-sm ${
        emphasize
          ? "border-primary/25 bg-gradient-to-br from-primary/10 via-background to-background"
          : "border-border/80 bg-card"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
        {emphasize ? <Sparkles className="h-4 w-4 text-primary" /> : <TrendingUp className="h-4 w-4 text-muted-foreground" />}
        <h3 className={`text-sm font-semibold ${emphasize ? "text-primary" : "text-foreground"}`}>{title}</h3>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
        {renderGrandStatCard(
          "Scrap purchases",
          formatCurrency(totals.scrap),
          "Total paid for scrap tickets",
          <Layers className="h-4 w-4 text-blue-600" />,
          "scrap"
        )}
        {renderGrandStatCard(
          "Sale purchases",
          formatCurrency(totals.sale),
          "Total paid for sale tickets",
          <Layers className="h-4 w-4 text-violet-600" />,
          "sale"
        )}
        {renderGrandStatCard(
          "Melt purchases",
          formatCurrency(totals.melt),
          "Total paid for melt tickets",
          <Layers className="h-4 w-4 text-rose-600" />,
          "melt"
        )}
        {renderGrandStatCard(
          emphasize ? "All-time total" : "Filtered total",
          formatCurrency(totals.total),
          `${totals.count} transaction${totals.count === 1 ? "" : "s"}`,
          <TrendingUp className="h-4 w-4 text-primary" />,
          emphasize ? "primary" : "neutral"
        )}
        {renderGrandStatCard(
          "Average ticket",
          formatCurrency(totals.count > 0 ? totals.total / totals.count : 0),
          "Per transaction average",
          <CalendarDays className="h-4 w-4 text-muted-foreground" />,
          "neutral"
        )}
      </div>
    </section>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
        <CardDescription>Search and filter transactions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Transaction ID or customer name..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                className="pl-8 w-[220px]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="OPEN">Approved</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Pending approval</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PRINTED">PRINTED</SelectItem>
                <SelectItem value="VOID">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type || "all"} onValueChange={(v) => setType(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="SCRAP">SCRAP</SelectItem>
                <SelectItem value="SALE">SALE</SelectItem>
                <SelectItem value="MELT">MELT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!customerId && (
            <>
              <div className="space-y-2">
                <Label>From</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[140px]" />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[140px]" />
              </div>
            </>
          )}
          <Button onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
          </Button>
        </div>

        {loading && !data && <TransactionTableSkeleton />}

        {data && (
          <>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">{data.total} transaction(s)</p>
              {userRole === "ADMIN" && selectedIds.size > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{selectedIds.size} selected</span>
                  <Button variant="outline" size="sm" onClick={() => bulkSetStatus("PRINTED")} disabled={bulkLoading}>
                    Mark PRINTED
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => bulkSetStatus("VOID")} disabled={bulkLoading}>
                    Mark Cancelled
                  </Button>
                  <Button variant="outline" size="sm" onClick={bulkPrint}>
                    <Printer className="h-4 w-4 mr-1" />
                    Print selected
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                    Clear
                  </Button>
                </div>
              )}
            </div>
            {data.transactions.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center">No transactions match the filters</p>
            ) : (
              <div className="space-y-5">
                {groupedTransactions.map(({ dateKey, transactions }) => renderDaySection(dateKey, transactions))}
              </div>
            )}

            {data.summary && (
              <div className="space-y-4 border-t border-border/70 pt-5">
                {data.transactions.length > 0 &&
                  data.summary.filteredTotals.count !== data.summary.grandTotalAllTime.count &&
                  renderTotalsFooter("Filtered totals", data.summary.filteredTotals)}
                {renderTotalsFooter("All-time grand total", data.summary.grandTotalAllTime, true)}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
