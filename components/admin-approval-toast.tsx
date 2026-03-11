"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getSocket } from "@/lib/socketClient"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, Sparkles } from "lucide-react"

const CARD_STAGGER_MS = 70
const CARD_ACCENTS = [
  "from-sky-400 via-blue-500 to-indigo-500",
  "from-violet-400 via-fuchsia-500 to-pink-500",
  "from-emerald-400 via-teal-500 to-cyan-500",
]
const CARD_INNER_GLOW = [
  "inset 0 0 24px rgba(56,189,248,0.4), inset 0 0 48px rgba(59,130,235,0.25), inset 0 0 72px rgba(99,102,241,0.12)",
  "inset 0 0 24px rgba(192,132,252,0.4), inset 0 0 48px rgba(217,70,239,0.25), inset 0 0 72px rgba(236,72,153,0.12)",
  "inset 0 0 24px rgba(52,211,153,0.4), inset 0 0 48px rgba(20,184,166,0.25), inset 0 0 72px rgba(6,182,212,0.12)",
]

type PendingRequest = {
  id: string
  transactionId: string
  createdAt: string
  approvalGroupId?: string | null
  transaction: {
    type: string
    customer?: {
      fullName: string
      businessName?: string | null
      isBusiness?: boolean
    }
  }
  requestedBy: {
    firstName: string | null
    lastName: string | null
    email: string
  }
}

