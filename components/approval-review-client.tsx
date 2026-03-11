"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PricingTable } from "@/components/pricing-table"
import { Building2, User, Sparkles, Flame, TrendingUp, Coins, Scale, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Carousel } from "@/components/carousel"
import { TradingViewTickerTape } from "@/components/trading-view-ticker-tape"
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
  lineItems: LineItem[]
}

export function ApprovalReviewClient({
  requestId,
  scrapRequestId,
  meltRequestId,
  customer,
  scrapTransaction,
  meltTransaction,
  staffName,
}: {
  requestId: string
  scrapRequestId: string | null
  meltRequestId: string | null
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

  const hasScrapRequest = !!scrapRequestId && scrapTransaction.id !== "dummy-scrap"
  const hasMeltRequest = !!meltRequestId && meltTransaction.id !== "dummy-melt"
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

  async function handleApproveScrap() {
    if (!scrapRequestId) return
    setActing("approve-scrap")
    try {
      const res = await fetch(`/api/transactions/approval-requests/${scrapRequestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edited: hasEdited }),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Scrap approved", description: hasEdited ? "Changes saved and approved." : "Scrap approved." })
      if (isPair) {
        setWarningFor("MELT")
        setActing(null)
        router.refresh()
      } else {
        router.push("/dashboard/approvals")
        router.refresh()
      }
    } catch {
      toast({ title: "Error", description: "Failed to approve", variant: "destructive" })
      setActing(null)
    }
  }

  async function handleApproveMelt() {
    if (!meltRequestId) return
    setActing("approve-melt")
    try {
      const res = await fetch(`/api/transactions/approval-requests/${meltRequestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edited: hasEdited }),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Melt approved", description: hasEdited ? "Changes saved and approved." : "Melt approved." })
      if (isPair) {
        setWarningFor("SCRAP")
        setActing(null)
        router.refresh()
      } else {
        router.push("/dashboard/approvals")
        router.refresh()
      }
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
        Request from {staffName} {isPair && "· Scrap page"}
      </div>
      {hasScrapRequest && (
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
    </>
  )

  const meltBar = (
    <>
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Request from {staffName} {isPair && "· Melt page"}
      </div>
      {hasMeltRequest && (
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
                readOnly={false}
                customBottom={scrapBar}
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
                readOnly={false}
                customBottom={meltBar}
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
    </div>
  )
}
