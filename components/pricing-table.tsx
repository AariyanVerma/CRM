"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { useSocketPrices } from "@/hooks/use-socket-prices"
import { useSocketTransaction } from "@/hooks/use-socket-transaction"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Printer, RotateCcw, DollarSign, Scale, Calculator, Sparkles, Star } from "lucide-react"
import {
  getScrapPricingRows,
  getMeltPricingRows,
  type MetalType,
  GOLD_PURITIES,
  SILVER_PURITIES,
  PLATINUM_PURITIES,
} from "@/lib/pricing"
import { formatDecimal } from "@/lib/utils"

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
  goldSpot: number
  silverSpot: number
  platinumSpot: number
  lineItems: LineItem[]
}

function buildDraftLineItems(
  type: "SCRAP" | "MELT",
  dwtValues: Record<string, number>,
  purityPercentages: Record<string, number | string>,
  spotPrices: { gold: number | ""; silver: number | ""; platinum: number | "" },
  percentages: Record<string, number | string>
): LineItem[] {
  const gold = typeof spotPrices.gold === "number" ? spotPrices.gold : parseFloat(String(spotPrices.gold)) || 0
  const silver = typeof spotPrices.silver === "number" ? spotPrices.silver : parseFloat(String(spotPrices.silver)) || 0
  const platinum = typeof spotPrices.platinum === "number" ? spotPrices.platinum : parseFloat(String(spotPrices.platinum)) || 0
  const pct = (key: string) => {
    const v = percentages[key]
    return typeof v === "number" ? v : parseFloat(String(v)) || 95
  }
  const items: LineItem[] = []
  let id = 0
  if (type === "SCRAP") {
    for (const metalType of ["GOLD", "SILVER", "PLATINUM"] as MetalType[]) {
      const purities = metalType === "GOLD" ? GOLD_PURITIES : metalType === "SILVER" ? SILVER_PURITIES : PLATINUM_PURITIES
      const spot = metalType === "GOLD" ? gold : metalType === "SILVER" ? silver : platinum
      const metalTypeCamel = metalType.charAt(0) + metalType.slice(1).toLowerCase()
      const pctKey = `scrap${metalTypeCamel.charAt(0).toUpperCase() + metalTypeCamel.slice(1)}`
      const percentage = pct(pctKey)
      const currentDwt: Record<string, number> = {}
      purities.forEach((p) => { currentDwt[p] = dwtValues[`${metalType}-${p}`] ?? 0 })
      const rows = getScrapPricingRows(metalType, spot, currentDwt, percentage)
      rows.forEach((row) => {
        if (row.dwt > 0) {
          items.push({
            id: `draft-${++id}`,
            metalType,
            purityLabel: row.purity,
            dwt: row.dwt,
            pricePerOz: row.pricePerDWT,
            lineTotal: row.lineTotal,
          })
        }
      })
    }
  } else {
    for (const metalType of ["GOLD", "SILVER", "PLATINUM"] as MetalType[]) {
      const spot = metalType === "GOLD" ? gold : metalType === "SILVER" ? silver : platinum
      const metalTypeCamel = metalType.charAt(0) + metalType.slice(1).toLowerCase()
      const pctKey = `melt${metalTypeCamel.charAt(0).toUpperCase() + metalTypeCamel.slice(1)}`
      const percentage = pct(pctKey)
      const key = metalType
      const dwt = dwtValues[key] ?? 0
      const purityPct = typeof purityPercentages[key] === "number" ? purityPercentages[key] : parseFloat(String(purityPercentages[key] || 0)) || 0
      const rows = getMeltPricingRows(metalType, spot, { [key]: dwt }, { [key]: purityPct }, percentage)
      rows.forEach((row) => {
        items.push({
          id: `draft-${++id}`,
          metalType,
          purityLabel: row.purity,
          dwt: row.dwt,
          pricePerOz: row.pricePerDWT,
          lineTotal: row.lineTotal,
          purityPercentage: row.purityPercentage ?? null,
        })
      })
    }
  }
  return items
}

