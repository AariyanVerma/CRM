"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { getSocket } from "@/lib/socketClient"
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, Loader2, User, FileText } from "lucide-react"
import Link from "next/link"
import { formatDecimal } from "@/lib/utils"

type ApprovalRequest = {
  id: string
  transactionId: string
  status: string
  createdAt: string
  requestedBy: { id: string; firstName: string | null; lastName: string | null; email: string }
  transaction: {
    id: string
    type: string
    customer: { id: string; fullName: string; businessName?: string | null; isBusiness?: boolean }
    lineItems: { metalType: string; purityLabel: string; dwt: number; lineTotal: number }[]
  }
}

export function ApprovalsClient({ adminId }: { adminId: string }) {
  const { toast } = useToast()
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

  useEffect(() => {
    const socket = getSocket()
    socket.emit("join_admin", { adminId })
    return () => {}
  }, [adminId])

  async function fetchRequests() {
    setLoading(true)
    try {
      const res = await fetch("/api/transactions/approval-requests?filter=pending", { credentials: "include" })
      const data = await (res.ok ? res.json() : [])
      setRequests(Array.isArray(data) ? data : [])
    } catch {
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  useEffect(() => {
    const socket = getSocket()
    const onNew = () => fetchRequests()
    socket.on("approval_request_new", onNew)
    return () => {
      socket.off("approval_request_new", onNew)
    }
  }, [])

  async function handleApprove(requestId: string) {
    setActingId(requestId)
    try {
      const res = await fetch(`/api/transactions/approval-requests/${requestId}/approve`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Approved", description: "Transaction approved. Staff can now print." })
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
      setExpandedId(null)
    } catch {
      toast({ title: "Error", description: "Failed to approve", variant: "destructive" })
    } finally {
      setActingId(null)
    }
  }

  async function handleDeny(requestId: string) {
    setActingId(requestId)
    try {
      const res = await fetch(`/api/transactions/approval-requests/${requestId}/deny`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Denied", description: "Transaction denied." })
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
      setExpandedId(null)
    } catch {
      toast({ title: "Error", description: "Failed to deny", variant: "destructive" })
    } finally {
      setActingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No pending approval requests</p>
          <p className="text-sm mt-1">When staff send transactions for approval, they will appear here.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        <strong>{requests.length}</strong> request{requests.length !== 1 ? "s" : ""} waiting for review. Open each one to approve or deny.
      </p>
      {requests.map((req) => {
        const isExpanded = expandedId === req.id
        const staffName = [req.requestedBy.firstName, req.requestedBy.lastName].filter(Boolean).join(" ") || req.requestedBy.email
        const total = req.transaction.lineItems.reduce((s, i) => s + i.lineTotal, 0)
        const totalDwt = req.transaction.lineItems.reduce((s, i) => s + i.dwt, 0)
        return (
          <Card key={req.id} className="overflow-hidden">
            <CardHeader
              className="cursor-pointer py-4"
              onClick={() => setExpandedId(isExpanded ? null : req.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{staffName}</span>
                  </div>
                  <span className="text-muted-foreground">—</span>
                  <span className="font-semibold">{req.transaction.type}</span>
                  <span className="text-muted-foreground text-sm">
                    {req.transaction.customer.isBusiness && req.transaction.customer.businessName
                      ? `Company: ${req.transaction.customer.businessName}`
                      : `Customer: ${req.transaction.customer.fullName}`}
                  </span>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">${formatDecimal(total)}</p>
                  <p className="text-muted-foreground">{formatDecimal(totalDwt)} DWT</p>
                </div>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="border-t bg-muted/30 pt-4 pb-4">
                <div className="space-y-3">
                  <div className="rounded-lg border bg-background p-3 text-sm">
                    <p className="font-medium mb-2">Line items</p>
                    <ul className="space-y-1">
                      {req.transaction.lineItems.map((item, i) => (
                        <li key={i} className="flex justify-between">
                          <span>{item.metalType} {item.purityLabel} — {formatDecimal(item.dwt)} DWT</span>
                          <span>${formatDecimal(item.lineTotal)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/dashboard/approvals/review/${req.id}`}>
                        <Button variant="outline" size="sm">Review</Button>
                      </Link>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={actingId !== null}
                      onClick={() => handleApprove(req.id)}
                    >
                      {actingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={actingId !== null}
                      onClick={() => handleDeny(req.id)}
                    >
                      {actingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                      Deny
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