export function AdminApprovalToast({ adminId }: { adminId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [popupOpen, setPopupOpen] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [panelKey, setPanelKey] = useState(0)

  const fetchPending = useCallback(() => {
    return fetch("/api/transactions/approval-requests?filter=pending", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setPendingRequests(list)
        return list
      })
      .catch(() => [])
  }, [])

  const showPopupWithRequests = useCallback((requests: PendingRequest[]) => {
    if (requests.length === 0) return
    setPendingRequests(requests)
    setPanelKey((k) => k + 1)
    setPopupOpen(true)
  }, [])

  useEffect(() => {
    fetchPending().then((list) => {
      if (list.length > 0) showPopupWithRequests(list)
    })
  }, [fetchPending, showPopupWithRequests])

  useEffect(() => {
    const socket = getSocket()
    const joinAdmin = () => socket.emit("join_admin", { adminId })
    joinAdmin()
    socket.on("connect", joinAdmin)

    const onNew = () => {
      fetchPending().then((list) => {
        if (list.length > 0) {
          showPopupWithRequests(list)
          toast({
            variant: "approval",
            title: "New approval request",
            description: `${list.length} request(s) waiting for your review.`,
          })
        }
      })
    }
    socket.on("approval_request_new", onNew)

    return () => {
      socket.off("connect", joinAdmin)
      socket.off("approval_request_new", onNew)
    }
  }, [adminId, toast, fetchPending, showPopupWithRequests])

  const openRequest = (requestId: string) => {
    setPopupOpen(false)
    router.push(`/dashboard/approvals/review/${requestId}`)
  }

  const viewAll = () => {
    setPopupOpen(false)
    router.push("/dashboard/approvals")
  }

  const grouped = useMemo(() => {
    const byGroup = new Map<string, PendingRequest[]>()
    for (const req of pendingRequests) {
      const key = req.approvalGroupId ?? req.id
      if (!byGroup.has(key)) byGroup.set(key, [])
      byGroup.get(key)!.push(req)
    }
    return Array.from(byGroup.values()).sort(
      (a, b) => new Date(a[0].createdAt).getTime() - new Date(b[0].createdAt).getTime()
    )
  }, [pendingRequests])
  const totalGroups = grouped.length
  const totalRequests = pendingRequests.length
  const visibleGroups = grouped.slice(0, 4)
  const remaining = Math.max(totalRequests - visibleGroups.reduce((s, g) => s + g.length, 0), 0)

  return (
    <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
      <DialogContent
        className="p-0 gap-0 w-[min(100vw,440px)] max-w-[calc(100vw-2rem)] rounded-[28px] overflow-visible border-0 bg-transparent shadow-none"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Approval requests – {totalGroups} pending</DialogTitle>
        <div
          key={panelKey}
          className="animate-tech-panel-in relative rounded-[28px] bg-white px-5 pt-5 pb-5 shadow-[0_26px_80px_rgba(0,0,0,0.12)]"
        >
          <div className="relative flex items-center justify-between mb-4">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-black uppercase tracking-[0.2em] text-neutral-700">
                  Approval center
                </span>
                <span className="text-base font-black text-neutral-900">
                  {totalGroups === 0 ? "No pending approvals" : `${totalGroups} pending`}
                </span>
              </div>
              {totalGroups > 0 && (
                <div className="flex items-center gap-2 rounded-full bg-emerald-100 border-2 border-emerald-300 px-3 py-2 text-[12px] font-black text-emerald-800 shadow-[inset_0_0_16px_rgba(255,255,255,0.6),inset_0_0_24px_rgba(52,211,153,0.15)]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live queue
                </div>
              )}
            </div>

            {totalGroups > 0 && (
              <div className="relative mt-2 rounded-2xl bg-neutral-50 border-2 border-neutral-200 px-3 py-3">
                <div className="max-h-[260px] overflow-y-auto space-y-3 pr-1">
                  {visibleGroups.map((group, index) => {
                    const req = group[0]
                    const staffName =
                      [req.requestedBy.firstName, req.requestedBy.lastName].filter(Boolean).join(" ") ||
                      req.requestedBy.email
                    const typesInGroup = [...new Set(group.map((r) => r.transaction?.type).filter(Boolean))]
                    const hasScrapAndMelt = typesInGroup.includes("SCRAP") && typesInGroup.includes("MELT")
                    const typeLabel = hasScrapAndMelt ? "Scrap & Melt" : (req.transaction?.type ?? "Transaction")
                    const customer = req.transaction?.customer
                    const customerLabel = customer
                      ? customer.isBusiness && customer.businessName
                        ? `Company: ${customer.businessName}`
                        : `Customer: ${customer.fullName}`
                      : "—"
                    const contactSub =
                      customer?.isBusiness && customer.businessName
                        ? `Contact: ${customer.fullName}`
                        : null
                    const accent = CARD_ACCENTS[index % CARD_ACCENTS.length]
                    const innerGlow = CARD_INNER_GLOW[index % CARD_INNER_GLOW.length]

                    return (
                      <button
                        key={req.id}
                        type="button"
                        onClick={() => openRequest(req.id)}
                        className="group relative w-full text-left focus:outline-none"
                        style={{
                          animationDelay: `${index * CARD_STAGGER_MS}ms`,
                          animationFillMode: "backwards",
                        }}
                      >
                        <div
                          className={`animate-tech-card-in rounded-2xl bg-gradient-to-r ${accent} p-[2px] shadow-[0_8px_24px_rgba(0,0,0,0.1)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_32px_rgba(0,0,0,0.15)]`}
                        >
                          <div
                            className="flex items-center justify-between rounded-[14px] bg-white px-4 py-3.5 border border-neutral-100"
                            style={{ boxShadow: innerGlow }}
                          >
                            <div className="min-w-0">
                              <p className="text-[13px] font-extrabold text-neutral-500 truncate">
                                Requested by: <span className="font-black text-neutral-800">{staffName}</span>
                              </p>
                              <p className="mt-1 text-[13px] font-extrabold text-neutral-600 truncate">
                                {typeLabel}
                              </p>
                              <p className="mt-0.5 text-[13px] font-extrabold text-neutral-700 truncate">
                                {customerLabel}
                                {contactSub ? ` · ${contactSub}` : ""}
                              </p>
                            </div>
                            <div className="ml-4 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white font-black shadow-md group-hover:bg-neutral-800 group-hover:scale-105 transition-transform">
                              <ArrowUpRight className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="relative mt-5 flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPopupOpen(false)}
                className="h-10 px-4 text-[14px] font-black text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100"
              >
                Dismiss
              </Button>

              {totalGroups > 0 && (
                <div className="flex items-center gap-2">
                  {remaining > 0 && (
                    <span className="rounded-full bg-neutral-200 border-2 border-neutral-300 px-3 py-1.5 text-[12px] font-black text-neutral-800 shadow-[inset_0_0_14px_rgba(255,255,255,0.5),inset_0_0_20px_rgba(255,255,255,0.2)]">
                      +{remaining} more queued
                    </span>
                  )}
                  <Button
                    size="sm"
                    onClick={viewAll}
                    className="h-10 gap-2 rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-5 text-[14px] font-black text-white shadow-[inset_0_0_20px_rgba(255,255,255,0.25),inset_0_0_36px_rgba(255,255,255,0.1),0_10px_15px_-3px_rgba(59,130,246,0.3),0_4px_6px_-4px_rgba(59,130,246,0.2)] hover:shadow-[inset_0_0_20px_rgba(255,255,255,0.3),0_20px_25px_-5px_rgba(59,130,246,0.35)] transition-shadow border-0"
                  >
                    <Sparkles className="h-4 w-4" />
                    Open approvals
                  </Button>
                </div>
              )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
