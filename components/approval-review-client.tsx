"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PricingTable } from "@/components/pricing-table"
import { Building2, User, Sparkles, Flame, TrendingUp, Coins, Scale, CheckCircle2, XCircle, Loader2, AlertTriangle, Printer } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Carousel } from "@/components/carousel"
import { TradingViewTickerTape } from "@/components/trading-view-ticker-tape"
import { getSocket } from "@/lib/socketClient"
import { formatDecimal, getCustomerDisplayName } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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

function lineItemsDiffer(a: LineItem[], b: LineItem[]): boolean {
  if (a.length !== b.length) return true
  const tol = 1e-6
  for (let i = 0; i < a.length; i++) {
    const x = a[i]
    const y = b[i]
    if (Math.abs((x.dwt ?? 0) - (y.dwt ?? 0)) > tol) return true
    if (Math.abs((x.lineTotal ?? 0) - (y.lineTotal ?? 0)) > tol) return true
    const px = x.purityPercentage ?? null
    const py = y.purityPercentage ?? null
    if (px != null || py != null) {
      if (Math.abs((Number(px) || 0) - (Number(py) || 0)) > tol) return true
    }
  }
  return false
}

interface Transaction {
  id: string
  type: "SCRAP" | "MELT"
  status: string
  goldSpot: number
  silverSpot: number
  platinumSpot: number
  scrapGoldPercentage?: number | null
  scrapSilverPercentage?: number | null
  scrapPlatinumPercentage?: number | null
  meltGoldPercentage?: number | null
  meltSilverPercentage?: number | null
  meltPlatinumPercentage?: number | null
  lineItems: LineItem[]
}

