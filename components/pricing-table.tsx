"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Printer, RotateCcw } from "lucide-react"
import { Carousel } from "@/components/carousel"
import {
  getPricingRows,
  type MetalType,
  GOLD_PURITIES,
  SILVER_PURITIES,
  PLATINUM_PURITIES,
} from "@/lib/pricing"

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
  goldSpot: number
  silverSpot: number
  platinumSpot: number
  lineItems: LineItem[]
}

export function PricingTable({
  transaction,
  onPrint,
  onNewTransaction,
}: {
  transaction: Transaction
  onPrint: () => void
  onNewTransaction: () => void
}) {
  const { toast } = useToast()
  const [dwtValues, setDwtValues] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [spotPrices, setSpotPrices] = useState({
    gold: transaction.goldSpot,
    silver: transaction.silverSpot,
    platinum: transaction.platinumSpot,
  })
  const [savingPrice, setSavingPrice] = useState<Record<string, boolean>>({})

  // Initialize DWT values from line items
  useEffect(() => {
    const values: Record<string, number> = {}
    transaction.lineItems.forEach((item) => {
      const key = `${item.metalType}-${item.purityLabel}`
      values[key] = item.dwt
    })
    setDwtValues(values)
  }, [transaction.lineItems])

  // Debounced save function
  const debouncedSave = useCallback(
    (() => {
      let timeout: NodeJS.Timeout | null = null
      return (metalType: MetalType, purity: string, dwt: number) => {
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(async () => {
          const key = `${metalType}-${purity}`
          setSaving((prev) => ({ ...prev, [key]: true }))

          try {
            const res = await fetch(`/api/transactions/${transaction.id}/line-items`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                metalType,
                purityLabel: purity,
                dwt: parseFloat(dwt.toString()) || 0,
              }),
            })

            if (!res.ok) {
              throw new Error("Failed to save")
            }

            toast({
              title: "Saved",
              description: `${purity} ${metalType} updated`,
            })
          } catch (error) {
            toast({
              title: "Error",
              description: "Failed to save line item",
              variant: "destructive",
            })
          } finally {
            setSaving((prev) => ({ ...prev, [key]: false }))
          }
        }, 400)
      }
    })()
  , [transaction.id, toast])

  function handleDwtChange(metalType: MetalType, purity: string, value: string) {
    const numValue = parseFloat(value) || 0
    if (numValue < 0) return

    const key = `${metalType}-${purity}`
    setDwtValues((prev) => ({ ...prev, [key]: numValue }))
    debouncedSave(metalType, purity, numValue)
  }

  function handleClear(metalType: MetalType, purity: string) {
    const key = `${metalType}-${purity}`
    setDwtValues((prev) => ({ ...prev, [key]: 0 }))
    debouncedSave(metalType, purity, 0)
  }

  // Debounced price update function
  const debouncedPriceUpdate = useCallback(
    (() => {
      let timeout: NodeJS.Timeout | null = null
      return (metalType: string, price: number) => {
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(async () => {
          setSavingPrice((prev) => ({ ...prev, [metalType]: true }))
          try {
            const res = await fetch("/api/admin/prices", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                metalType,
                price,
              }),
            })

            if (!res.ok) {
              throw new Error("Failed to update price")
            }

            const updated = await res.json()
            setSpotPrices({
              gold: updated.gold,
              silver: updated.silver,
              platinum: updated.platinum,
            })

            toast({
              title: "Price updated",
              description: `${metalType} spot price updated to $${price.toFixed(2)}`,
            })
          } catch (error) {
            toast({
              title: "Error",
              description: "Failed to update price",
              variant: "destructive",
            })
          } finally {
            setSavingPrice((prev) => ({ ...prev, [metalType]: false }))
          }
        }, 1000)
      }
    })()
  , [toast])

  function handlePriceChange(metalType: MetalType, value: string) {
    const numValue = parseFloat(value) || 0
    if (numValue < 0) return

    const metalKey = metalType.toLowerCase()
    setSpotPrices((prev) => ({
      ...prev,
      [metalKey]: numValue,
    }))
    debouncedPriceUpdate(metalKey, numValue)
  }

  function getRowsForMetal(metalType: MetalType) {
    const spotPrice =
      metalType === "GOLD"
        ? spotPrices.gold
        : metalType === "SILVER"
        ? spotPrices.silver
        : spotPrices.platinum

    const purities =
      metalType === "GOLD"
        ? GOLD_PURITIES
        : metalType === "SILVER"
        ? SILVER_PURITIES
        : PLATINUM_PURITIES

    return purities.map((purity) => {
      const key = `${metalType}-${purity}`
      const dwt = dwtValues[key] || 0
      const existingItem = transaction.lineItems.find(
        (item) => item.metalType === metalType && item.purityLabel === purity
      )

      const rows = getPricingRows(metalType, spotPrice, { [purity]: dwt })
      const row = rows.find((r) => r.purity === purity)!

      return {
        purity,
        dwt,
        pricePerOz: row.pricePerOz,
        lineTotal: row.lineTotal,
        saving: saving[key] || false,
        existingItem,
      }
    })
  }

  function getTotalsForMetal(metalType: MetalType) {
    const rows = getRowsForMetal(metalType)
    return {
      totalDwt: rows.reduce((sum, row) => sum + row.dwt, 0),
      totalPrice: rows.reduce((sum, row) => sum + row.lineTotal, 0),
    }
  }

  function renderMetalTable(metalType: MetalType) {
    const rows = getRowsForMetal(metalType)
    const totals = getTotalsForMetal(metalType)

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '20%' }} />
            <col style={{ width: '25%' }} />
            <col style={{ width: '25%' }} />
            <col style={{ width: '25%' }} />
            <col style={{ width: '5%', minWidth: '48px' }} />
          </colgroup>
          <thead>
            <tr className="border-b">
              <th className="text-center p-3 font-semibold">Purity</th>
              <th className="text-center p-3 font-semibold">Price/oz</th>
              <th className="text-center p-3 font-semibold">DWT</th>
              <th className="text-center p-3 font-semibold">Price</th>
              <th className="text-center p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.purity} className="border-b hover:bg-muted/50">
                <td className="p-3 font-medium text-center overflow-hidden text-ellipsis">{row.purity}</td>
                <td className="p-3 text-center overflow-hidden text-ellipsis">
                  ${row.pricePerOz.toFixed(2)}
                </td>
                <td className="p-3 text-center">
                  <div className="flex justify-center">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.dwt || ""}
                      onChange={(e) => handleDwtChange(metalType, row.purity, e.target.value)}
                      className="w-full max-w-24 text-center"
                      placeholder="0.00"
                    />
                  </div>
                </td>
                <td className="p-3 text-center font-semibold overflow-hidden text-ellipsis">
                  ${row.lineTotal.toFixed(2)}
                </td>
                <td className="p-2 text-center">
                  {row.dwt > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleClear(metalType, row.purity)}
                      className="h-7 w-7"
                      title="Clear DWT"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-bold">
              <td className="p-3 text-center overflow-hidden text-ellipsis">Total</td>
              <td className="p-3 text-center overflow-hidden text-ellipsis">—</td>
              <td className="p-3 text-center overflow-hidden text-ellipsis">{totals.totalDwt.toFixed(2)}</td>
              <td className="p-3 text-center overflow-hidden text-ellipsis">${totals.totalPrice.toFixed(2)}</td>
              <td className="p-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Price Snapshot Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Price Snapshot (Today)</span>
            <div className="flex gap-4">
              <span>Gold: ${spotPrices.gold.toFixed(2)}</span>
              <span>Silver: ${spotPrices.silver.toFixed(2)}</span>
              <span>Platinum: ${spotPrices.platinum.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metal Type Carousel */}
      <div className="relative z-10">
        <Carousel
          showIndicators={true}
          showArrows={true}
          className="rounded-lg"
          nested={true}
        >
        <Card>
          <CardHeader>
            <CardTitle>Gold Pricing</CardTitle>
            <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
              <label className="text-sm font-medium">Gold Spot Price (per oz):</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={spotPrices.gold || ""}
                  onChange={(e) => handlePriceChange("GOLD", e.target.value)}
                  className="w-32 text-center"
                  placeholder="0.00"
                />
                {savingPrice.gold && (
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    Saving...
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>{renderMetalTable("GOLD")}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Silver Pricing</CardTitle>
            <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
              <label className="text-sm font-medium">Silver Spot Price (per oz):</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={spotPrices.silver || ""}
                  onChange={(e) => handlePriceChange("SILVER", e.target.value)}
                  className="w-32 text-center"
                  placeholder="0.00"
                />
                {savingPrice.silver && (
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    Saving...
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>{renderMetalTable("SILVER")}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platinum Pricing</CardTitle>
            <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
              <label className="text-sm font-medium">Platinum Spot Price (per oz):</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={spotPrices.platinum || ""}
                  onChange={(e) => handlePriceChange("PLATINUM", e.target.value)}
                  className="w-32 text-center"
                  placeholder="0.00"
                />
                {savingPrice.platinum && (
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    Saving...
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>{renderMetalTable("PLATINUM")}</CardContent>
        </Card>
      </Carousel>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sticky bottom-4 bg-background p-3 sm:p-4 border rounded-lg shadow-lg z-50">
        <Button onClick={onPrint} className="flex-1 w-full sm:w-auto" size="lg">
          <Printer className="mr-2 h-5 w-5 flex-shrink-0" />
          <span className="whitespace-nowrap">Print {transaction.type} (4x6)</span>
        </Button>
        <Button onClick={onNewTransaction} variant="outline" size="lg" className="w-full sm:w-auto whitespace-normal sm:whitespace-nowrap">
          <span className="text-center">Start New {transaction.type} Transaction</span>
        </Button>
      </div>
    </div>
  )
}

