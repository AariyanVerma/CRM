"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PricingTable } from "@/components/pricing-table"
import { Building2, User, Phone, MapPin, Calendar, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Printer } from "lucide-react"
import { BackButton } from "@/components/back-button"
import { Carousel } from "@/components/carousel"

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
}: {
  customer: Customer
  scrapTransaction: Transaction
  meltTransaction: Transaction
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  async function handlePrint(type: "SCRAP" | "MELT") {
    const transaction = type === "SCRAP" ? scrapTransaction : meltTransaction
    
    // Mark as printed
    try {
      const res = await fetch(`/api/transactions/${transaction.id}/print`, {
        method: "POST",
      })

      if (!res.ok) {
        throw new Error("Failed to mark transaction as printed")
      }

      // Open print window
      window.open(`/print/${transaction.id}`, "_blank")
      
      toast({
        title: "Printing",
        description: `${type} transaction is being printed.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to print",
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

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <BackButton href="/customers" />

      {/* Customer Header Card */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              {customer.isBusiness ? (
                <Building2 className="h-5 w-5 text-muted-foreground" />
              ) : (
                <User className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-semibold">{customer.fullName}</p>
                {customer.businessName && (
                  <p className="text-sm text-muted-foreground">{customer.businessName}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-semibold">{customer.phoneNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-semibold text-sm">{customer.address}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Date & Time</p>
                <p className="font-semibold text-sm">
                  {currentDate.toLocaleDateString()} {currentDate.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Transaction Carousel */}
      <div className="w-full">
        <Carousel
          showIndicators={false}
          showArrows={false}
          className="rounded-lg min-h-[600px]"
          nested={false}
        >
          <div className="space-y-4 w-full">
            <div className="text-center mb-4 py-2 touch-none">
              <h3 className="text-2xl font-bold">SCRAP</h3>
            </div>
            <div className="relative z-0">
              <PricingTable
                transaction={scrapTransaction}
                onPrint={() => handlePrint("SCRAP")}
                onNewTransaction={() => handleNewTransaction("SCRAP")}
              />
            </div>
          </div>
          <div className="space-y-4 w-full">
            <div className="text-center mb-4 py-2 touch-none">
              <h3 className="text-2xl font-bold">MELT</h3>
            </div>
            <div className="relative z-0">
              <PricingTable
                transaction={meltTransaction}
                onPrint={() => handlePrint("MELT")}
                onNewTransaction={() => handleNewTransaction("MELT")}
              />
            </div>
          </div>
        </Carousel>
      </div>
    </div>
  )
}