export function ApprovalReviewClient({
  requestId,
  scrapRequestId,
  meltRequestId,
  scrapRequestApproved = false,
  meltRequestApproved = false,
  customer,
  scrapTransaction,
  meltTransaction,
  staffName,
}: {
  requestId: string
  scrapRequestId: string | null
  meltRequestId: string | null
  scrapRequestApproved?: boolean
  meltRequestApproved?: boolean
  customer: Customer
  scrapTransaction: Transaction
  meltTransaction: Transaction
  staffName: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [scrapLineItems, setScrapLineItems] = useState<LineItem[]>(scrapTransaction.lineItems)
  const [meltLineItems, setMeltLineItems] = useState<LineItem[]>(meltTransaction.lineItems)
  const [hasEdited, setHasEdited] = useState(false)
  const [acting, setActing] = useState<"approve-scrap" | "approve-melt" | "deny-scrap" | "deny-melt" | null>(null)
  const [warningFor, setWarningFor] = useState<"SCRAP" | "MELT" | null>(null)
  const [printedModal, setPrintedModal] = useState<{ byName: string } | null>(null)
  const [approvedModalFor, setApprovedModalFor] = useState<"SCRAP" | "MELT" | null>(null)

  const hasScrapRequest = !!scrapRequestId && scrapTransaction.id !== "dummy-scrap"
  const hasMeltRequest = !!meltRequestId && meltTransaction.id !== "dummy-melt"
  const hasScrapToShow = (hasScrapRequest || scrapRequestApproved) && scrapTransaction.id !== "dummy-scrap"
  const hasMeltToShow = (hasMeltRequest || meltRequestApproved) && meltTransaction.id !== "dummy-melt"
  const isPair = hasScrapRequest && hasMeltRequest
  const scrapHasLines = scrapLineItems.length > 0
  const meltHasLines = meltLineItems.length > 0
  const typeLabel = scrapHasLines && meltHasLines ? "Scrap & Melt" : scrapHasLines ? "Scrap" : meltHasLines ? "Melt" : "Transaction"

  const scrapTotal = useMemo(() => scrapLineItems.reduce((s, i) => s + i.lineTotal, 0), [scrapLineItems])
  const scrapDwt = useMemo(() => scrapLineItems.reduce((s, i) => s + i.dwt, 0), [scrapLineItems])
  const meltTotal = useMemo(() => meltLineItems.reduce((s, i) => s + i.lineTotal, 0), [meltLineItems])
  const meltDwt = useMemo(() => meltLineItems.reduce((s, i) => s + i.dwt, 0), [meltLineItems])
  const grandTotal = useMemo(() => scrapTotal + meltTotal, [scrapTotal, meltTotal])
  const grandTotalDwt = useMemo(() => scrapDwt + meltDwt, [scrapDwt, meltDwt])

  const noop = () => {}
  const markScrapEdited = (items: LineItem[]) => {
    setScrapLineItems(items)
    if (lineItemsDiffer(items, scrapTransaction.lineItems)) setHasEdited(true)
  }
  const markMeltEdited = (items: LineItem[]) => {
    setMeltLineItems(items)
    if (lineItemsDiffer(items, meltTransaction.lineItems)) setHasEdited(true)
  }

  
  useEffect(() => {
    const socket = getSocket()
    const onPrinted = (data?: { transactionId?: string; printedByName?: string }) => {
      if (!data?.transactionId) return
      const matchesScrap = scrapTransaction.id && data.transactionId === scrapTransaction.id
      const matchesMelt = meltTransaction.id && data.transactionId === meltTransaction.id
      if (!matchesScrap && !matchesMelt) return

      const name = data.printedByName || "staff"
      setPrintedModal({ byName: name })
    }
    socket.on("transaction_printed", onPrinted)
    return () => {
      socket.off("transaction_printed", onPrinted)
    }
  }, [scrapTransaction.id, meltTransaction.id, toast, router])

  async function handleApproveScrap() {
    if (!scrapRequestId) return
    const editedNow = lineItemsDiffer(scrapLineItems, scrapTransaction.lineItems)
    setActing("approve-scrap")
    try {
      if (editedNow && scrapTransaction.id && scrapTransaction.id !== "dummy-scrap") {
        const putRes = await fetch(`/api/transactions/${scrapTransaction.id}/line-items`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineItems: scrapLineItems.map((item) => ({
              metalType: item.metalType,
              purityLabel: item.purityLabel,
              dwt: item.dwt,
              pricePerOz: item.pricePerOz,
              lineTotal: item.lineTotal,
            })),
          }),
          credentials: "include",
        })
        if (!putRes.ok) throw new Error("Failed to save changes")
      }
      const res = await fetch(`/api/transactions/approval-requests/${scrapRequestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edited: editedNow }),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed")
      setApprovedModalFor("SCRAP")
      if (isPair) {
        setWarningFor("MELT")
      }
      setActing(null)
      router.refresh()
    } catch {
      toast({ title: "Error", description: "Failed to approve", variant: "destructive" })
      setActing(null)
    }
  }

  async function handleApproveMelt() {
    if (!meltRequestId) return
    const editedNow = lineItemsDiffer(meltLineItems, meltTransaction.lineItems)
    setActing("approve-melt")
    try {
      if (editedNow && meltTransaction.id && meltTransaction.id !== "dummy-melt") {
        const putRes = await fetch(`/api/transactions/${meltTransaction.id}/line-items`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineItems: meltLineItems.map((item) => ({
              metalType: item.metalType,
              purityLabel: item.purityLabel,
              dwt: item.dwt,
              pricePerOz: item.pricePerOz,
              lineTotal: item.lineTotal,
              ...(item.purityPercentage != null ? { purityPercentage: item.purityPercentage } : {}),
            })),
          }),
          credentials: "include",
        })
        if (!putRes.ok) throw new Error("Failed to save changes")
      }
      const res = await fetch(`/api/transactions/approval-requests/${meltRequestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edited: editedNow }),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed")
      setApprovedModalFor("MELT")
      if (isPair) {
        setWarningFor("SCRAP")
      }
      setActing(null)
      router.refresh()
    } catch {
      toast({ title: "Error", description: "Failed to approve", variant: "destructive" })
      setActing(null)
    }
  }

  async function handleDenyScrap() {
    if (!scrapRequestId) return
    setActing("deny-scrap")
    try {
      const res = await fetch(`/api/transactions/approval-requests/${scrapRequestId}/deny`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Scrap denied", description: "Scrap transaction voided. Data removed from queue." })
      router.push("/dashboard/approvals")
      router.refresh()
    } catch {
      toast({ title: "Error", description: "Failed to deny", variant: "destructive" })
      setActing(null)
    }
  }

  async function handleDenyMelt() {
    if (!meltRequestId) return
    setActing("deny-melt")
    try {
      const res = await fetch(`/api/transactions/approval-requests/${meltRequestId}/deny`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Melt denied", description: "Melt transaction voided. Data removed from queue." })
      router.push("/dashboard/approvals")
      router.refresh()
    } catch {
      toast({ title: "Error", description: "Failed to deny", variant: "destructive" })
      setActing(null)
    }
  }

  const scrapBar = (
    <>
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        {scrapRequestApproved ? "Approved · You can print below" : `Request from ${staffName}${isPair ? " · Scrap page" : ""}`}
      </div>
      {hasScrapToShow && (
        <>
          {!scrapRequestApproved && (
            <>
              <Button
                variant="destructive"
                size="lg"
                disabled={!!acting}
                onClick={handleDenyScrap}
                className="w-full sm:w-auto"
              >
                {acting === "deny-scrap" ? <Loader2 className="h-5 w-5 animate-spin" /> : <XCircle className="mr-2 h-5 w-5" />}
                Deny Scrap
              </Button>
              <Button
                size="lg"
                disabled={!!acting}
                onClick={handleApproveScrap}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              >
                {acting === "approve-scrap" ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                Approve Scrap
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => router.push(`/print/${scrapTransaction.id}`)}
          >
            <Printer className="mr-2 h-5 w-5" />
            Print Scrap
          </Button>
        </>
      )}
    </>
  )

  const meltBar = (
    <>
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        {meltRequestApproved ? "Approved · You can print below" : `Request from ${staffName}${isPair ? " · Melt page" : ""}`}
      </div>
      {hasMeltToShow && (
        <>
          {!meltRequestApproved && (
            <>
              <Button
                variant="destructive"
                size="lg"
                disabled={!!acting}
                onClick={handleDenyMelt}
                className="w-full sm:w-auto"
              >
                {acting === "deny-melt" ? <Loader2 className="h-5 w-5 animate-spin" /> : <XCircle className="mr-2 h-5 w-5" />}
                Deny Melt
              </Button>
              <Button
                size="lg"
                disabled={!!acting}
                onClick={handleApproveMelt}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              >
                {acting === "approve-melt" ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                Approve Melt
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => router.push(`/print/${meltTransaction.id}`)}
          >
            <Printer className="mr-2 h-5 w-5" />
            Print Melt
          </Button>
        </>
      )}
    </>
  )

  return (
    <div className="space-y-6">
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
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">
                {getCustomerDisplayName(customer)}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {typeLabel} · Review and edit if needed, then Approve or Deny each page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="w-full min-w-0 max-w-full my-3 py-0">
        <TradingViewTickerTape />
      </div>

      <div className="w-full" style={{ touchAction: "pan-y" }}>
        <Carousel showIndicators={false} showArrows={false} className="rounded-lg min-h-[600px]" nested={false}>
          <div className="space-y-4 w-full">
            <div className="text-center mb-4 touch-none">
              <div className="inline-flex items-center justify-center gap-3 px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 border-2 border-amber-500/30 shadow-lg mb-4">
                <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500" />
                <h3 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">SCRAP</h3>
                <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500" />
              </div>
              <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-yellow-500/5 shadow-md">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Scale className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Total DWT</p>
                        <p className="text-lg font-bold text-amber-700">{formatDecimal(scrapDwt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-amber-600" />
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
                transaction={{ ...scrapTransaction, lineItems: scrapLineItems }}
                onPrint={noop}
                onNewTransaction={noop}
                userRole="ADMIN"
                onLineItemsUpdate={markScrapEdited}
                readOnly={scrapRequestApproved}
                customBottom={scrapBar}
                customerId={customer.id}
                initialPercentages={{
                  scrapGold: scrapTransaction.scrapGoldPercentage ?? 95,
                  scrapSilver: scrapTransaction.scrapSilverPercentage ?? 95,
                  scrapPlatinum: scrapTransaction.scrapPlatinumPercentage ?? 95,
                  meltGold: meltTransaction.meltGoldPercentage ?? 95,
                  meltSilver: meltTransaction.meltSilverPercentage ?? 95,
                  meltPlatinum: meltTransaction.meltPlatinumPercentage ?? 95,
                }}
              />
            </div>
          </div>

          <div className="space-y-4 w-full">
            <div className="text-center mb-4 touch-none">
              <div className="inline-flex items-center justify-center gap-3 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-indigo-500/10 border-2 border-blue-500/30 shadow-lg mb-4">
                <Flame className="h-6 w-6 sm:h-7 sm:w-7 text-red-600" />
                <h3 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">MELT</h3>
                <Flame className="h-6 w-6 sm:h-7 sm:w-7 text-red-600" />
              </div>
              <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 shadow-md">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Scale className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Total DWT</p>
                        <p className="text-lg font-bold text-red-600">{formatDecimal(meltDwt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-red-600" />
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
                transaction={{ ...meltTransaction, lineItems: meltLineItems }}
                onPrint={noop}
                onNewTransaction={noop}
                userRole="ADMIN"
                onLineItemsUpdate={markMeltEdited}
                readOnly={meltRequestApproved}
                customBottom={meltBar}
                customerId={customer.id}
                initialPercentages={{
                  scrapGold: scrapTransaction.scrapGoldPercentage ?? 95,
                  scrapSilver: scrapTransaction.scrapSilverPercentage ?? 95,
                  scrapPlatinum: scrapTransaction.scrapPlatinumPercentage ?? 95,
                  meltGold: meltTransaction.meltGoldPercentage ?? 95,
                  meltSilver: meltTransaction.meltSilverPercentage ?? 95,
                  meltPlatinum: meltTransaction.meltPlatinumPercentage ?? 95,
                }}
              />
            </div>
          </div>
        </Carousel>
      </div>

      <Dialog open={!!warningFor} onOpenChange={(open) => !open && setWarningFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Check the other page
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {warningFor === "MELT"
              ? "You’ve approved Scrap. Don’t forget to review and approve or deny the Melt page too."
              : "You’ve approved Melt. Don’t forget to review and approve or deny the Scrap page too."}
          </p>
          <Button onClick={() => setWarningFor(null)}>OK</Button>
        </DialogContent>
      </Dialog>

      <Card className="border-2 border-primary/30 shadow-xl">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-red-600" />
              Grand Total
            </h3>
            <Badge variant="outline" className="bg-primary/20 text-red-600 border-primary/30">
              Combined
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-primary/20 border border-primary/30">
              <p className="text-sm text-muted-foreground font-medium mb-2 flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Total DWT (SCRAP + MELT)
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-red-600">{formatDecimal(grandTotalDwt)}</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/20 border border-primary/30">
              <p className="text-sm text-muted-foreground font-medium mb-2 flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Total Value (SCRAP + MELT)
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-red-600">${formatDecimal(grandTotal)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={approvedModalFor !== null}
        onOpenChange={(open) => {
          if (!open) setApprovedModalFor(null)
        }}
      >
        <DialogContent
          className="sm:max-w-sm text-center overflow-hidden border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-emerald-500/10 shadow-2xl"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Approved</DialogTitle>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center gap-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-emerald-500/40 blur-xl opacity-70 animate-pulse" />
              <div className="relative rounded-full bg-emerald-500/20 p-4 ring-4 ring-emerald-500/40">
                <CheckCircle2 className="h-16 w-16 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 drop-shadow-sm">
              {approvedModalFor === "SCRAP"
                ? "Scrap approved"
                : approvedModalFor === "MELT"
                ? "Melt approved"
                : "Approved"}
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {approvedModalFor === "SCRAP"
                ? "Changes are saved. Staff can now print the SCRAP transaction with these totals."
                : approvedModalFor === "MELT"
                ? "Changes are saved. Staff can now print the MELT transaction with these totals."
                : "Changes are saved and staff can now print this transaction."}
            </p>
            <Button
              className="mt-1 px-6"
              onClick={() => setApprovedModalFor(null)}
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!printedModal}
        onOpenChange={(open) => {
          if (!open) setPrintedModal(null)
        }}
      >
        <DialogContent
          className="sm:max-w-sm text-center overflow-hidden border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-emerald-500/10 to-primary/5 shadow-2xl"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Transaction printed</DialogTitle>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center gap-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl opacity-60 animate-pulse" />
              <div className="relative rounded-full bg-primary/20 p-4 ring-4 ring-primary/30">
                <Printer className="h-16 w-16 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary drop-shadow-sm">
              Transaction printed
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {printedModal?.byName
                ? `Transaction was printed and closed by ${printedModal.byName}.`
                : "Transaction was printed and closed."}
            </p>
            <Button
              className="mt-1 px-6"
              onClick={() => {
                setPrintedModal(null)
                router.push("/dashboard/approvals")
                router.refresh()
              }}
            >
              Back to approvals
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
