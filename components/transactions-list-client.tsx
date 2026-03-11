"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
import { Search, Loader2, Printer } from "lucide-react"
import { TransactionTableSkeleton } from "@/components/skeletons"
import { TransactionActions } from "@/components/transaction-actions"
import { useToast } from "@/hooks/use-toast"
import { getCustomerDisplayName } from "@/lib/utils"

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
  const [data, setData] = useState<{ transactions: Tx[]; total: number } | null>(null)
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
      .catch(() => setData({ transactions: [], total: 0 }))
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
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground font-medium">
                      {userRole === "ADMIN" && (
                        <th className="py-2 px-2 text-center">
                          <Checkbox
                            checked={data.transactions.length > 0 && selectedIds.size === data.transactions.length}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Select all"
                          />
                        </th>
                      )}
                      <th className="text-center py-2 px-3">Date</th>
                      <th className="text-center py-2 px-3">Type</th>
                      <th className="text-center py-2 px-3">Status</th>
                      {showCustomerColumn && <th className="text-center py-2 px-3">Customer</th>}
                      <th className="text-center py-2 px-3">Total</th>
                      <th className="text-center py-2 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((t) => (
                      <tr key={t.id} className="border-b hover:bg-muted/50">
                        {userRole === "ADMIN" && (
                          <td className="py-2 px-2 text-center align-middle">
                            <Checkbox
                              checked={selectedIds.has(t.id)}
                              onCheckedChange={() => toggleSelect(t.id)}
                              aria-label={`Select ${t.id}`}
                            />
                          </td>
                        )}
                        <td className="py-2 px-3 text-center tabular-nums align-middle">{new Date(t.createdAt).toLocaleString()}</td>
                        <td className="py-2 px-3 text-center align-middle">
                          <Badge variant={t.type === "SCRAP" ? "default" : "destructive"}>{t.type}</Badge>
                        </td>
                        <td className="py-2 px-3 text-center align-middle">
                          <Badge
                            variant="outline"
                            className={
                              t.status === "PRINTED"
                                ? "bg-green-500 text-white border-green-600"
                                : t.status === "VOID"
                                  ? "bg-red-500 text-white border-red-600"
                                  : t.status === "APPROVED" || t.status === "OPEN"
                                    ? "bg-blue-500 text-white border-blue-600"
                                    : t.status === "PENDING_APPROVAL"
                                      ? "bg-yellow-500 text-white border-yellow-600"
                                      : "bg-yellow-500 text-white border-yellow-600"
                            }
                          >
                            {t.status === "VOID" ? "Cancelled" : t.status === "PENDING_APPROVAL" ? "Pending approval" : (t.status === "APPROVED" || t.status === "OPEN") ? "Approved" : t.status}
                          </Badge>
                        </td>
                        {showCustomerColumn && (
                          <td className="py-2 px-3 text-center align-middle truncate" title={getCustomerDisplayName(t.customer)}>
                            <Link href={`/customers/${t.customer.id}`} className="text-primary hover:underline inline-block truncate max-w-full">
                              {getCustomerDisplayName(t.customer)}
                            </Link>
                          </td>
                        )}
                        <td className="py-2 px-3 text-center font-medium tabular-nums align-middle">
                          {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(t.total)}
                        </td>
                        <td className="py-2 px-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
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
                                type: t.type as "SCRAP" | "MELT",
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
