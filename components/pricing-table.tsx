"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { usePricePolling } from "@/hooks/use-price-polling"
import { useTransactionPolling } from "@/hooks/use-transaction-polling"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Printer, RotateCcw, DollarSign, Scale, Calculator, Sparkles, Loader2 } from "lucide-react"
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
  metalType,
  userRole = "STAFF",
}: {
  transaction: Transaction
  onPrint: () => void
  onNewTransaction: () => void
  metalType?: MetalType
  userRole?: "ADMIN" | "STAFF"
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
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const lastEditTimeRef = useRef<Record<string, number>>({}) // Track when each field was last edited

  // Initialize DWT values from line items
  useEffect(() => {
    const values: Record<string, number> = {}
    transaction.lineItems.forEach((item) => {
      const key = `${item.metalType}-${item.purityLabel}`
      values[key] = item.dwt
    })
    setDwtValues(values)
  }, [transaction.lineItems])

  // Poll for price updates (fast polling for real-time updates)
  usePricePolling(
    useCallback((prices) => {
      setSpotPrices({
        gold: prices.gold,
        silver: prices.silver,
        platinum: prices.platinum,
      })
    }, []),
    { interval: 500, enabled: true }
  )

  // Poll for transaction line items updates (real-time DWT sync)
  useTransactionPolling(
    transaction.id,
    useCallback((lineItems) => {
      // Update DWT values from polled line items
      const values: Record<string, number> = {}
      lineItems.forEach((item) => {
        const key = `${item.metalType}-${item.purityLabel}`
        values[key] = item.dwt
      })
      
      // Only update if values actually changed and field wasn't recently edited
      setDwtValues((prev) => {
        const now = Date.now()
        const updated = { ...prev }
        let hasChanges = false
        
        // Update existing or add new values
        Object.keys(values).forEach((key) => {
          const lastEditTime = lastEditTimeRef.current[key] || 0
          const timeSinceEdit = now - lastEditTime
          
          // Only update if value changed and field wasn't edited in last 2 seconds
          if (prev[key] !== values[key] && timeSinceEdit > 2000) {
            updated[key] = values[key]
            hasChanges = true
          }
        })
        
        // Remove deleted items (only if not recently edited)
        Object.keys(prev).forEach((key) => {
          if (!(key in values) && prev[key] !== 0) {
            const lastEditTime = lastEditTimeRef.current[key] || 0
            const timeSinceEdit = now - lastEditTime
            
            if (timeSinceEdit > 2000) {
              delete updated[key]
              hasChanges = true
            }
          }
        })
        
        return hasChanges ? updated : prev
      })
    }, []),
    { interval: 500, enabled: true }
  )

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
              const errorData = await res.json().catch(() => ({}))
              throw new Error(errorData.message || "Failed to save")
            }

            // Clear saving state immediately after successful save
            setSaving((prev) => {
              const updated = { ...prev }
              delete updated[key]
              return updated
            })

            toast({
              title: "Saved",
              description: `${purity} ${metalType} updated`,
            })
          } catch (error) {
            // Clear saving state on error
            setSaving((prev) => {
              const updated = { ...prev }
              delete updated[key]
              return updated
            })
            
            toast({
              title: "Error",
              description: error instanceof Error ? error.message : "Failed to save line item",
              variant: "destructive",
            })
          }
        }, 400)
      }
    })()
  , [transaction.id, toast])

  function handleDwtChange(metalType: MetalType, purity: string, value: string) {
    const numValue = parseFloat(value) || 0
    if (numValue < 0) return

    const key = `${metalType}-${purity}`
    lastEditTimeRef.current[key] = Date.now() // Mark as recently edited
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
              credentials: 'include', // Ensure cookies are sent
            })

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({ message: "Failed to update price" }))
              throw new Error(errorData.message || "Failed to update price")
            }

            const updated = await res.json()
            
            // Clear saving state immediately after successful save
            setSavingPrice((prev) => {
              const updated = { ...prev }
              delete updated[metalType]
              return updated
            })
            
            // Update prices from response
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
            // Clear saving state on error
            setSavingPrice((prev) => {
              const updated = { ...prev }
              delete updated[metalType]
              return updated
            })
            
            toast({
              title: "Error",
              description: error instanceof Error ? error.message : "Failed to update price",
              variant: "destructive",
            })
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

    // Sort purities in ascending order
    const sortedPurities = [...purities].sort((a, b) => {
      // Convert to numeric values for comparison
      const getNumericValue = (purity: string): number => {
        if (purity.endsWith('K')) {
          // For gold: 24K = 24, 18K = 18, etc.
          return parseInt(purity.replace('K', ''))
        } else {
          // For silver/platinum: 925 = 925, 900 = 900, etc.
          return parseInt(purity)
        }
      }
      return getNumericValue(a) - getNumericValue(b)
    })

    return sortedPurities.map((purity) => {
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

  function handleClearAll(metalType: MetalType) {
    const purities =
      metalType === "GOLD"
        ? GOLD_PURITIES
        : metalType === "SILVER"
        ? SILVER_PURITIES
        : PLATINUM_PURITIES
    
    purities.forEach((purity) => {
      handleClear(metalType, purity)
    })
  }

  function renderMetalTable(metalType: MetalType) {
    const rows = getRowsForMetal(metalType)
    const totals = getTotalsForMetal(metalType)

    return (
      <div className="overflow-x-auto -mx-2 sm:mx-0 rounded-lg border border-border/50 shadow-sm">
        <div className="min-w-full inline-block px-2 sm:px-0">
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
            <colgroup>
              <col style={{ width: '20%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '5%', minWidth: '40px' }} />
            </colgroup>
          <thead>
            <tr className="border-b-2 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 shadow-xl">
              <th className="text-center p-2 sm:p-3 md:p-4 font-bold text-base sm:text-lg">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary drop-shadow-lg" />
                  <span className="drop-shadow-md">Purity</span>
                </div>
              </th>
              <th className="text-center p-2 sm:p-3 md:p-4 font-bold text-base sm:text-lg">
                <div className="flex items-center justify-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary drop-shadow-lg" />
                  <span className="drop-shadow-md">Price/DWT</span>
                </div>
              </th>
              <th className="text-center p-2 sm:p-3 md:p-4 font-bold text-base sm:text-lg">
                <div className="flex items-center justify-center gap-2">
                  <Scale className="h-4 w-4 text-primary drop-shadow-lg" />
                  <span className="drop-shadow-md">DWT</span>
                </div>
              </th>
              <th className="text-center p-2 sm:p-3 md:p-4 font-bold text-base sm:text-lg">
                <div className="flex items-center justify-center gap-2">
                  <Calculator className="h-4 w-4 text-primary drop-shadow-lg" />
                  <span className="drop-shadow-md">Price</span>
                </div>
              </th>
              <th className="text-center p-1 sm:p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr 
                key={row.purity} 
                className={`border-b transition-colors ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                } ${
                  row.dwt > 0 ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/40'
                }`}
              >
                <td className="p-2 sm:p-3 md:p-4 font-bold text-center overflow-hidden text-ellipsis text-base sm:text-lg">
                  {row.purity}
                </td>
                <td className="p-2 sm:p-3 md:p-4 text-center font-semibold overflow-hidden text-ellipsis text-base sm:text-lg text-muted-foreground">
                  ${row.pricePerOz.toFixed(2)}
                </td>
                <td className="p-2 sm:p-3 md:p-4 text-center">
                  <div className="flex justify-center items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.dwt || ""}
                      onChange={(e) => handleDwtChange(metalType, row.purity, e.target.value)}
                      className={`w-full max-w-24 sm:max-w-28 text-center font-bold text-base sm:text-lg transition-all ${
                        row.dwt > 0 
                          ? 'bg-primary/10 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20' 
                          : 'bg-background'
                      }`}
                      placeholder="0.00"
                    />
                    {row.saving && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                  </div>
                </td>
                <td className={`p-2 sm:p-3 md:p-4 text-center font-bold overflow-hidden text-ellipsis text-base sm:text-lg ${
                  row.lineTotal > 0 ? 'text-primary' : ''
                }`}>
                  ${row.lineTotal.toFixed(2)}
                </td>
                <td className="p-1 sm:p-2 text-center">
                  {row.dwt > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleClear(metalType, row.purity)}
                      className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Clear DWT"
                    >
                      <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-4 border-primary/30 bg-primary/5 font-bold">
              <td className="p-2 sm:p-3 md:p-4 text-center overflow-hidden text-ellipsis text-base sm:text-lg">
                <div className="flex items-center justify-center gap-2">
                  <Calculator className="h-4 w-4" />
                  <span>Total</span>
                </div>
              </td>
              <td className="p-2 sm:p-3 md:p-4 text-center overflow-hidden text-ellipsis text-base sm:text-lg">—</td>
              <td className="p-2 sm:p-3 md:p-4 text-center overflow-hidden text-ellipsis text-base sm:text-lg text-primary">
                {totals.totalDwt.toFixed(2)}
              </td>
              <td className="p-2 sm:p-3 md:p-4 text-center overflow-hidden text-ellipsis text-lg sm:text-xl text-primary">
                ${totals.totalPrice.toFixed(2)}
              </td>
              <td className="p-1 sm:p-2">
                {totals.totalDwt > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleClearAll(metalType)}
                    className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                    title="Clear all DWT values"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
        </div>
      </div>
    )
  }

  // If metalType is specified, render only that metal type
  if (metalType) {
    const metalName = metalType.charAt(0) + metalType.slice(1).toLowerCase()
    const spotPrice =
      metalType === "GOLD"
        ? spotPrices.gold
        : metalType === "SILVER"
        ? spotPrices.silver
        : spotPrices.platinum

    return (
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-center mb-4 sm:mb-6 flex items-center justify-center gap-3 sm:gap-4">
            <div className="relative h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 flex-shrink-0">
              {!imageErrors[metalType] ? (
                <img
                  src={`/metals/${metalType.toLowerCase()}.png`}
                  alt={metalName}
                  className="object-contain w-full h-full drop-shadow-lg"
                  onError={() => {
                    setImageErrors((prev) => ({ ...prev, [metalType]: true }))
                  }}
                  style={{ 
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <div className="h-full w-full bg-primary/20 border-2 border-primary/30 rounded-full flex items-center justify-center">
                  <span className="text-primary font-bold text-lg sm:text-xl">{metalName.charAt(0)}</span>
                </div>
              )}
            </div>
            <span className="bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent drop-shadow-lg">
              {metalName}
            </span>
          </CardTitle>
          {userRole === "ADMIN" && (
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 bg-primary/5 rounded-lg p-4 sm:p-5 border border-primary/20 shadow-md">
              <label className="text-base sm:text-lg md:text-xl font-bold text-foreground">{metalName} Spot Price (per oz):</label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={spotPrice || ""}
                  onChange={(e) => handlePriceChange(metalType, e.target.value)}
                  className="w-28 sm:w-36 md:w-40 text-center text-base sm:text-lg md:text-xl font-bold border-2 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="0.00"
                />
                {savingPrice[metalType.toLowerCase()] && (
                  <Badge variant="outline" className="text-sm sm:text-base whitespace-nowrap font-semibold">
                    Saving...
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-2 sm:p-6">{renderMetalTable(metalType)}</CardContent>
      </Card>
    )
  }

  // Show all metal tables stacked vertically (no carousel)
  return (
    <div className="space-y-4">
      {/* Price Snapshot Marquee */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-2 border-primary/20 rounded-lg shadow-lg py-4">
        <div className="flex animate-marquee whitespace-nowrap">
          {/* Duplicate content for seamless loop */}
          {[...Array(3)].map((_, loopIndex) => (
            <div key={loopIndex} className="flex items-center gap-8 px-8">
              <div className="flex items-center gap-3 bg-background/80 backdrop-blur-sm px-6 py-3 rounded-lg border border-primary/30 shadow-md">
                <div className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                  {!imageErrors.GOLD ? (
                    <img
                      src="/metals/gold.png"
                      alt="Gold"
                      className="object-contain w-full h-full"
                      onError={() => {
                        setImageErrors((prev) => ({ ...prev, GOLD: true }))
                      }}
                      style={{ 
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <div className="h-full w-full bg-amber-500/20 border-2 border-amber-500/30 rounded-full flex items-center justify-center">
                      <span className="text-amber-600 font-bold text-sm">G</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Gold</p>
                  <p className="text-lg sm:text-xl font-bold text-amber-600">${spotPrices.gold.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-background/80 backdrop-blur-sm px-6 py-3 rounded-lg border border-primary/30 shadow-md">
                <div className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                  {!imageErrors.SILVER ? (
                    <img
                      src="/metals/silver.png"
                      alt="Silver"
                      className="object-contain w-full h-full"
                      onError={() => {
                        setImageErrors((prev) => ({ ...prev, SILVER: true }))
                      }}
                      style={{ 
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-400/20 border-2 border-gray-400/30 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-bold text-sm">S</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Silver</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-600">${spotPrices.silver.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-background/80 backdrop-blur-sm px-6 py-3 rounded-lg border border-primary/30 shadow-md">
                <div className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                  {!imageErrors.PLATINUM ? (
                    <img
                      src="/metals/platinum.png"
                      alt="Platinum"
                      className="object-contain w-full h-full"
                      onError={() => {
                        setImageErrors((prev) => ({ ...prev, PLATINUM: true }))
                      }}
                      style={{ 
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <div className="h-full w-full bg-slate-300/20 border-2 border-slate-300/30 rounded-full flex items-center justify-center">
                      <span className="text-slate-600 font-bold text-sm">P</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Platinum</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-600">${spotPrices.platinum.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Metal Tables Stacked */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-center mb-4 sm:mb-6 flex items-center justify-center gap-3 sm:gap-4">
              <div className="relative h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 flex-shrink-0">
                {!imageErrors.GOLD ? (
                  <img
                    src="/metals/gold.png"
                    alt="Gold"
                    className="object-contain w-full h-full drop-shadow-lg"
                    onError={() => {
                      setImageErrors((prev) => ({ ...prev, GOLD: true }))
                    }}
                    style={{ 
                      display: 'block',
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <div className="h-full w-full bg-amber-500/20 border-2 border-amber-500/30 rounded-full flex items-center justify-center">
                    <span className="text-amber-600 font-bold text-lg sm:text-xl">G</span>
                  </div>
                )}
              </div>
              <span className="bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent drop-shadow-lg">
                Gold
              </span>
            </CardTitle>
            {userRole === "ADMIN" && (
              <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 bg-primary/5 rounded-lg p-4 sm:p-5 border border-primary/20 shadow-md">
                <label className="text-base sm:text-lg md:text-xl font-bold text-foreground">Gold Spot Price (per oz):</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={spotPrices.gold || ""}
                    onChange={(e) => handlePriceChange("GOLD", e.target.value)}
                    className="w-28 sm:w-36 md:w-40 text-center text-base sm:text-lg md:text-xl font-bold border-2 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="0.00"
                  />
                  {savingPrice.gold && (
                    <Badge variant="outline" className="text-sm sm:text-base whitespace-nowrap font-semibold">
                      Saving...
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-2 sm:p-6">{renderMetalTable("GOLD")}</CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-center mb-4 sm:mb-6 flex items-center justify-center gap-3 sm:gap-4">
              <div className="relative h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 flex-shrink-0">
                {!imageErrors.SILVER ? (
                  <img
                    src="/metals/silver.png"
                    alt="Silver"
                    className="object-contain w-full h-full drop-shadow-lg"
                    onError={() => {
                      setImageErrors((prev) => ({ ...prev, SILVER: true }))
                    }}
                    style={{ 
                      display: 'block',
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <div className="h-full w-full bg-gray-400/20 border-2 border-gray-400/30 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-bold text-lg sm:text-xl">S</span>
                  </div>
                )}
              </div>
              <span className="bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent drop-shadow-lg">
                Silver
              </span>
            </CardTitle>
            {userRole === "ADMIN" && (
              <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 bg-primary/5 rounded-lg p-4 sm:p-5 border border-primary/20 shadow-md">
                <label className="text-base sm:text-lg md:text-xl font-bold text-foreground">Silver Spot Price (per oz):</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={spotPrices.silver || ""}
                    onChange={(e) => handlePriceChange("SILVER", e.target.value)}
                    className="w-28 sm:w-36 md:w-40 text-center text-base sm:text-lg md:text-xl font-bold border-2 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="0.00"
                  />
                  {savingPrice.silver && (
                    <Badge variant="outline" className="text-sm sm:text-base whitespace-nowrap font-semibold">
                      Saving...
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-2 sm:p-6">{renderMetalTable("SILVER")}</CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-center mb-4 sm:mb-6 flex items-center justify-center gap-3 sm:gap-4">
              <div className="relative h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 flex-shrink-0">
                {!imageErrors.PLATINUM ? (
                  <img
                    src="/metals/platinum.png"
                    alt="Platinum"
                    className="object-contain w-full h-full drop-shadow-lg"
                    onError={() => {
                      setImageErrors((prev) => ({ ...prev, PLATINUM: true }))
                    }}
                    style={{ 
                      display: 'block',
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <div className="h-full w-full bg-slate-300/20 border-2 border-slate-300/30 rounded-full flex items-center justify-center">
                    <span className="text-slate-600 font-bold text-lg sm:text-xl">P</span>
                  </div>
                )}
              </div>
              <span className="bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent drop-shadow-lg">
                Platinum
              </span>
            </CardTitle>
            {userRole === "ADMIN" && (
              <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 bg-primary/5 rounded-lg p-4 sm:p-5 border border-primary/20 shadow-md">
                <label className="text-base sm:text-lg md:text-xl font-bold text-foreground">Platinum Spot Price (per oz):</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={spotPrices.platinum || ""}
                    onChange={(e) => handlePriceChange("PLATINUM", e.target.value)}
                    className="w-28 sm:w-36 md:w-40 text-center text-base sm:text-lg md:text-xl font-bold border-2 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="0.00"
                  />
                  {savingPrice.platinum && (
                    <Badge variant="outline" className="text-sm sm:text-base whitespace-nowrap font-semibold">
                      Saving...
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-2 sm:p-6">{renderMetalTable("PLATINUM")}</CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 sticky bottom-2 sm:bottom-4 bg-background p-2 sm:p-3 md:p-4 border rounded-lg shadow-lg z-50 mx-2 sm:mx-0">
        <Button onClick={onPrint} className="flex-1 w-full sm:w-auto text-sm sm:text-base" size="lg">
          <Printer className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <span className="whitespace-nowrap">Print</span>
        </Button>
        <Button onClick={onNewTransaction} variant="outline" size="lg" className="w-full sm:w-auto whitespace-normal sm:whitespace-nowrap text-sm sm:text-base">
          <span className="text-center">Start New {transaction.type} Transaction</span>
        </Button>
      </div>
    </div>
  )
}