export function PricingTable({
  transaction,
  onPrint,
  onNewTransaction,
  metalType,
  userRole = "STAFF",
  onLineItemsUpdate,
  readOnly = false,
  canPrint = true,
  approvalStatus = null,
  onSendForApproval,
  pendingAdminName,
  customBottom,
  initialPercentages,
}: {
  transaction: Transaction
  onPrint: () => void
  onNewTransaction: () => void
  metalType?: MetalType
  userRole?: "ADMIN" | "STAFF"
  onLineItemsUpdate?: (lineItems: LineItem[]) => void
  readOnly?: boolean
  canPrint?: boolean
  approvalStatus?: "PENDING" | "APPROVED" | "DENIED" | null
  onSendForApproval?: () => void
  pendingAdminName?: string | null
  customBottom?: React.ReactNode
  initialPercentages?: Record<string, number | string>
}) {
  const { toast } = useToast()
  const [dwtValues, setDwtValues] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [spotPrices, setSpotPrices] = useState<{ gold: number | ""; silver: number | ""; platinum: number | "" }>({
    gold: transaction.goldSpot,
    silver: transaction.silverSpot,
    platinum: transaction.platinumSpot,
  })

  const [percentages, setPercentages] = useState<Record<string, number | string>>(
    initialPercentages ?? {}
  )

  const [purityPercentages, setPurityPercentages] = useState<Record<string, number | string>>({})
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const lastEditTimeRef = useRef<Record<string, number>>({})
  const isTypingRef = useRef<Record<string, boolean>>({})
  const focusedFieldRef = useRef<string | null>(null)
  const pendingPriceRef = useRef<Record<string, number>>({})
  const spotPricesRef = useRef(spotPrices)
  spotPricesRef.current = spotPrices
  const percentagesRef = useRef(percentages)
  percentagesRef.current = percentages
  const dwtValuesRef = useRef(dwtValues)
  dwtValuesRef.current = dwtValues
  const purityPercentagesRef = useRef(purityPercentages)
  purityPercentagesRef.current = purityPercentages
  const originalPercentagesRef = useRef<Record<string, number | string | undefined>>({})

  const isDraft = !transaction.id
  const isStaffLocked = userRole === "STAFF" && approvalStatus !== null
  const isReadOnly = readOnly || isStaffLocked

  const [pendingPercentageChange, setPendingPercentageChange] = useState<{
    metalType: MetalType
    value: number
    scope: "GLOBAL" | "LOCAL" | null
  } | null>(null)
  const [isPercentageScopeDialogOpen, setIsPercentageScopeDialogOpen] = useState(false)

  useEffect(() => {
    if (isDraft) return
    const values: Record<string, number> = {}
    const purityValues: Record<string, number> = {}
    transaction.lineItems.forEach((item) => {
      const key = transaction.type === "MELT" ? item.metalType : `${item.metalType}-${item.purityLabel}`
      const existing = values[key]
      if (transaction.type === "MELT" && existing !== undefined) {
        values[key] = existing + item.dwt
      } else {
        values[key] = item.dwt
      }
      if (transaction.type === "MELT" && item.purityPercentage !== undefined && item.purityPercentage !== null) {
        purityValues[key] = item.purityPercentage
      }
    })
    setDwtValues(values)
    setPurityPercentages(purityValues)
  }, [transaction.lineItems, transaction.type, isDraft])

  useSocketPrices(
    useCallback((prices) => {
      setSpotPrices({
        gold: prices.gold,
        silver: prices.silver,
        platinum: prices.platinum,
      })

      const isTypingAnyPercentage = Object.keys(isTypingRef.current).some(key => 
        key.startsWith('percentage-') && isTypingRef.current[key]
      )
      
      if (!isTypingAnyPercentage) {
        setPercentages(prev => {

          const newPercentages = {
            scrapGold: prices.scrapGoldPercentage,
            scrapSilver: prices.scrapSilverPercentage,
            scrapPlatinum: prices.scrapPlatinumPercentage,
            meltGold: prices.meltGoldPercentage,
            meltSilver: prices.meltSilverPercentage,
            meltPlatinum: prices.meltPlatinumPercentage,
          }

          const hasChanges = 
            prev.scrapGold !== newPercentages.scrapGold ||
            prev.scrapSilver !== newPercentages.scrapSilver ||
            prev.scrapPlatinum !== newPercentages.scrapPlatinum ||
            prev.meltGold !== newPercentages.meltGold ||
            prev.meltSilver !== newPercentages.meltSilver ||
            prev.meltPlatinum !== newPercentages.meltPlatinum
            
          return hasChanges ? newPercentages : prev
        })
      }
    }, []),
    { enabled: true }
  )

  useSocketTransaction(
    transaction.id ?? "",
    useCallback((lineItems) => {

      if (onLineItemsUpdate) {
        onLineItemsUpdate(lineItems)
      }

      const values: Record<string, number> = {}
      const purityValues: Record<string, number> = {}
      
      lineItems.forEach((item) => {

        const key = transaction.type === "MELT" ? item.metalType : `${item.metalType}-${item.purityLabel}`
        values[key] = item.dwt

        if (transaction.type === "MELT") {

          if (item.purityPercentage !== undefined && item.purityPercentage !== null) {
            const purityNum = typeof item.purityPercentage === 'number' ? item.purityPercentage : parseFloat(String(item.purityPercentage))
            if (!isNaN(purityNum)) {
              purityValues[key] = purityNum
            }
          }
        }
      })

      lineItems.forEach((item: any) => {

        const key = transaction.type === "MELT" ? item.metalType : `${item.metalType}-${item.purityLabel}`
        lastSavedValuesRef.current[key] = {
          dwt: item.dwt,
          purityPercentage: transaction.type === "MELT" ? (item.purityPercentage ?? undefined) : undefined
        }
      })

      setDwtValues((prev) => {
        const now = Date.now()
        const updated = { ...prev }
        let hasChanges = false

        Object.keys(values).forEach((key) => {
          if (focusedFieldRef.current === key) return
          const lastEditTime = lastEditTimeRef.current[key] || 0
          const timeSinceEdit = now - lastEditTime

          if (prev[key] !== values[key] && timeSinceEdit > 500) {
            updated[key] = values[key]
            hasChanges = true
          }
        })

        Object.keys(prev).forEach((key) => {
          if (!(key in values) && prev[key] !== 0) {
            if (focusedFieldRef.current === key) return
            const lastEditTime = lastEditTimeRef.current[key] || 0
            const timeSinceEdit = now - lastEditTime
            
            if (timeSinceEdit > 500) {
              delete updated[key]
              hasChanges = true

              delete lastSavedValuesRef.current[key]
            }
          }
        })
        
        return hasChanges ? updated : prev
      })

      if (transaction.type === "MELT") {
        setPurityPercentages((prev) => {
          const now = Date.now()
          const updated = { ...prev }
          let hasChanges = false

          Object.keys(purityValues).forEach((key) => {
            const focusKey = `purity-${key}`
            if (focusedFieldRef.current === focusKey) return
            const lastEditTime = lastEditTimeRef.current[focusKey] || 0
            const timeSinceEdit = now - lastEditTime

            const currentValue = prev[key]
            const newValue = purityValues[key]

            const valueChanged = currentValue !== newValue
            
            if (valueChanged && timeSinceEdit > 500) {
              updated[key] = newValue
              hasChanges = true
            }
          })

          Object.keys(prev).forEach((key) => {
            if (!(key in purityValues)) {
              const focusKey = `purity-${key}`
              if (focusedFieldRef.current === focusKey) return
              const lastEditTime = lastEditTimeRef.current[focusKey] || 0
              const timeSinceEdit = now - lastEditTime
              
              if (timeSinceEdit > 500) {
                delete updated[key]
                hasChanges = true
              }
            }
          })
          
          return hasChanges ? updated : prev
        })
      }
    }, [transaction.type, onLineItemsUpdate]),
    { enabled: !isDraft }
  )

  const inFlightRequestsRef = useRef<Set<string>>(new Set())

  const lastSavedValuesRef = useRef<Record<string, { dwt: number; purityPercentage?: number }>>({})

  const saveLineItemBlur = useCallback(
    async (metalType: MetalType, purity: string, dwt: number, purityPercentage?: number) => {
      const key = transaction.type === "MELT" ? metalType : `${metalType}-${purity}`

      if (isDraft) {
        if (onLineItemsUpdate) {
          try {
            const latestDwt = { ...dwtValuesRef.current, [key]: dwt }
            const latestPurity = transaction.type === "MELT" && purityPercentage !== undefined
              ? { ...purityPercentagesRef.current, [key]: purityPercentage }
              : purityPercentagesRef.current
            const items = buildDraftLineItems(
              transaction.type,
              latestDwt,
              latestPurity,
              spotPricesRef.current,
              percentagesRef.current
            )
            onLineItemsUpdate(items)
          } catch (e) {
            console.error("Error building draft line items:", e)
          }
        }
        return
      }

      if (inFlightRequestsRef.current.has(key)) return

      const currentDwt = parseFloat(String(dwt)) || 0
      const currentPurityPct = purityPercentage !== undefined ? purityPercentage : (typeof purityPercentages[key] === "number" ? purityPercentages[key] : parseFloat(String(purityPercentages[key] || 0)) ?? 0)
      const lastSaved = lastSavedValuesRef.current[key]
      if (lastSaved && lastSaved.dwt === currentDwt && (transaction.type !== "MELT" || lastSaved.purityPercentage === currentPurityPct)) return

      inFlightRequestsRef.current.add(key)
      setSaving((prev) => ({ ...prev, [key]: true }))

      try {
        const body: Record<string, unknown> = { metalType, purityLabel: purity, dwt: currentDwt }
        if (transaction.type === "MELT") (body as Record<string, number>).purityPercentage = currentPurityPct

        const res = await fetch(`/api/transactions/${transaction.id}/line-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "include",
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error((errorData as { message?: string }).message || "Failed to save")
        }

        await res.json().catch(() => ({}))

        if (onLineItemsUpdate) {
          try {
            const latest = await fetch(`/api/transactions/${transaction.id}/line-items`, { method: "GET", credentials: "include" })
            if (latest.ok) {
              const data = await latest.json().catch(() => ({})) as { lineItems?: unknown[] }
              if (Array.isArray(data.lineItems)) onLineItemsUpdate(data.lineItems as LineItem[])
            }
          } catch (e) {
            console.error("Error refreshing line items after save:", e)
          }
        }

        lastSavedValuesRef.current[key] = { dwt: currentDwt, purityPercentage: transaction.type === "MELT" ? currentPurityPct : undefined }
        toast({ title: "Saved", description: `${purity} ${metalType} updated`, variant: "success" })
      } catch (error) {
        console.error("Error saving line item:", error)
        toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to save line item", variant: "destructive" })
      } finally {
        inFlightRequestsRef.current.delete(key)
        setSaving((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      }
    },
    [transaction.id, transaction.type, toast, purityPercentages, onLineItemsUpdate, isDraft]
  )

  const debouncedSave = saveLineItemBlur

  function handleDwtChange(metalType: MetalType, purity: string, value: string, purityPercentage?: number) {
    if (isReadOnly) return
    const numValue = parseFloat(value) || 0
    if (numValue < 0) return

    const key = transaction.type === "MELT" ? metalType : `${metalType}-${purity}`

    const currentValue = dwtValues[key] ?? 0
    if (currentValue === numValue) {

      return
    }
    
    lastEditTimeRef.current[key] = Date.now()
    setDwtValues((prev) => ({ ...prev, [key]: numValue }))
  }

  function handleDwtBlur(metalType: MetalType, purity: string) {
    const key = transaction.type === "MELT" ? metalType : `${metalType}-${purity}`
    focusedFieldRef.current = null
    const dwt = dwtValuesRef.current[key] ?? dwtValues[key] ?? 0
    const purityPctValue = purityPercentagesRef.current[key] ?? purityPercentages[key] ?? 0
    const currentPurityPercentage = typeof purityPctValue === "string" ? parseFloat(purityPctValue) || 0 : purityPctValue
    const purityParam = transaction.type === "MELT" ? metalType : purity
    void saveLineItemBlur(metalType, purityParam, dwt, currentPurityPercentage)
  }

  function handlePriceChange(metalType: MetalType, value: string) {
    if (isReadOnly) return
    const numValue = parseFloat(value) || 0
    if (numValue < 0) return

    const metalKey = metalType.toLowerCase()

    setSpotPrices((prev) => ({
      ...prev,
      [metalKey]: numValue,
    }))

    pendingPriceRef.current[metalKey] = numValue
  }

  async function handleSpotBlur(metalKey: "gold" | "silver" | "platinum", e: React.FocusEvent<HTMLInputElement>) {
    const raw = e.target.value
    if (raw === "" || raw === null || raw === undefined) return
    const num = parseFloat(raw)
    if (isNaN(num) || num < 0) return
    try {
      const res = await fetch("/api/admin/prices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metalType: metalKey, price: num }),
        credentials: "include",
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to update price" }))
        throw new Error((errorData as { message?: string }).message || "Failed to update price")
      }
      await res.json()
      toast({ title: "Price updated", description: `${metalKey} spot price updated to $${formatDecimal(num)}`, variant: "success" })
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update price", variant: "destructive" })
    }
  }

  function handleSpotFocus(metalKey: "gold" | "silver" | "platinum") {
    setSpotPrices((prev) => ({ ...prev, [metalKey]: "" }))
  }

  function handlePercentageFocus(metalType: MetalType) {
    const metalTypeCamel = metalType.charAt(0) + metalType.slice(1).toLowerCase()
    const key = `${transaction.type.toLowerCase()}${metalTypeCamel.charAt(0).toUpperCase() + metalTypeCamel.slice(1)}`
    const typingKey = `percentage-${key}`
    originalPercentagesRef.current[key] = percentagesRef.current[key]
    isTypingRef.current[typingKey] = true
    setPercentages((prev) => ({ ...prev, [key]: "" }))
  }

  function handlePercentageBlur(metalType: MetalType, e: React.FocusEvent<HTMLInputElement>) {
    const transactionTypeLower = transaction.type.toLowerCase()
    const metalTypeCamel = metalType.charAt(0) + metalType.slice(1).toLowerCase()
    const key = `${transactionTypeLower}${metalTypeCamel.charAt(0).toUpperCase() + metalTypeCamel.slice(1)}`
    const typingKey = `percentage-${key}`
    isTypingRef.current[typingKey] = false

    const raw = e.target.value
    if (raw === "" || raw === null || raw === undefined) return
    const percentageValue = parseFloat(raw)
    if (isNaN(percentageValue) || percentageValue < 0 || percentageValue > 100) return

    if (userRole === "ADMIN") {
      setPendingPercentageChange({ metalType, value: percentageValue, scope: null })
      setIsPercentageScopeDialogOpen(true)
      return
    }

    const percentageKey = `${transaction.type.toLowerCase()}${metalType.charAt(0).toUpperCase() + metalType.slice(1).toLowerCase()}Percentage`
    const currentSpotPrice = spotPricesRef.current[metalType.toLowerCase() as keyof typeof spotPricesRef.current]
    const priceNum = Number(currentSpotPrice) || 0
    const requestBody: Record<string, unknown> = {
      metalType: metalType.toLowerCase(),
      price: priceNum,
      transactionType: transaction.type,
      [percentageKey]: percentageValue,
    }

    fetch("/api/admin/prices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: "Failed to update percentage" }))
          throw new Error((errorData as { message?: string }).message || "Failed to update percentage")
        }
        return res.json()
      })
      .then(() => {
        toast({
          title: "Percentage updated",
          description: `${metalType} ${transaction.type.toLowerCase()} percentage updated to ${formatDecimal(percentageValue)}%`,
          variant: "success",
        })
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update percentage",
          variant: "destructive",
        })
      })
  }

  function handlePercentageChange(metalType: MetalType, value: string) {
    if (isReadOnly) return
    const transactionTypeLower = transaction.type.toLowerCase()
    const metalTypeCamel = metalType.charAt(0) + metalType.slice(1).toLowerCase()
    const key = `${transactionTypeLower}${metalTypeCamel.charAt(0).toUpperCase() + metalTypeCamel.slice(1)}`
    const typingKey = `percentage-${key}`

    isTypingRef.current[typingKey] = true

    if (value === "" || value === null || value === undefined) {
      setPercentages(prev => ({
        ...prev,
        [key]: ""
      }))

      setTimeout(() => {
        if (value === "") {
          isTypingRef.current[typingKey] = false
        }
      }, 100)
      return
    }

    const numValue = parseFloat(value)

    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setPercentages(prev => ({
        ...prev,
        [key]: numValue
      }))

    } else if (value.match(/^[0-9]*\.?[0-9]*$/)) {

      setPercentages(prev => ({
        ...prev,
        [key]: value
      }))

    }
  }

  async function applyPercentageChangeScope() {
    if (!pendingPercentageChange || !pendingPercentageChange.scope) return
    const { metalType, value, scope } = pendingPercentageChange
    const percentageValue = value

    if (scope === "GLOBAL") {
      try {
        const transactionTypeLower = transaction.type.toLowerCase()
        const metalTypeCamel = metalType.charAt(0) + metalType.slice(1).toLowerCase()
        const stateKey = `${transactionTypeLower}${metalTypeCamel.charAt(0).toUpperCase() + metalTypeCamel.slice(1)}`
        const percentageKey = `${stateKey}Percentage`
        const currentSpotPrice = spotPricesRef.current[metalType.toLowerCase() as keyof typeof spotPricesRef.current]
        const priceNum = Number(currentSpotPrice) || 0
        const requestBody: Record<string, unknown> = {
          metalType: metalType.toLowerCase(),
          price: priceNum,
          transactionType: transaction.type,
          [percentageKey]: percentageValue,
        }

        const res = await fetch("/api/admin/prices", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          credentials: "include",
        })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: "Failed to update percentage" }))
          throw new Error((errorData as { message?: string }).message || "Failed to update percentage")
        }
        await res.json()

        
        
        setPercentages(prev => ({
          ...prev,
          [stateKey]: percentageValue,
        }))
        percentagesRef.current = {
          ...percentagesRef.current,
          [stateKey]: percentageValue,
        }
        if (onLineItemsUpdate) {
          const items = buildDraftLineItems(
            transaction.type,
            dwtValuesRef.current,
            purityPercentagesRef.current,
            spotPricesRef.current,
            percentagesRef.current
          )
          onLineItemsUpdate(items)
        }
        toast({
          title: "Percentage updated",
          description: `${metalType} ${transaction.type.toLowerCase()} percentage updated to ${formatDecimal(percentageValue)}% for everyone`,
          variant: "success",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update percentage",
          variant: "destructive",
        })
      }
    } else {
      try {
        if (onLineItemsUpdate) {
          const items = buildDraftLineItems(
            transaction.type,
            dwtValuesRef.current,
            purityPercentagesRef.current,
            spotPricesRef.current,
            percentagesRef.current
          )
          onLineItemsUpdate(items)
        }
        toast({
          title: "Percentage updated",
          description: `${metalType} ${transaction.type.toLowerCase()} percentage updated only for this customer`,
          variant: "success",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to apply customer-only percentage",
          variant: "destructive",
        })
      }
    }

    setIsPercentageScopeDialogOpen(false)
    setPendingPercentageChange(null)
  }

  function resetPendingPercentageToOriginal() {
    if (!pendingPercentageChange) return
    const { metalType } = pendingPercentageChange
    const transactionTypeLower = transaction.type.toLowerCase()
    const metalTypeCamel = metalType.charAt(0) + metalType.slice(1).toLowerCase()
    const key = `${transactionTypeLower}${metalTypeCamel.charAt(0).toUpperCase() + metalTypeCamel.slice(1)}`
    const original = originalPercentagesRef.current[key]
    setPercentages((prev) => ({
      ...prev,
      [key]: original === undefined ? "" : original,
    }))
  }

  function handlePurityPercentageChange(metalType: MetalType, purity: string, value: string) {
    if (isReadOnly) return
    const key = transaction.type === "MELT" ? metalType : `${metalType}-${purity}`

    const currentValue = purityPercentages[key]
    const numValue = parseFloat(value)
    const currentNumValue = typeof currentValue === 'number' ? currentValue : (currentValue ? parseFloat(String(currentValue)) : NaN)

    if (value === "" || value === null || value === undefined) {

      if (currentValue !== undefined && currentValue !== null && currentValue !== "") {
        setPurityPercentages(prev => {
          const updated = { ...prev }
          delete updated[key]
          return updated
        })
      }

      return
    }

    if (!isNaN(numValue) && !isNaN(currentNumValue) && numValue === currentNumValue) {
      return
    }

    lastEditTimeRef.current[`purity-${key}`] = Date.now()
    
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {

      if (value.match(/^[0-9]*\.?[0-9]*$/)) {
        setPurityPercentages(prev => ({
          ...prev,
          [key]: value as any
        }))
      }
      return
    }
    
    setPurityPercentages(prev => ({
      ...prev,
      [key]: numValue
    }))

    const currentDwt = dwtValues[key] || 0
  }
  
  function handlePurityPercentageFocus(metalType: MetalType, purity: string, e: React.FocusEvent<HTMLInputElement>) {
    const key = transaction.type === "MELT" ? metalType : `${metalType}-${purity}`
    focusedFieldRef.current = `purity-${key}`

    const currentValue = purityPercentages[key] ?? 0

    if (currentValue === 0) {
      setPurityPercentages(prev => {
        const updated = { ...prev }
        delete updated[key]
        return updated
      })

      e.target.value = ""
    }
  }
  
  function handlePurityPercentageBlur(metalType: MetalType, purity: string, e: React.FocusEvent<HTMLInputElement>) {
    const key = transaction.type === "MELT" ? metalType : `${metalType}-${purity}`
    focusedFieldRef.current = null

    const value = e.target.value

    if (value === "" || value === null || value === undefined) {
      setPurityPercentages(prev => ({
        ...prev,
        [key]: 0
      }))
      const currentDwt = dwtValuesRef.current[key] ?? dwtValues[key] ?? 0
      const purityParam = transaction.type === "MELT" ? metalType : purity
      void saveLineItemBlur(metalType, purityParam, currentDwt, 0)
      return
    }

    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      const currentDwt = dwtValuesRef.current[key] ?? dwtValues[key] ?? 0
      const purityParam = transaction.type === "MELT" ? metalType : purity
      void saveLineItemBlur(metalType, purityParam, currentDwt, numValue)
    }
  }

  function handleClear(metalType: MetalType, purity: string) {

    const key = transaction.type === "MELT" ? metalType : `${metalType}-${purity}`
    setDwtValues((prev) => ({ ...prev, [key]: 0 }))
    if (transaction.type === "MELT") {
      setPurityPercentages((prev) => {
        const updated = { ...prev }
        delete updated[key]
        return updated
      })
      debouncedSave(metalType, metalType, 0)
    } else {
      debouncedSave(metalType, purity, 0)
    }
  }

  function getRowsForMetal(metalType: MetalType) {
    const spotPrice =
      metalType === "GOLD"
        ? spotPrices.gold
        : metalType === "SILVER"
        ? spotPrices.silver
        : spotPrices.platinum
    const spotPriceNum = Number(spotPrice) || 0

    if (transaction.type === "MELT") {
      const key = metalType
      const dwt = dwtValues[key] || 0
      const purityPctValue = purityPercentages[key] ?? 0
      const purityPercentage = typeof purityPctValue === 'string' ? parseFloat(purityPctValue) || 0 : purityPctValue

      const existingItem = transaction.lineItems.find(
        (item) => item.metalType === metalType
      )
      
      const metalTypeCamel = metalType.charAt(0) + metalType.slice(1).toLowerCase()
      const percentageKey = `melt${metalTypeCamel.charAt(0).toUpperCase() + metalTypeCamel.slice(1)}`
      const percentageValue = percentages[percentageKey]
      const percentage = typeof percentageValue === 'number' ? percentageValue : (typeof percentageValue === 'string' && percentageValue !== '' ? parseFloat(percentageValue) || 95 : 95)
      
      const rows = getMeltPricingRows(metalType, spotPriceNum, { [key]: dwt }, { [key]: purityPercentage }, percentage)
      const row = rows[0]

      
      
      
      const useLockedValues = isStaffLocked || readOnly
      const finalDwt = useLockedValues && existingItem ? existingItem.dwt : row.dwt
      const finalPricePerDWT = useLockedValues && existingItem ? existingItem.pricePerOz : row.pricePerDWT
      const finalLineTotal = useLockedValues && existingItem ? existingItem.lineTotal : row.lineTotal
      const finalPurityPercentage =
        useLockedValues && existingItem && existingItem.purityPercentage != null
          ? existingItem.purityPercentage
          : row.purityPercentage

      return [{
        purity: metalType,
        dwt: finalDwt,
        pricePerDWT: finalPricePerDWT,
        lineTotal: finalLineTotal,
        purityPercentage: finalPurityPercentage,
        saving: saving[key] || false,
        existingItem,
      }]
    }

    const purities =
      metalType === "GOLD"
        ? GOLD_PURITIES
        : metalType === "SILVER"
        ? SILVER_PURITIES
        : PLATINUM_PURITIES

    const sortedPurities = [...purities].sort((a, b) => {

      const getNumericValue = (purity: string): number => {
        if (purity.endsWith('K')) {

          return parseInt(purity.replace('K', ''))
        } else {

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

      let pricePerDWT = 0
      let lineTotal = 0

      const metalTypeCamel = metalType.charAt(0) + metalType.slice(1).toLowerCase()
      const percentageKey = `scrap${metalTypeCamel.charAt(0).toUpperCase() + metalTypeCamel.slice(1)}`
      const percentageValue = percentages[percentageKey]
      const percentage = typeof percentageValue === 'number' ? percentageValue : (typeof percentageValue === 'string' && percentageValue !== '' ? parseFloat(percentageValue) || 95 : 95)
      const rows = getScrapPricingRows(metalType, spotPriceNum, { [purity]: dwt }, percentage)
      const row = rows.find((r) => r.purity === purity)!

      if ((isStaffLocked || readOnly) && existingItem) {
        
        pricePerDWT = existingItem.pricePerOz
        lineTotal = existingItem.lineTotal
      } else {
        pricePerDWT = row.pricePerDWT
        lineTotal = row.lineTotal
      }

      return {
        purity,
        dwt,
        pricePerDWT,
        lineTotal,
        purityPercentage: undefined,
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
    if (transaction.type === "MELT") {

      handleClear(metalType, metalType)
    } else {

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
  }

  function renderMetalTable(metalType: MetalType) {
    const rows = getRowsForMetal(metalType)
    const totals = getTotalsForMetal(metalType)

    return (
      <div className="overflow-x-auto -mx-2 sm:mx-0 rounded-lg border border-border/50 shadow-sm">
        <div className="min-w-full inline-block px-2 sm:px-0">
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
            <colgroup>
              {transaction.type === "MELT" ? (
                <>
                  <col style={{ width: '33%' }} />
                  <col style={{ width: '33%' }} />
                  <col style={{ width: '33%' }} />
                  <col style={{ width: '1%', minWidth: '40px' }} />
                </>
              ) : (
                <>
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '5%', minWidth: '40px' }} />
                </>
              )}
            </colgroup>
          <thead>
            <tr className="border-b-2 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 shadow-xl">
              {transaction.type !== "MELT" && (
                <th className="text-center p-2 sm:p-3 md:p-4 font-extrabold text-base sm:text-lg text-red-600">
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4 text-red-600 drop-shadow-lg" />
                    <span className="drop-shadow-md">Purity</span>
                  </div>
                </th>
              )}
              <th className="text-center p-2 sm:p-3 md:p-4 font-extrabold text-base sm:text-lg text-red-600">
                <div className="flex items-center justify-center gap-2">
                  {transaction.type === "MELT" ? (
                    <>
                      <Sparkles className="h-4 w-4 text-red-600 drop-shadow-lg" />
                      <span className="drop-shadow-md">Purity %</span>
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4 text-red-600 drop-shadow-lg" />
                      <span className="drop-shadow-md">Price/DWT</span>
                    </>
                  )}
                </div>
              </th>
              <th className="text-center p-2 sm:p-3 md:p-4 font-extrabold text-base sm:text-lg text-red-600">
                <div className="flex items-center justify-center gap-2">
                  <Scale className="h-4 w-4 text-red-600 drop-shadow-lg" />
                  <span className="drop-shadow-md">DWT</span>
                </div>
              </th>
              <th className="text-center p-2 sm:p-3 md:p-4 font-extrabold text-base sm:text-lg text-red-600">
                <div className="flex items-center justify-center gap-2">
                  <Calculator className="h-4 w-4 text-red-600 drop-shadow-lg" />
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
                {transaction.type !== "MELT" && (
                  <td className="p-2 sm:p-3 md:p-4 font-black text-center overflow-hidden text-ellipsis text-base sm:text-lg text-red-600">
                    {row.purity}
                  </td>
                )}
                {transaction.type === "MELT" ? (
                  <td className="p-2 sm:p-3 md:p-4 text-center">
                    <div className="flex justify-center items-center">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={row.purityPercentage !== undefined && row.purityPercentage !== null && row.purityPercentage !== 0 ? row.purityPercentage : ""}
                        onChange={(e) => handlePurityPercentageChange(metalType, row.purity, e.target.value)}
                        onFocus={(e) => handlePurityPercentageFocus(metalType, row.purity, e)}
                        onBlur={(e) => handlePurityPercentageBlur(metalType, row.purity, e)}
                        disabled={isReadOnly}
                        className="w-full max-w-24 sm:max-w-28 text-center font-black text-base sm:text-lg text-red-600 transition-all bg-primary/10 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 mx-auto"
                        placeholder="0.00"
                      />
                    </div>
                  </td>
                ) : (
                  <td className="p-2 sm:p-3 md:p-4 text-center font-semibold overflow-hidden text-ellipsis text-base sm:text-lg text-muted-foreground">
                    ${formatDecimal(row.pricePerDWT)}
                  </td>
                )}
                <td className="p-2 sm:p-3 md:p-4 text-center">
                  <div className="flex justify-center items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.dwt || ""}
                      onChange={(e) => handleDwtChange(metalType, row.purity, e.target.value)}
                      onFocus={() => { const k = transaction.type === "MELT" ? metalType : `${metalType}-${row.purity}`; focusedFieldRef.current = k }}
                      onBlur={() => handleDwtBlur(metalType, row.purity)}
                      disabled={isReadOnly}
                      className={`w-full max-w-24 sm:max-w-28 text-center font-bold text-base sm:text-lg transition-all ${
                        row.dwt > 0 
                          ? 'bg-primary/10 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20' 
                          : 'bg-background'
                      }`}
                      placeholder="0.00"
                    />
                  </div>
                </td>
                <td className={`p-2 sm:p-3 md:p-4 text-center font-bold overflow-hidden text-ellipsis text-base sm:text-lg ${
                  row.lineTotal > 0 ? 'text-red-600' : ''
                }`}>
                  ${formatDecimal(row.lineTotal)}
                </td>
                <td className="p-1 sm:p-2 text-center">
                  {row.dwt > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleClear(metalType, row.purity)}
                      disabled={isReadOnly}
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
            <tr className="border-t-4 border-primary/30 bg-primary/5 font-black text-red-600">
              <td className="p-2 sm:p-3 md:p-4 text-center overflow-hidden text-ellipsis text-base sm:text-lg">
                <div className="flex items-center justify-center gap-2">
                  <Calculator className="h-4 w-4" />
                  <span>Total</span>
                </div>
              </td>
              {transaction.type !== "MELT" && (
                <td className="p-2 sm:p-3 md:p-4 text-center overflow-hidden text-ellipsis text-base sm:text-lg">—</td>
              )}
              <td className="p-2 sm:p-3 md:p-4 text-center overflow-hidden text-ellipsis text-base sm:text-lg">
                {formatDecimal(totals.totalDwt)}
              </td>
              <td className="p-2 sm:p-3 md:p-4 text-center overflow-hidden text-ellipsis text-lg sm:text-xl">
                ${formatDecimal(totals.totalPrice)}
              </td>
              <td className="p-1 sm:p-2">
                {totals.totalDwt > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleClearAll(metalType)}
                    disabled={isReadOnly}
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
        <CardHeader className={`p-3 sm:p-6 ${userRole === "STAFF" ? "pb-2 sm:pb-3" : ""}`}>
          <CardTitle className={`text-3xl sm:text-4xl md:text-5xl font-extrabold text-center flex items-center justify-center gap-3 sm:gap-4 ${userRole === "ADMIN" ? "mb-4 sm:mb-6" : "mb-0"}`}>
            <div className="relative h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 flex-shrink-0">
              {!imageErrors[metalType] ? (
                <Image
                  src={`/metals/${metalType.toLowerCase()}.png`}
                  alt={metalName}
                  fill
                  sizes="56px"
                  className="object-contain drop-shadow-lg"
                  onError={() => {
                    setImageErrors((prev) => ({ ...prev, [metalType]: true }))
                  }}
                />
              ) : (
                <div className="h-full w-full bg-primary/20 border-2 border-primary/30 rounded-full flex items-center justify-center">
                  <span className="text-red-600 font-bold text-lg sm:text-xl">{metalName.charAt(0)}</span>
                </div>
              )}
            </div>
<span className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent drop-shadow-lg">
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
                  value={spotPrice === "" ? "" : spotPrice}
                  onFocus={() => handleSpotFocus(metalType.toLowerCase() as "gold" | "silver" | "platinum")}
                  onChange={(e) => handlePriceChange(metalType, e.target.value)}
                  onBlur={(e) => handleSpotBlur(metalType.toLowerCase() as "gold" | "silver" | "platinum", e)}
                  disabled={isReadOnly}
                  className="w-28 sm:w-36 md:w-40 text-center text-base sm:text-lg md:text-xl font-bold border-2 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="0.00"
                />
              </div>
              <label className="text-base sm:text-lg md:text-xl font-black text-foreground">%</label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={(() => {
                    const key = `${transaction.type.toLowerCase()}${metalType.charAt(0).toUpperCase() + metalType.slice(1).toLowerCase()}`
                    const val = percentages[key]
                    if (val === "" || val === null || val === undefined) return ""
                    return String(val)
                  })()}
                  onFocus={() => handlePercentageFocus(metalType)}
                  onBlur={(e) => handlePercentageBlur(metalType, e)}
                  onChange={(e) => handlePercentageChange(metalType, e.target.value)}
                  disabled={isReadOnly}
                  className="w-28 sm:w-36 md:w-40 text-center text-base sm:text-lg md:text-xl font-bold border-2 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="95.00"
                />
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className={`p-2 sm:p-6 ${userRole === "STAFF" ? "pt-2 sm:pt-3" : ""}`}>{renderMetalTable(metalType)}</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {
}
      <div className="space-y-4">
        <Card>
          <CardHeader className={`p-3 sm:p-6 ${userRole === "STAFF" ? "pb-2 sm:pb-3" : ""}`}>
            <CardTitle className={`text-3xl sm:text-4xl md:text-5xl font-extrabold text-center flex items-center justify-center gap-3 sm:gap-4 ${userRole === "ADMIN" ? "mb-4 sm:mb-6" : "mb-0"}`}>
              <div className="relative h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 flex-shrink-0">
                {!imageErrors.GOLD ? (
                  <Image
                    src="/metals/gold.png"
                    alt="Gold"
                    fill
                    sizes="56px"
                    className="object-contain drop-shadow-lg"
                    onError={() => {
                      setImageErrors((prev) => ({ ...prev, GOLD: true }))
                    }}
                  />
                ) : (
                  <div className="h-full w-full bg-amber-500/20 border-2 border-amber-500/30 rounded-full flex items-center justify-center">
                    <span className="text-amber-600 font-bold text-lg sm:text-xl">G</span>
                  </div>
                )}
              </div>
              <span className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent drop-shadow-lg">
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
                    value={spotPrices.gold === "" ? "" : spotPrices.gold}
                    onFocus={() => handleSpotFocus("gold")}
                    onChange={(e) => handlePriceChange("GOLD", e.target.value)}
                    onBlur={(e) => handleSpotBlur("gold", e)}
                    disabled={isReadOnly}
                    className="w-28 sm:w-36 md:w-40 text-center text-base sm:text-lg md:text-xl font-bold border-2 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="0.00"
                  />
                </div>
                <label className="text-base sm:text-lg md:text-xl font-black text-foreground">%</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={(() => {
                      const key = `${transaction.type.toLowerCase()}Gold`
                      const val = percentages[key]
                      if (val === "" || val === null || val === undefined) return ""
                      return String(val)
                    })()}
                    onFocus={() => handlePercentageFocus("GOLD")}
                    onBlur={(e) => handlePercentageBlur("GOLD", e)}
                    onChange={(e) => handlePercentageChange("GOLD", e.target.value)}
                    disabled={isReadOnly}
                    className="w-28 sm:w-36 md:w-40 text-center text-base sm:text-lg md:text-xl font-bold border-2 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="95.00"
                  />
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className={`p-2 sm:p-6 ${userRole === "STAFF" ? "pt-2 sm:pt-3" : ""}`}>{renderMetalTable("GOLD")}</CardContent>
        </Card>

        <Card>
          <CardHeader className={`p-3 sm:p-6 ${userRole === "STAFF" ? "pb-2 sm:pb-3" : ""}`}>
            <CardTitle className={`text-3xl sm:text-4xl md:text-5xl font-extrabold text-center flex items-center justify-center gap-3 sm:gap-4 ${userRole === "ADMIN" ? "mb-4 sm:mb-6" : "mb-0"}`}>
              <div className="relative h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 flex-shrink-0">
                {!imageErrors.SILVER ? (
                  <Image
                    src="/metals/silver.png"
                    alt="Silver"
                    fill
                    sizes="56px"
                    className="object-contain drop-shadow-lg"
                    onError={() => {
                      setImageErrors((prev) => ({ ...prev, SILVER: true }))
                    }}
                  />
                ) : (
                  <div className="h-full w-full bg-gray-400/20 border-2 border-gray-400/30 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-bold text-lg sm:text-xl">S</span>
                  </div>
                )}
              </div>
              <span className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent drop-shadow-lg">
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
                    value={spotPrices.silver === "" ? "" : spotPrices.silver}
                    onFocus={() => handleSpotFocus("silver")}
                    onChange={(e) => handlePriceChange("SILVER", e.target.value)}
                    onBlur={(e) => handleSpotBlur("silver", e)}
                    disabled={isReadOnly}
                    className="w-28 sm:w-36 md:w-40 text-center text-base sm:text-lg md:text-xl font-bold border-2 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="0.00"
                  />
                </div>
                <label className="text-base sm:text-lg md:text-xl font-black text-foreground">%</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={(() => {
                      const key = `${transaction.type.toLowerCase()}Silver`
                      const val = percentages[key]
                      if (val === "" || val === null || val === undefined) return ""
                      return String(val)
                    })()}
                    onFocus={() => handlePercentageFocus("SILVER")}
                    onBlur={(e) => handlePercentageBlur("SILVER", e)}
                    onChange={(e) => handlePercentageChange("SILVER", e.target.value)}
                    disabled={isReadOnly}
                    className="w-28 sm:w-36 md:w-40 text-center text-base sm:text-lg md:text-xl font-bold border-2 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="95.00"
                  />
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className={`p-2 sm:p-6 ${userRole === "STAFF" ? "pt-2 sm:pt-3" : ""}`}>{renderMetalTable("SILVER")}</CardContent>
        </Card>

        <Card>
          <CardHeader className={`p-3 sm:p-6 ${userRole === "STAFF" ? "pb-2 sm:pb-3" : ""}`}>
            <CardTitle className={`text-3xl sm:text-4xl md:text-5xl font-extrabold text-center flex items-center justify-center gap-3 sm:gap-4 ${userRole === "ADMIN" ? "mb-4 sm:mb-6" : "mb-0"}`}>
              <div className="relative h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 flex-shrink-0">
                {!imageErrors.PLATINUM ? (
                  <Image
                    src="/metals/platinum.png"
                    alt="Platinum"
                    fill
                    sizes="56px"
                    className="object-contain drop-shadow-lg"
                    onError={() => {
                      setImageErrors((prev) => ({ ...prev, PLATINUM: true }))
                    }}
                  />
                ) : (
                  <div className="h-full w-full bg-slate-300/20 border-2 border-slate-300/30 rounded-full flex items-center justify-center">
                    <span className="text-slate-600 font-bold text-lg sm:text-xl">P</span>
                  </div>
                )}
              </div>
              <span className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent drop-shadow-lg">
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
                    value={spotPrices.platinum === "" ? "" : spotPrices.platinum}
                    onFocus={() => handleSpotFocus("platinum")}
                    onChange={(e) => handlePriceChange("PLATINUM", e.target.value)}
                    onBlur={(e) => handleSpotBlur("platinum", e)}
                    disabled={isReadOnly}
                    className="w-28 sm:w-36 md:w-40 text-center text-base sm:text-lg md:text-xl font-bold border-2 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="0.00"
                  />
                </div>
                <label className="text-base sm:text-lg md:text-xl font-black text-foreground">%</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={(() => {
                      const key = `${transaction.type.toLowerCase()}Platinum`
                      const val = percentages[key]
                      if (val === "" || val === null || val === undefined) return ""
                      return String(val)
                    })()}
                    onFocus={() => handlePercentageFocus("PLATINUM")}
                    onBlur={(e) => handlePercentageBlur("PLATINUM", e)}
                    onChange={(e) => handlePercentageChange("PLATINUM", e.target.value)}
                    disabled={isReadOnly}
                    className="w-28 sm:w-36 md:w-40 text-center text-base sm:text-lg md:text-xl font-bold border-2 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="95.00"
                  />
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className={`p-2 sm:p-6 ${userRole === "STAFF" ? "pt-2 sm:pt-3" : ""}`}>{renderMetalTable("PLATINUM")}</CardContent>
        </Card>
      </div>

      {userRole === "ADMIN" && pendingPercentageChange && (
        <Dialog
          open={isPercentageScopeDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              resetPendingPercentageToOriginal()
              setIsPercentageScopeDialogOpen(false)
              setPendingPercentageChange(null)
            }
          }}
        >
          <DialogContent className="sm:max-w-lg border border-primary/40 bg-gradient-to-br from-white via-slate-50 to-primary/10 text-slate-900 shadow-2xl shadow-primary/20 rounded-2xl animate-in fade-in-0 zoom-in-95 duration-200">
            <DialogHeader className="space-y-2 pb-2 border-b border-primary/20">
              <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-extrabold tracking-tight">
                <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/40 flex items-center justify-center shadow-inner shadow-primary/20">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <span className="bg-gradient-to-r from-red-600 via-amber-500 to-primary bg-clip-text text-transparent">
                  Apply Percentage Change
                </span>
              </DialogTitle>
              <p className="text-xs sm:text-sm font-semibold text-slate-600">
                Decide whether this new{" "}
                <span className="font-extrabold text-slate-900">
                  {transaction.type.toLowerCase()} %
                </span>{" "}
                should be used just for this customer or across all transactions.
              </p>
            </DialogHeader>
            <div className="mt-3 space-y-4">
              <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-amber-100 px-4 py-3 text-xs sm:text-sm font-extrabold text-slate-900 shadow-sm">
                {pendingPercentageChange.metalType} {transaction.type.toLowerCase()} percentage →{" "}
                <span className="text-red-600">
                  {formatDecimal(pendingPercentageChange.value)}%
                </span>
              </div>
              <div className="space-y-3">
                <div
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-all ${
                    pendingPercentageChange.scope === "LOCAL"
                      ? "border-emerald-500 bg-emerald-50 shadow-md scale-[1.01]"
                      : "border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/70"
                  }`}
                  onClick={() =>
                    setPendingPercentageChange((prev) =>
                      prev ? { ...prev, scope: "LOCAL" } : prev
                    )
                  }
                >
                  <div
                    className={`mt-1 h-5 w-5 rounded-full border flex items-center justify-center ${
                      pendingPercentageChange.scope === "LOCAL"
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-slate-400"
                    }`}
                  >
                    {pendingPercentageChange.scope === "LOCAL" && (
                      <span className="h-2.5 w-2.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-extrabold tracking-tight text-slate-900">
                      Only this customer
                    </p>
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-600">
                      Apply this percentage only to this transaction. Global prices and percentages
                      for other customers will not change.
                    </p>
                  </div>
                </div>
                <div
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-all ${
                    pendingPercentageChange.scope === "GLOBAL"
                      ? "border-sky-500 bg-sky-50 shadow-md scale-[1.01]"
                      : "border-slate-300 bg-white hover:border-sky-400 hover:bg-sky-50/70"
                  }`}
                  onClick={() =>
                    setPendingPercentageChange((prev) =>
                      prev ? { ...prev, scope: "GLOBAL" } : prev
                    )
                  }
                >
                  <div
                    className={`mt-1 h-5 w-5 rounded-full border flex items-center justify-center ${
                      pendingPercentageChange.scope === "GLOBAL"
                        ? "border-sky-500 bg-sky-500"
                        : "border-slate-400"
                    }`}
                  >
                    {pendingPercentageChange.scope === "GLOBAL" && (
                      <span className="h-2.5 w-2.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-extrabold tracking-tight text-slate-900">
                      For everyone
                    </p>
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-600">
                      Update today&apos;s global {transaction.type.toLowerCase()} percentage for this metal
                      across all devices and future transactions.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="px-3 font-extrabold"
                  onClick={() => {
                    resetPendingPercentageToOriginal()
                    setIsPercentageScopeDialogOpen(false)
                    setPendingPercentageChange(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="px-4 font-extrabold"
                  disabled={!pendingPercentageChange.scope}
                  onClick={() => void applyPercentageChangeScope()}
                >
                  Apply
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 sticky bottom-2 sm:bottom-4 bg-background p-2 sm:p-3 md:p-4 border rounded-lg shadow-lg z-50 mx-2 sm:mx-0">
        {customBottom !== undefined ? (
          customBottom
        ) : (
          <>
        {canPrint ? (
          <Button onClick={onPrint} className="flex-1 w-full sm:w-auto text-sm sm:text-base" size="lg">
            <Printer className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="whitespace-nowrap">Print</span>
          </Button>
        ) : approvalStatus === "PENDING" ? (
          <div className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 to-teal-500/10 px-4 py-3 text-sm font-medium text-emerald-800 dark:text-emerald-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
            Waiting for {pendingAdminName || "admin"}
          </div>
        ) : approvalStatus === "DENIED" ? (
          <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-400">
            Denied — cannot print
          </div>
        ) : onSendForApproval ? (
          <Button onClick={onSendForApproval} variant="outline" className="flex-1 w-full sm:w-auto text-sm sm:text-base border-cyan-500/60 text-cyan-600 dark:text-cyan-400" size="lg">
            <span className="whitespace-nowrap">Send for approval</span>
          </Button>
        ) : (
          <div className="flex-1" />
        )}
        <Button onClick={onNewTransaction} variant="outline" size="lg" disabled={isReadOnly} className="w-full sm:w-auto whitespace-normal sm:whitespace-nowrap text-sm sm:text-base">
          <span className="text-center">Start New <span className="text-red-600 font-semibold">{transaction.type}</span> Transaction</span>
        </Button>
          </>
        )}
      </div>
    </div>
  )
}

