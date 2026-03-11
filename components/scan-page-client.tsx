"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PricingTable } from "@/components/pricing-table"
import { ArrowLeft, Building2, User, Clock, Sparkles, Flame, TrendingUp, Coins, Scale, Send, CheckCircle2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Printer } from "lucide-react"
import { Carousel } from "@/components/carousel"
import { TradingViewTickerTape } from "@/components/trading-view-ticker-tape"
import { useSocketTransaction } from "@/hooks/use-socket-transaction"
import { formatDecimal, getCustomerDisplayName } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getSocket } from "@/lib/socketClient"

interface Customer {
  id: string
  fullName: string
  phoneNumber: string
  address: string
  isBusiness: boolean
  businessName: string | null
}

interface LineItem {
  id: string
  metalType: "GOLD" | "SILVER" | "PLATINUM"
  purityLabel: string
  dwt: number
  pricePerOz: number
  lineTotal: number
  purityPercentage?: number | null
}

interface Transaction {
  id: string | null
  type: "SCRAP" | "MELT"
  status: string
  goldSpot: number
  silverSpot: number
  platinumSpot: number
  lineItems: LineItem[]
}

export function ScanPageClient({
  customer,
  scrapTransaction,
  meltTransaction,
  userRole,
  userId,
  cardLocked = false,
}: {
  customer: Customer
  scrapTransaction: Transaction
  meltTransaction: Transaction
  userRole: "ADMIN" | "STAFF"
  userId: string
  cardLocked?: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const hasPushedHistoryRef = useRef(false)
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  const [scrapTx, setScrapTx] = useState<Transaction>(scrapTransaction)
  const [meltTx, setMeltTx] = useState<Transaction>(meltTransaction)
  const [scrapLineItems, setScrapLineItems] = useState<LineItem[]>(scrapTransaction.lineItems)
  const [meltLineItems, setMeltLineItems] = useState<LineItem[]>(meltTransaction.lineItems)

  type ApprovalStatus = "PENDING" | "APPROVED" | "DENIED" | null
  const [scrapApproval, setScrapApproval] = useState<{ status: ApprovalStatus; pendingAdminName: string | null }>({ status: null, pendingAdminName: null })
  const [meltApproval, setMeltApproval] = useState<{ status: ApprovalStatus; pendingAdminName: string | null }>({ status: null, pendingAdminName: null })
  const [adminPickerFor, setAdminPickerFor] = useState<"SCRAP" | "MELT" | null>(null)
  const [admins, setAdmins] = useState<{ id: string; email: string; firstName: string | null; lastName: string | null }[]>([])
  const [sendingRequest, setSendingRequest] = useState(false)
  const [approvalGroupId, setApprovalGroupId] = useState<string | null>(null)
  const [approvedModalFor, setApprovedModalFor] = useState<"SCRAP" | "MELT" | null>(null)
  const [approvedWasEdited, setApprovedWasEdited] = useState(false)
  const [deniedModalFor, setDeniedModalFor] = useState<"SCRAP" | "MELT" | null>(null)
  const [sentForApprovalBanner, setSentForApprovalBanner] = useState<{ show: boolean; adminName: string; sendBoth: boolean }>({ show: false, adminName: "", sendBoth: false })

  const fetchApprovalStatus = useCallback(async (transactionId: string) => {
    try {
      const res = await fetch(`/api/transactions/${transactionId}/approval-status`, { credentials: "include" })
      if (!res.ok) return
      const data = await res.json()
      const status = data.status as ApprovalStatus
      const pendingAdminName = data.request?.requestedToName ?? null
      if (transactionId === scrapTx.id) {
        setScrapApproval({ status, pendingAdminName })
      } else {
        setMeltApproval({ status, pendingAdminName })
      }
    } catch {}
  }, [scrapTx.id, meltTx.id])

  useEffect(() => {
    setMounted(true)
    setCurrentDate(new Date())
    const timer = setInterval(() => setCurrentDate(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (userRole !== "STAFF") return
    if (scrapTx.id) fetchApprovalStatus(scrapTx.id)
    if (meltTx.id) fetchApprovalStatus(meltTx.id)
  }, [userRole, scrapTx.id, meltTx.id, fetchApprovalStatus])

  useEffect(() => {
    if (userRole !== "STAFF") return
    const socket = getSocket()
    socket.emit("join_staff", { staffId: userId })
    const onApproval = (data: { transactionId?: string; status?: string; edited?: boolean }) => {
      if (!data?.transactionId || !data?.status) return
      if (data.transactionId === scrapTx.id) {
        setScrapApproval((prev) => ({ ...prev, status: data.status as ApprovalStatus }))
        if (data.status === "APPROVED") {
          setApprovedWasEdited(data.edited === true)
          setApprovedModalFor("SCRAP")
          if (data.edited && scrapTx.id) {
            fetch(`/api/transactions/${scrapTx.id}/line-items`, { credentials: "include" })
              .then((r) => r.ok ? r.json() : null)
              .then((json) => { if (json?.lineItems) setScrapLineItems(json.lineItems) })
              .catch(() => {})
          }
        }
        if (data.status === "DENIED") setDeniedModalFor("SCRAP")
      } else if (data.transactionId === meltTx.id) {
        setMeltApproval((prev) => ({ ...prev, status: data.status as ApprovalStatus }))
        if (data.status === "APPROVED") {
          setApprovedWasEdited(data.edited === true)
          setApprovedModalFor("MELT")
          if (data.edited && meltTx.id) {
            fetch(`/api/transactions/${meltTx.id}/line-items`, { credentials: "include" })
              .then((r) => r.ok ? r.json() : null)
              .then((json) => { if (json?.lineItems) setMeltLineItems(json.lineItems) })
              .catch(() => {})
          }
        }
        if (data.status === "DENIED") setDeniedModalFor("MELT")
      }
    }
    socket.on("approval_status", onApproval)
    return () => {
      socket.off("approval_status", onApproval)
    }
  }, [userRole, userId, scrapTx.id, meltTx.id])

  useEffect(() => {
    if (!adminPickerFor) return
    fetch("/api/users/admins", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then(setAdmins)
      .catch(() => setAdmins([]))
  }, [adminPickerFor])

  useEffect(() => {
    if (!sentForApprovalBanner.show) return
    const t = setTimeout(() => setSentForApprovalBanner((b) => ({ ...b, show: false })), 5000)
    return () => clearTimeout(t)
  }, [sentForApprovalBanner.show])

  async function handleSendForApproval(type: "SCRAP" | "MELT", adminId: string) {
    const sendScrap = !scrapTx.id && scrapLineItems.length > 0
    const sendMelt = !meltTx.id && meltLineItems.length > 0
    const sendBoth = sendScrap && sendMelt
    setSendingRequest(true)
    try {
      if (scrapTx.id && type === "SCRAP") {
        const res = await fetch(`/api/transactions/${scrapTx.id}/approval-request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestedToUserId: adminId }),
          credentials: "include",
        })
        const err = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (res.status === 400 && (err.message || "").toLowerCase().includes("already pending")) {
            fetchApprovalStatus(scrapTx.id).then(() => {
              setScrapApproval((prev) => ({ ...prev, status: "PENDING", pendingAdminName: prev.pendingAdminName || "admin" }))
            })
            setAdminPickerFor(null)
            return
          }
          throw new Error(err.message || "Failed to send request")
        }
        const data = await res.json()
        const adminName = data.requestedTo ? [data.requestedTo.firstName, data.requestedTo.lastName].filter(Boolean).join(" ") || data.requestedTo.email : "Admin"
        setScrapApproval({ status: "PENDING", pendingAdminName: adminName })
        setAdminPickerFor(null)
        setSentForApprovalBanner({ show: true, adminName, sendBoth: false })
        return
      }
      if (meltTx.id && type === "MELT") {
        const res = await fetch(`/api/transactions/${meltTx.id}/approval-request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestedToUserId: adminId }),
          credentials: "include",
        })
        const err = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (res.status === 400 && (err.message || "").toLowerCase().includes("already pending")) {
            fetchApprovalStatus(meltTx.id).then(() => {
              setMeltApproval((prev) => ({ ...prev, status: "PENDING", pendingAdminName: prev.pendingAdminName || "admin" }))
            })
            setAdminPickerFor(null)
            return
          }
          throw new Error(err.message || "Failed to send request")
        }
        const data = await res.json()
        const adminName = data.requestedTo ? [data.requestedTo.firstName, data.requestedTo.lastName].filter(Boolean).join(" ") || data.requestedTo.email : "Admin"
        setMeltApproval({ status: "PENDING", pendingAdminName: adminName })
        setAdminPickerFor(null)
        setSentForApprovalBanner({ show: true, adminName, sendBoth: false })
        return
      }

      let groupId: string | undefined = approvalGroupId ?? undefined
      let lastAdminName: string | null = null
      if (sendScrap) {
        const payload = scrapLineItems.map((item) => ({
          metalType: item.metalType,
          purityLabel: item.purityLabel,
          dwt: item.dwt,
        }))
        const res = await fetch("/api/transactions/send-for-approval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: customer.id,
            type: "SCRAP",
            lineItems: payload,
            requestedToUserId: adminId,
            approvalGroupId: groupId,
          }),
          credentials: "include",
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message || "Failed to send for approval")
        }
        const data = await res.json()
        groupId = data.approvalGroupId
        if (groupId) setApprovalGroupId(groupId)
        lastAdminName = data.approvalRequest?.requestedTo
          ? [data.approvalRequest.requestedTo.firstName, data.approvalRequest.requestedTo.lastName].filter(Boolean).join(" ") || data.approvalRequest.requestedTo.email
          : null
        setScrapTx(data.transaction)
        setScrapLineItems(data.transaction.lineItems)
      }
      if (sendMelt) {
        const payload = meltLineItems.map((item) => ({
          metalType: item.metalType,
          purityLabel: item.purityLabel,
          dwt: item.dwt,
          ...(item.purityPercentage != null ? { purityPercentage: item.purityPercentage } : {}),
        }))
        const res = await fetch("/api/transactions/send-for-approval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: customer.id,
            type: "MELT",
            lineItems: payload,
            requestedToUserId: adminId,
            approvalGroupId: groupId,
          }),
          credentials: "include",
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message || "Failed to send for approval")
        }
        const data = await res.json()
        if (data.approvalGroupId) setApprovalGroupId(data.approvalGroupId)
        lastAdminName = data.approvalRequest?.requestedTo
          ? [data.approvalRequest.requestedTo.firstName, data.approvalRequest.requestedTo.lastName].filter(Boolean).join(" ") || data.approvalRequest.requestedTo.email
          : lastAdminName
        setMeltTx(data.transaction)
        setMeltLineItems(data.transaction.lineItems)
      }
      const adminName = lastAdminName || [admins.find((a) => a.id === adminId)?.firstName, admins.find((a) => a.id === adminId)?.lastName].filter(Boolean).join(" ") || admins.find((a) => a.id === adminId)?.email || "Admin"
      setScrapApproval((prev) => (sendScrap ? { ...prev, status: "PENDING", pendingAdminName: adminName } : prev))
      setMeltApproval((prev) => (sendMelt ? { ...prev, status: "PENDING", pendingAdminName: adminName } : prev))
      setAdminPickerFor(null)
      setSentForApprovalBanner({ show: true, adminName, sendBoth })
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to send", variant: "destructive" })
    } finally {
      setSendingRequest(false)
    }
  }

  async function handlePrint(type: "SCRAP" | "MELT") {
    const transaction = type === "SCRAP" ? scrapTx : meltTx
    if (!transaction.id) return
    try {
      const res = await fetch(`/api/transactions/${transaction.id}/print`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) {
        throw new Error("Failed to mark transaction as printed")
      }
      sessionStorage.setItem("scanRedirectToPrint", transaction.id)
      history.go(-1)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to print transaction",
        variant: "destructive",
      })
    }
  }

  function handleNewTransaction(type: "SCRAP" | "MELT") {
    const tx = type === "SCRAP" ? scrapTx : meltTx
    if (tx.id) {
      toast({ title: "Info", description: "Print this transaction or wait for approval first.", variant: "default" })
      return
    }
    if (type === "SCRAP") {
      setScrapLineItems([])
      toast({ title: "Cleared", description: "SCRAP draft cleared." })
    } else {
      setMeltLineItems([])
      toast({ title: "Cleared", description: "MELT draft cleared." })
    }
  }

  const scrapTotal = useMemo(() => 
    scrapLineItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [scrapLineItems]
  )
  const scrapDwt = useMemo(() => 
    scrapLineItems.reduce((sum, item) => sum + item.dwt, 0),
    [scrapLineItems]
  )
  const meltTotal = useMemo(() => 
    meltLineItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [meltLineItems]
  )
  const meltDwt = useMemo(() => 
    meltLineItems.reduce((sum, item) => sum + item.dwt, 0),
    [meltLineItems]
  )

  const grandTotal = useMemo(() => scrapTotal + meltTotal, [scrapTotal, meltTotal])
  const grandTotalDwt = useMemo(() => scrapDwt + meltDwt, [scrapDwt, meltDwt])

  useEffect(() => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("scanBlockReentry") === "1") {
      window.location.replace("/dashboard")
      return
    }
    if (!hasPushedHistoryRef.current) {
      window.history.pushState(null, "", window.location.href)
      hasPushedHistoryRef.current = true
    }
    const handlePopState = () => {
      sessionStorage.setItem("scanBlockReentry", "1")
      const printId = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("scanRedirectToPrint") : null
      if (printId) {
        sessionStorage.removeItem("scanRedirectToPrint")
        window.location.replace(`/print/${printId}`)
      } else {
        window.location.replace("/dashboard")
      }
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const handleLeaveTransaction = () => {
    history.go(-1)
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={handleLeaveTransaction}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card className="border-2 shadow-lg bg-gradient-to-br from-background via-background to-muted/20">
        <CardContent className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              {customer.isBusiness ? (
                <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              ) : (
                <User className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent truncate">
                {getCustomerDisplayName(customer)}
              </h2>
              <p className="text-sm text-muted-foreground mt-1" suppressHydrationWarning>
                {mounted && currentDate
                  ? `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`
                  : "Loading…"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {sentForApprovalBanner.show && (
        <div
          className="relative overflow-hidden rounded-xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/15 shadow-lg backdrop-blur-sm animate-in slide-in-from-top-4 fade-in duration-300"
          role="status"
          aria-live="polite"
        >
          <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500/30 rounded-b-xl overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-b-xl animate-[shrink_5s_linear_forwards]"
              style={{ width: "100%", transformOrigin: "left" }}
            />
          </div>
          <style>{`@keyframes shrink { from { width: 100%; } to { width: 0%; } }`}</style>
          <div className="flex items-center gap-4 p-4 pr-12">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/25 ring-2 ring-emerald-500/50 animate-in zoom-in-95 duration-300">
              <Send className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">Sent for approval</p>
              <p className="text-sm text-emerald-700/90 dark:text-emerald-300/90 mt-0.5">
                {sentForApprovalBanner.sendBoth ? `SCRAP & MELT sent. Waiting for ${sentForApprovalBanner.adminName}` : `Waiting for ${sentForApprovalBanner.adminName}`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30"
              onClick={() => setSentForApprovalBanner((b) => ({ ...b, show: false }))}
              aria-label="Dismiss"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="w-full min-w-0 max-w-full my-3 py-0">
        <TradingViewTickerTape />
      </div>

      <div className="w-full" style={{ touchAction: "pan-y" }}>
        <Carousel
          showIndicators={false}
          showArrows={false}
          className="rounded-lg min-h-[600px]"
          nested={false}
        >
          <div className="space-y-4 w-full">
            <div className="text-center mb-4 touch-none">
              <div className="text-center mb-4 touch-none">
                <div className="inline-flex items-center justify-center gap-3 px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 border-2 border-amber-500/30 shadow-lg backdrop-blur-sm mb-4">
                  <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500 drop-shadow-md" />
                  <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent drop-shadow-md">
                    SCRAP
                  </h3>
                  <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500 drop-shadow-md" />
                </div>
              </div>
              <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-yellow-500/5 shadow-md">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/20">
                        <Scale className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Total DWT</p>
                        <p className="text-lg font-bold text-amber-700">{formatDecimal(scrapDwt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/20">
                        <TrendingUp className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Total Value</p>
                        <p className="text-lg font-bold text-amber-700">${formatDecimal(scrapTotal)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="relative z-0">
              <PricingTable
                transaction={{ ...scrapTx, lineItems: scrapLineItems }}
                onPrint={() => handlePrint("SCRAP")}
                onNewTransaction={() => handleNewTransaction("SCRAP")}
                userRole={userRole}
                onLineItemsUpdate={setScrapLineItems}
                readOnly={cardLocked}
                canPrint={userRole === "ADMIN" || scrapApproval.status === "APPROVED"}
                approvalStatus={scrapApproval.status}
                onSendForApproval={userRole === "STAFF" ? () => setAdminPickerFor("SCRAP") : undefined}
                pendingAdminName={scrapApproval.pendingAdminName}
              />
            </div>
          </div>
          <div className="space-y-4 w-full">
            <div className="text-center mb-4 touch-none">
              <div className="text-center mb-4 touch-none">
                <div className="inline-flex items-center justify-center gap-3 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-indigo-500/10 border-2 border-blue-500/30 shadow-lg backdrop-blur-sm mb-4">
                  <Flame className="h-6 w-6 sm:h-7 sm:w-7 text-red-600 drop-shadow-md" />
                  <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent drop-shadow-md">
                    MELT
                  </h3>
                  <Flame className="h-6 w-6 sm:h-7 sm:w-7 text-red-600 drop-shadow-md" />
                </div>
              </div>
              <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-indigo-500/5 shadow-md">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <Scale className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Total DWT</p>
                        <p className="text-lg font-bold text-red-600">{formatDecimal(meltDwt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <TrendingUp className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Total Value</p>
                        <p className="text-lg font-bold text-red-600">${formatDecimal(meltTotal)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="relative z-0">
              <PricingTable
                transaction={{ ...meltTx, lineItems: meltLineItems }}
                onPrint={() => handlePrint("MELT")}
                onNewTransaction={() => handleNewTransaction("MELT")}
                userRole={userRole}
                onLineItemsUpdate={setMeltLineItems}
                readOnly={cardLocked}
                canPrint={userRole === "ADMIN" || meltApproval.status === "APPROVED"}
                approvalStatus={meltApproval.status}
                onSendForApproval={userRole === "STAFF" ? () => setAdminPickerFor("MELT") : undefined}
                pendingAdminName={meltApproval.pendingAdminName}
              />
            </div>
          </div>
        </Carousel>
      </div>

      <Card className="border-2 border-primary/30 shadow-xl bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-red-600" />
              Grand Total
            </h3>
            <Badge variant="outline" className="bg-primary/20 text-red-600 border-primary/30 text-sm px-3 py-1">
              Combined
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
              <p className="text-sm text-muted-foreground font-medium mb-2 flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Total DWT (SCRAP + MELT)
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-red-600">{formatDecimal(grandTotalDwt)}</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
              <p className="text-sm text-muted-foreground font-medium mb-2 flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Total Value (SCRAP + MELT)
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-red-600">${formatDecimal(grandTotal)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!adminPickerFor} onOpenChange={(open) => !open && setAdminPickerFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send for approval</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {scrapLineItems.length > 0 && !scrapTx.id && meltLineItems.length > 0 && !meltTx.id
              ? "Choose an admin to send both SCRAP and MELT for approval together."
              : `Choose an admin to send this ${adminPickerFor === "SCRAP" ? "SCRAP" : "MELT"} transaction to.`}
          </p>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto mt-2">
            {admins.map((admin) => {
              const name = [admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.email
              return (
                <Button
                  key={admin.id}
                  variant="outline"
                  className="justify-start"
                  disabled={sendingRequest}
                  onClick={() => adminPickerFor && handleSendForApproval(adminPickerFor, admin.id)}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {name}
                </Button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!approvedModalFor} onOpenChange={(open) => { if (!open) { setApprovedModalFor(null); setApprovedWasEdited(false) } }}>
        <DialogContent className="sm:max-w-sm text-center" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogTitle className="sr-only">
            {approvedWasEdited ? "Edited and approved" : "Approved"}
          </DialogTitle>
          <div className={`py-6 flex flex-col items-center gap-4 animate-in duration-300 ${approvedWasEdited ? "zoom-in-95 slide-in-from-bottom-4" : "zoom-in-95"}`}>
            <div className={`rounded-full p-4 ${approvedWasEdited ? "bg-amber-500/20 animate-pulse" : "bg-green-500/20"}`}>
              <CheckCircle2 className={`h-16 w-16 ${approvedWasEdited ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`} />
            </div>
            {approvedWasEdited ? (
              <>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">Edited and Approved</p>
                <p className="text-sm text-muted-foreground">Admin made changes and approved. You can now print with the updated totals.</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">Approved</p>
                <p className="text-sm text-muted-foreground">You can now print this transaction.</p>
              </>
            )}
            <Button onClick={() => { setApprovedModalFor(null); setApprovedWasEdited(false) }}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deniedModalFor} onOpenChange={(open) => !open && setDeniedModalFor(null)}>
        <DialogContent className="sm:max-w-sm text-center" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogTitle className="sr-only">Denied</DialogTitle>
          <div className="py-6 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
            <div className="rounded-full bg-red-500/20 p-4">
              <XCircle className="h-16 w-16 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">Denied</p>
            <p className="text-sm text-muted-foreground">Transaction denied by admin.</p>
            <Button variant="outline" onClick={() => setDeniedModalFor(null)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

