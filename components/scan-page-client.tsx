"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PricingTable } from "@/components/pricing-table"
import { Building2, User, Clock, Sparkles, Flame, TrendingUp, Coins, Scale, Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Printer } from "lucide-react"
import { BackButton } from "@/components/back-button"
import { Carousel } from "@/components/carousel"
import { TradingViewTickerTape } from "@/components/trading-view-ticker-tape"
import { useSocketTransaction } from "@/hooks/use-socket-transaction"
import { formatDecimal, getCustomerDisplayName } from "@/lib/utils"

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
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  const [scrapLineItems, setScrapLineItems] = useState<LineItem[]>(scrapTransaction.lineItems)
  const [meltLineItems, setMeltLineItems] = useState<LineItem[]>(meltTransaction.lineItems)

  useEffect(() => {
    setMounted(true)
    setCurrentDate(new Date())
    const timer = setInterval(() => setCurrentDate(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  async function handlePrint(type: "SCRAP" | "MELT") {
    const transaction = type === "SCRAP" ? scrapTransaction : meltTransaction
    
    try {

      const res = await fetch(`/api/transactions/${transaction.id}/print`, {
        method: "POST",
        credentials: "include",
      })

      if (!res.ok) {
        throw new Error("Failed to mark transaction as printed")
      }

      window.location.href = `/print/${transaction.id}`
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to print transaction",
        variant: "destructive",
      })
    }
  }

  async function handleNewTransaction(type: "SCRAP" | "MELT") {
    try {
      const res = await fetch(`/api/transactions/${type === "SCRAP" ? scrapTransaction.id : meltTransaction.id}/new`, {
        method: "POST",
      })

      if (!res.ok) {
        throw new Error("Failed to create new transaction")
      }

      toast({
        title: "New Transaction",
        description: `New ${type} transaction created.`,
        variant: "success",
      })
      
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create transaction",
        variant: "destructive",
      })
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

  return (
    <div className="space-y-6">
      {
}
      <BackButton />

      {
}
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

      {cardLocked && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
          <Lock className="h-4 w-4 shrink-0" />
          <span>Card is locked — view only. Unlock the card to edit.</span>
        </div>
      )}

      <div className="w-full min-w-0 max-w-full my-3 py-0">
        <TradingViewTickerTape />
      </div>

      {
}
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
              {
}
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
                transaction={scrapTransaction}
                onPrint={() => handlePrint("SCRAP")}
                onNewTransaction={() => handleNewTransaction("SCRAP")}
                userRole={userRole}
                onLineItemsUpdate={setScrapLineItems}
                readOnly={cardLocked}
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
              {
}
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
                transaction={meltTransaction}
                onPrint={() => handlePrint("MELT")}
                onNewTransaction={() => handleNewTransaction("MELT")}
                userRole={userRole}
                onLineItemsUpdate={setMeltLineItems}
                readOnly={cardLocked}
              />
            </div>
          </div>
        </Carousel>
      </div>

      {
}
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
    </div>
  )
}

