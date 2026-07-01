"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { useSocketPrices } from "@/hooks/use-socket-prices"
import { useSocketTransaction } from "@/hooks/use-socket-transaction"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { Printer, RotateCcw, DollarSign, Scale, Calculator, Sparkles, Star, Plus, Trash2, Save, MoreHorizontal } from "lucide-react"
import {
  getScrapPricingRows,
  getMeltPricingRows,
  calculateScrapGoldPricePerDWTFromKarat,
  calculateLineTotal,
  calculateSaleRowValue,
  SALE_GOLD_PURITIES,
  SCRAP_GOLD_CUSTOM_ROW_KEY,
  formatGoldKaratLabel,
  isStandardGoldScrapPurity,
  parseGoldKaratFromLabel,
  type MetalType,
  type GoldPurity,
  GOLD_PURITIES,
  SILVER_PURITIES,
  PLATINUM_PURITIES,
} from "@/lib/pricing"
import { formatDecimal } from "@/lib/utils"
import { toDwt, type WeightUnit } from "@/lib/weight-units"

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
  type: "SCRAP" | "MELT" | "SALE"
  goldSpot: number
  silverSpot: number
  platinumSpot: number
  salePremiumPerOz?: number | null
  lineItems: LineItem[]
}

type SaleRow = {
  id: string
  purity: GoldPurity
  weight: string
  weightUnit: WeightUnit
}

function createSaleRow(purity: GoldPurity = "24K"): SaleRow {
  return {
    id: `sale-${crypto.randomUUID()}`,
    purity,
    weight: "",
    weightUnit: "DWT",
  }
}

function saleRowsFromLineItems(lineItems: LineItem[]): SaleRow[] {
  if (lineItems.length === 0) return [createSaleRow()]
  return lineItems.map((item) => ({
    id: item.id,
    purity: item.purityLabel as GoldPurity,
    weight: String(item.dwt),
    weightUnit: "DWT" as WeightUnit,
  }))
}

function saleRowsEqual(a: SaleRow[], b: SaleRow[]): boolean {
  if (a.length !== b.length) return false
  return a.every((row, index) => {
    const other = b[index]
    return (
      row.id === other.id &&
      row.purity === other.purity &&
      row.weight === other.weight &&
      row.weightUnit === other.weightUnit
    )
  })
}

function getPercentageStateKey(transactionType: "SCRAP" | "MELT" | "SALE", metalType: MetalType): string {
  if (transactionType === "SALE") return "scrapGold"
  const metalTypeCamel = metalType.charAt(0) + metalType.slice(1).toLowerCase()
  return `${transactionType.toLowerCase()}${metalTypeCamel.charAt(0).toUpperCase() + metalTypeCamel.slice(1)}`
}

function getPercentageApiTransactionType(transactionType: "SCRAP" | "MELT" | "SALE"): "SCRAP" | "MELT" {
  return transactionType === "SALE" ? "SCRAP" : transactionType
}

type CustomGoldScrapRow = {
  id: string
  karat: number | string
}

type MetalPricingRow = {
  purity: string
  dwt: number
  pricePerDWT: number
  lineTotal: number
  purityPercentage?: number
  saving: boolean
  existingItem?: LineItem
  isCustomGold?: boolean
  customKarat?: number | string
  customRowId?: string
}

let customGoldRowCounter = 0

function createCustomGoldScrapRow(karat: number | string = ""): CustomGoldScrapRow {
  customGoldRowCounter += 1
  return { id: `custom-${Date.now()}-${customGoldRowCounter}`, karat }
}

function encodeCustomGoldRowPurity(rowId: string): string {
  return `${SCRAP_GOLD_CUSTOM_ROW_KEY}:${rowId}`
}

function decodeCustomGoldRowPurity(purity: string): string | null {
  if (!purity.startsWith(`${SCRAP_GOLD_CUSTOM_ROW_KEY}:`)) return null
  return purity.slice(SCRAP_GOLD_CUSTOM_ROW_KEY.length + 1)
}

function isCustomGoldRowPurity(purity: string): boolean {
  return purity.startsWith(`${SCRAP_GOLD_CUSTOM_ROW_KEY}:`)
}

function customGoldScrapDwtKey(rowId: string): string {
  return `GOLD-${SCRAP_GOLD_CUSTOM_ROW_KEY}-${rowId}`
}

function customGoldKaratFocusKey(rowId: string): string {
  return `custom-karat-${customGoldScrapDwtKey(rowId)}`
}

function scrapLineItemStateKey(
  transactionType: "SCRAP" | "MELT" | "SALE",
  metalType: MetalType,
  purity: string
): string {
  if (transactionType === "MELT") return metalType
  const customRowId = decodeCustomGoldRowPurity(purity)
  if (metalType === "GOLD" && customRowId) {
    return customGoldScrapDwtKey(customRowId)
  }
  return `${metalType}-${purity}`
}

function parseCustomGoldKaratValue(value: number | string): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  const parsed = parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : 0
}

function sanitizeDecimalInput(value: string): string {
  const stripped = value.replace(/[^0-9.]/g, "")
  const dotIndex = stripped.indexOf(".")
  if (dotIndex === -1) return stripped
  return stripped.slice(0, dotIndex + 1) + stripped.slice(dotIndex + 1).replace(/\./g, "")
}

function blockNonNumericDecimalKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.ctrlKey || e.metaKey || e.altKey) return
  const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End", "Enter"]
  if (allowed.includes(e.key)) return
  if (/^[0-9.]$/.test(e.key)) {
    if (e.key === "." && e.currentTarget.value.includes(".")) e.preventDefault()
    return
  }
  e.preventDefault()
}

function buildDraftLineItems(
  type: "SCRAP" | "MELT" | "SALE",
  dwtValues: Record<string, number>,
  purityPercentages: Record<string, number | string>,
  spotPrices: { gold: number | ""; silver: number | ""; platinum: number | "" },
  percentages: Record<string, number | string>,
  saleRows: SaleRow[] = [],
  salePremiumPerOz: number = 0,
  customGoldScrapRows: CustomGoldScrapRow[] = []
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
  if (type === "SALE") {
    const goldSpot = typeof spotPrices.gold === "number" ? spotPrices.gold : parseFloat(String(spotPrices.gold)) || 0
    for (const row of saleRows) {
      const calc = calculateSaleRowValue(goldSpot, row.purity, row.weight, row.weightUnit, salePremiumPerOz)
      if (!Number.isFinite(calc.dwt) || calc.dwt <= 0) continue
      items.push({
        id: row.id,
        metalType: "GOLD",
        purityLabel: row.purity,
        dwt: calc.dwt,
        pricePerOz: calc.pricePerDWT,
        lineTotal: calc.lineTotal,
      })
    }
    return items
  }
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
      if (metalType === "GOLD") {
        for (const customRow of customGoldScrapRows) {
          const customKey = customGoldScrapDwtKey(customRow.id)
          const customDwt = dwtValues[customKey] ?? 0
          const customKarat = parseCustomGoldKaratValue(customRow.karat)
          if (customDwt > 0 && customKarat > 0) {
            const pricePerDWT = calculateScrapGoldPricePerDWTFromKarat(customKarat, spot, percentage)
            items.push({
              id: `draft-${++id}`,
              metalType: "GOLD",
              purityLabel: formatGoldKaratLabel(customKarat),
              dwt: customDwt,
              pricePerOz: pricePerDWT,
              lineTotal: calculateLineTotal(pricePerDWT, customDwt),
            })
          }
        }
      }
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

const saveButtonClass =
  "flex-1 w-full sm:w-auto text-sm sm:text-base border-0 bg-secondary text-secondary-foreground transition-all duration-200 hover:!bg-[#39ff14] hover:!text-black hover:shadow-[0_0_16px_rgba(57,255,20,0.7)] active:!bg-[#32e610] active:!text-black active:shadow-[0_0_20px_rgba(57,255,20,0.85)] focus-visible:ring-[#39ff14]"

const printButtonClass =
  "flex-1 w-full sm:w-auto text-sm sm:text-base border-0 transition-all duration-200 hover:!bg-[hsl(221.2_95%_61%)] hover:!text-primary-foreground hover:shadow-[0_0_16px_hsla(221,95%,61%,0.75),0_0_28px_hsla(221,95%,61%,0.4)] active:!bg-[hsl(221.2_83%_46%)] active:!text-primary-foreground active:shadow-[0_0_20px_hsla(221,83%,53%,0.85),0_0_36px_hsla(221,83%,53%,0.45)] focus-visible:ring-primary"

const newTransactionButtonClass =
  "w-full sm:w-auto whitespace-normal sm:whitespace-nowrap text-sm sm:text-base border-2 border-amber-500/40 bg-background transition-all duration-200 hover:!bg-[#ffb020] hover:!text-black hover:!border-[#ffb020] hover:shadow-[0_0_16px_rgba(255,176,32,0.65)] active:!bg-[#e69a00] active:!text-black active:!border-[#e69a00] active:shadow-[0_0_20px_rgba(255,176,32,0.8)] focus-visible:ring-[#ffb020]"

export function PricingTable({
  transaction,
  onPrint,
  onSave,
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
  onPercentagesChange,
  initialSalePremium = 0,
  onSalePremiumChange,
  customerId,
}: {
  transaction: Transaction
  onPrint: () => void
  onSave?: () => void
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
  onPercentagesChange?: (percentages: Record<string, number | string>, transactionType: "SCRAP" | "MELT" | "SALE") => void
  initialSalePremium?: number
  onSalePremiumChange?: (premium: number) => void
  customerId?: string
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
  const [customGoldScrapRows, setCustomGoldScrapRows] = useState<CustomGoldScrapRow[]>(() => [createCustomGoldScrapRow()])
  const [editingCustomKaratRowId, setEditingCustomKaratRowId] = useState<string | null>(null)
  const [saleRows, setSaleRows] = useState<SaleRow[]>([createSaleRow()])
  const [salePremiumPerOz, setSalePremiumPerOz] = useState<number | string>(() => {
    const fromTx = transaction.salePremiumPerOz
    if (fromTx != null && !Number.isNaN(fromTx)) return fromTx
    return initialSalePremium > 0 ? initialSalePremium : ""
  })
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
  const customGoldScrapRowsRef = useRef(customGoldScrapRows)
  customGoldScrapRowsRef.current = customGoldScrapRows
  const lastCustomGoldPurityLabelRef = useRef<Record<string, string>>({})
  const customKaratInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const saleRowsRef = useRef(saleRows)
  saleRowsRef.current = saleRows
  const salePremiumRef = useRef(salePremiumPerOz)
  salePremiumRef.current = salePremiumPerOz
  const originalSalePremiumRef = useRef<number | string>(salePremiumPerOz)
  const loadedSaleTransactionIdRef = useRef<string | null>(null)
  const lastPushedSaleItemsRef = useRef<string>("")
  const originalPercentagesRef = useRef<Record<string, number | string | undefined>>({})
  const localOverrideKeysRef = useRef<Set<string>>(new Set())

  const isDraft = !transaction.id
  const isStaffLocked = userRole === "STAFF" && approvalStatus !== null
  const isReadOnly = readOnly || isStaffLocked

  const resetFormState = useCallback(() => {
    setDwtValues({})
    setPurityPercentages({})
    setCustomGoldScrapRows([createCustomGoldScrapRow()])
    setEditingCustomKaratRowId(null)
    lastCustomGoldPurityLabelRef.current = {}
    setSaving({})
    lastSavedValuesRef.current = {}
    lastEditTimeRef.current = {}
    isTypingRef.current = {}
    focusedFieldRef.current = null
    pendingPriceRef.current = {}

    if (transaction.type === "SALE") {
      const premium = initialSalePremium > 0 ? initialSalePremium : ""
      setSaleRows([createSaleRow()])
      setSalePremiumPerOz(premium)
      salePremiumRef.current = premium
      originalSalePremiumRef.current = premium
      lastPushedSaleItemsRef.current = ""
      loadedSaleTransactionIdRef.current = null
    }
  }, [transaction.type, initialSalePremium])

  const handleStartNewTransaction = useCallback(() => {
    resetFormState()
    onNewTransaction()
  }, [resetFormState, onNewTransaction])

  const [pendingPercentageChange, setPendingPercentageChange] = useState<{
    metalType: MetalType
    value: number
    scope: "GLOBAL" | "LOCAL" | null
  } | null>(null)
  const [isPercentageScopeDialogOpen, setIsPercentageScopeDialogOpen] = useState(false)

  useEffect(() => {
    if (isDraft) {
      if (transaction.lineItems.length === 0) {
        resetFormState()
      }
      return
    }
    const values: Record<string, number> = {}
    const purityValues: Record<string, number> = {}
    const loadedCustomRows: CustomGoldScrapRow[] = []
    const loadedCustomLabels: Record<string, string> = {}
    transaction.lineItems.forEach((item) => {
      if (
        transaction.type === "SCRAP" &&
        item.metalType === "GOLD" &&
        !isStandardGoldScrapPurity(item.purityLabel)
      ) {
        const rowId = `item-${item.id}`
        const karat = parseGoldKaratFromLabel(item.purityLabel)
        loadedCustomRows.push({ id: rowId, karat: karat ?? "" })
        values[customGoldScrapDwtKey(rowId)] = item.dwt
        loadedCustomLabels[rowId] = item.purityLabel
        return
      }
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
    const editingCustomRowId = customGoldScrapRowsRef.current.find((row) => {
      const focusKey = customGoldKaratFocusKey(row.id)
      return focusedFieldRef.current === focusKey || isTypingRef.current[focusKey]
    })?.id
    if (editingCustomRowId) {
      const localKey = customGoldScrapDwtKey(editingCustomRowId)
      if (values[localKey] === undefined) {
        const localCustomDwt = dwtValuesRef.current[localKey]
        if (localCustomDwt !== undefined) {
          values[localKey] = localCustomDwt
        }
      }
    }
    setDwtValues(values)
    setPurityPercentages(purityValues)
    if (!editingCustomRowId) {
      if (loadedCustomRows.length > 0) {
        setCustomGoldScrapRows(loadedCustomRows)
        lastCustomGoldPurityLabelRef.current = loadedCustomLabels
      } else if (customGoldScrapRowsRef.current.length === 0) {
        setCustomGoldScrapRows([createCustomGoldScrapRow()])
      }
    }
  }, [transaction.lineItems, transaction.type, isDraft, resetFormState])

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
          const newPercentages: Record<string, number | string> = {
            scrapGold: prices.scrapGoldPercentage,
            scrapSilver: prices.scrapSilverPercentage,
            scrapPlatinum: prices.scrapPlatinumPercentage,
            meltGold: prices.meltGoldPercentage,
            meltSilver: prices.meltSilverPercentage,
            meltPlatinum: prices.meltPlatinumPercentage,
          }
          localOverrideKeysRef.current.forEach((key) => {
            if (prev[key] !== undefined && prev[key] !== "") {
              newPercentages[key] = prev[key]
            }
          })

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

  useEffect(() => {
    onPercentagesChange?.(percentages, transaction.type)
  }, [percentages, onPercentagesChange, transaction.type])

  const pushSaleLineItems = useCallback(
    (rows: SaleRow[]) => {
      if (transaction.type !== "SALE" || !onLineItemsUpdate) return
      const premium =
        typeof salePremiumRef.current === "number"
          ? salePremiumRef.current
          : parseFloat(String(salePremiumRef.current)) || 0
      const items = buildDraftLineItems(
        "SALE",
        dwtValuesRef.current,
        purityPercentagesRef.current,
        spotPricesRef.current,
        percentagesRef.current,
        rows,
        premium
      )
      const serialized = JSON.stringify(items)
      if (serialized === lastPushedSaleItemsRef.current) return
      lastPushedSaleItemsRef.current = serialized
      onLineItemsUpdate(items)
    },
    [transaction.type, onLineItemsUpdate]
  )

  useEffect(() => {
    if (transaction.type !== "SALE" || !onLineItemsUpdate) return
    pushSaleLineItems(saleRowsRef.current)
  }, [transaction.type, spotPrices, salePremiumPerOz, pushSaleLineItems, onLineItemsUpdate])

  useEffect(() => {
    if (transaction.type !== "SALE") return
    if (!transaction.id) {
      loadedSaleTransactionIdRef.current = null
      return
    }
    if (isDraft || loadedSaleTransactionIdRef.current === transaction.id) return
    loadedSaleTransactionIdRef.current = transaction.id
    setSaleRows(saleRowsFromLineItems(transaction.lineItems))
  }, [transaction.id, transaction.type, transaction.lineItems, isDraft])

  useSocketTransaction(
    transaction.id ?? "",
    useCallback((lineItems) => {

      if (onLineItemsUpdate) {
        onLineItemsUpdate(lineItems)
      }

      if (transaction.type === "SALE") {
        const nextRows =
          lineItems.length > 0 ? saleRowsFromLineItems(lineItems as LineItem[]) : [createSaleRow()]
        setSaleRows((prev) => (saleRowsEqual(prev, nextRows) ? prev : nextRows))
        return
      }

      const values: Record<string, number> = {}
      const purityValues: Record<string, number> = {}
      const syncedCustomRows: CustomGoldScrapRow[] = []
      const syncedCustomLabels: Record<string, string> = {}
      
      lineItems.forEach((item) => {
        if (
          transaction.type === "SCRAP" &&
          item.metalType === "GOLD" &&
          !isStandardGoldScrapPurity(item.purityLabel)
        ) {
          const rowId = `item-${item.id}`
          const karat = parseGoldKaratFromLabel(item.purityLabel)
          syncedCustomRows.push({ id: rowId, karat: karat ?? "" })
          values[customGoldScrapDwtKey(rowId)] = item.dwt
          syncedCustomLabels[rowId] = item.purityLabel
          return
        }
        const key = scrapLineItemStateKey(transaction.type, item.metalType as MetalType, item.purityLabel)
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
        let key = scrapLineItemStateKey(transaction.type, item.metalType as MetalType, item.purityLabel)
        if (
          transaction.type === "SCRAP" &&
          item.metalType === "GOLD" &&
          !isStandardGoldScrapPurity(item.purityLabel)
        ) {
          key = customGoldScrapDwtKey(`item-${item.id}`)
        }
        lastSavedValuesRef.current[key] = {
          dwt: item.dwt,
          purityPercentage: transaction.type === "MELT" ? (item.purityPercentage ?? undefined) : undefined
        }
      })

      const editingCustomRowId = customGoldScrapRowsRef.current.find((row) => {
        const focusKey = customGoldKaratFocusKey(row.id)
        return focusedFieldRef.current === focusKey || isTypingRef.current[focusKey]
      })?.id
      if (!editingCustomRowId && syncedCustomRows.length > 0) {
        setCustomGoldScrapRows(syncedCustomRows)
        lastCustomGoldPurityLabelRef.current = syncedCustomLabels
      }

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
      const key = scrapLineItemStateKey(transaction.type, metalType, purity)

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
              percentagesRef.current,
              saleRowsRef.current,
              0,
              customGoldScrapRowsRef.current
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

    const key = scrapLineItemStateKey(transaction.type, metalType, purity)

    const currentValue = dwtValues[key] ?? 0
    if (currentValue === numValue) {

      return
    }
    
    lastEditTimeRef.current[key] = Date.now()
    setDwtValues((prev) => ({ ...prev, [key]: numValue }))
  }

  function handleDwtBlur(metalType: MetalType, purity: string) {
    const key = scrapLineItemStateKey(transaction.type, metalType, purity)
    focusedFieldRef.current = null
    const dwt = dwtValuesRef.current[key] ?? dwtValues[key] ?? 0
    const purityPctValue = purityPercentagesRef.current[key] ?? purityPercentages[key] ?? 0
    const currentPurityPercentage = typeof purityPctValue === "string" ? parseFloat(purityPctValue) || 0 : purityPctValue
    const purityParam = transaction.type === "MELT" ? metalType : resolveScrapGoldPurityLabel(purity)
    if (metalType === "GOLD" && isCustomGoldRowPurity(purity)) {
      const rowId = decodeCustomGoldRowPurity(purity)
      const row = customGoldScrapRowsRef.current.find((entry) => entry.id === rowId)
      const karat = parseCustomGoldKaratValue(row?.karat ?? 0)
      if (karat <= 0) return
      if (rowId) lastCustomGoldPurityLabelRef.current[rowId] = formatGoldKaratLabel(karat)
    }
    if (isCustomGoldRowPurity(purityParam)) return
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
    const key = getPercentageStateKey(transaction.type, metalType)
    const typingKey = `percentage-${key}`
    originalPercentagesRef.current[key] = percentagesRef.current[key]
    isTypingRef.current[typingKey] = true
    setPercentages((prev) => ({ ...prev, [key]: "" }))
  }

  function handlePercentageBlur(metalType: MetalType, e: React.FocusEvent<HTMLInputElement>) {
    const key = getPercentageStateKey(transaction.type, metalType)
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

    const apiTransactionType = getPercentageApiTransactionType(transaction.type)
    const percentageKey = `${apiTransactionType.toLowerCase()}${metalType.charAt(0).toUpperCase() + metalType.slice(1).toLowerCase()}Percentage`
    const currentSpotPrice = spotPricesRef.current[metalType.toLowerCase() as keyof typeof spotPricesRef.current]
    const priceNum = Number(currentSpotPrice) || 0
    const requestBody: Record<string, unknown> = {
      metalType: metalType.toLowerCase(),
      price: priceNum,
      transactionType: apiTransactionType,
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
          description: `${metalType} ${getPercentageApiTransactionType(transaction.type).toLowerCase()} percentage updated to ${formatDecimal(percentageValue)}%`,
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
    const key = getPercentageStateKey(transaction.type, metalType)
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
        const stateKey = getPercentageStateKey(transaction.type, metalType)
        const apiTransactionType = getPercentageApiTransactionType(transaction.type)
        const percentageKey = `${apiTransactionType.toLowerCase()}${metalType.charAt(0).toUpperCase() + metalType.slice(1).toLowerCase()}Percentage`
        const currentSpotPrice = spotPricesRef.current[metalType.toLowerCase() as keyof typeof spotPricesRef.current]
        const priceNum = Number(currentSpotPrice) || 0
        const requestBody: Record<string, unknown> = {
          metalType: metalType.toLowerCase(),
          price: priceNum,
          transactionType: apiTransactionType,
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

        localOverrideKeysRef.current.delete(stateKey)
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
            percentagesRef.current,
            saleRowsRef.current,
            0,
            customGoldScrapRowsRef.current
          )
          onLineItemsUpdate(items)
        }
        toast({
          title: "Percentage updated",
          description: `${metalType} ${apiTransactionType.toLowerCase()} percentage updated to ${formatDecimal(percentageValue)}% for everyone`,
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
      const stateKey = getPercentageStateKey(transaction.type, metalType) as keyof typeof percentagesRef.current
      localOverrideKeysRef.current.add(stateKey)
      setPercentages((prev) => ({ ...prev, [stateKey]: percentageValue }))
      percentagesRef.current = { ...percentagesRef.current, [stateKey]: percentageValue }
      if (customerId && userRole === "ADMIN") {
        const apiKey = `${stateKey}Percentage` as "scrapGoldPercentage" | "scrapSilverPercentage" | "scrapPlatinumPercentage" | "meltGoldPercentage" | "meltSilverPercentage" | "meltPlatinumPercentage"
        const numValue = typeof percentageValue === "number" ? percentageValue : parseFloat(String(percentageValue))
        if (!Number.isNaN(numValue) && numValue >= 0 && numValue <= 100) {
          fetch(`/api/customers/${customerId}/percentage-override`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ [apiKey]: numValue }),
          })
            .then((res) => {
              if (!res.ok) {
                return res.json().then((err) => { throw new Error((err as { message?: string }).message || "Failed to save") })
              }
              toast({
                title: "Saved for this customer",
                description: transaction.id
                  ? `This transaction and future ones for this customer will use ${numValue}%.`
                  : `New transactions will use ${numValue}%.`,
                variant: "success",
              })
            })
            .catch((err) => {
              toast({
                title: "Override not saved",
                description: err instanceof Error ? err.message : "Customer-specific percentage could not be saved.",
                variant: "destructive",
              })
            })
        }
      }
      try {
        if (onLineItemsUpdate) {
          const items = buildDraftLineItems(
            transaction.type,
            dwtValuesRef.current,
            purityPercentagesRef.current,
            spotPricesRef.current,
            percentagesRef.current,
            saleRowsRef.current,
            0,
            customGoldScrapRowsRef.current
          )
          onLineItemsUpdate(items)
        }
        if (!customerId || userRole !== "ADMIN") {
          toast({
            title: "Percentage updated",
            description: `${metalType} ${transaction.type.toLowerCase()} percentage updated only for this customer (this session)`,
            variant: "success",
          })
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to apply customer-only percentage",
          variant: "destructive",
        })
      }
    }

    if (transaction.id && userRole === "ADMIN") {
      const rec = percentagesRef.current
      const n = (v: number | string | undefined) =>
        typeof v === "number" && !Number.isNaN(v) ? v : typeof v === "string" && v !== "" ? parseFloat(String(v)) : undefined
      const percentages = {
        scrapGoldPercentage: n(rec.scrapGold),
        scrapSilverPercentage: n(rec.scrapSilver),
        scrapPlatinumPercentage: n(rec.scrapPlatinum),
        meltGoldPercentage: n(rec.meltGold),
        meltSilverPercentage: n(rec.meltSilver),
        meltPlatinumPercentage: n(rec.meltPlatinum),
      }
      const payload: Record<string, number> = {}
      Object.entries(percentages).forEach(([k, v]) => { if (v != null && v >= 0 && v <= 100) payload[k] = v })
      if (Object.keys(payload).length > 0) {
        fetch(`/api/transactions/${transaction.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ percentages: payload }),
        }).catch(() => {})
      }
    }

    setIsPercentageScopeDialogOpen(false)
    setPendingPercentageChange(null)
  }

  function resetPendingPercentageToOriginal() {
    if (!pendingPercentageChange) return
    const { metalType } = pendingPercentageChange
    const key = getPercentageStateKey(transaction.type, metalType)
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

  function resolveScrapGoldPurityLabel(purity: string): string {
    const rowId = decodeCustomGoldRowPurity(purity)
    if (!rowId) return purity
    const row = customGoldScrapRowsRef.current.find((entry) => entry.id === rowId)
    const karat = parseCustomGoldKaratValue(row?.karat ?? 0)
    return karat > 0 ? formatGoldKaratLabel(karat) : purity
  }

  function updateCustomGoldRowKarat(rowId: string, karat: number | string) {
    setCustomGoldScrapRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, karat } : row))
    )
  }

  function handleCustomGoldKaratChange(rowId: string, value: string) {
    if (isReadOnly) return
    const focusKey = customGoldKaratFocusKey(rowId)
    isTypingRef.current[focusKey] = true
    lastEditTimeRef.current[focusKey] = Date.now()

    if (value === "" || value === null || value === undefined) {
      updateCustomGoldRowKarat(rowId, "")
      return
    }

    updateCustomGoldRowKarat(rowId, sanitizeDecimalInput(value))
  }

  function handleCustomGoldKaratFocus(rowId: string) {
    const focusKey = customGoldKaratFocusKey(rowId)
    focusedFieldRef.current = focusKey
    isTypingRef.current[focusKey] = true
    setEditingCustomKaratRowId(rowId)
  }

  function startCustomKaratEdit(rowId: string) {
    if (isReadOnly) return
    setEditingCustomKaratRowId(rowId)
    requestAnimationFrame(() => {
      customKaratInputRefs.current[rowId]?.focus()
      customKaratInputRefs.current[rowId]?.select()
    })
  }

  function handleCustomGoldKaratBlur(rowId: string, e: React.FocusEvent<HTMLInputElement>) {
    const focusKey = customGoldKaratFocusKey(rowId)
    focusedFieldRef.current = null
    isTypingRef.current[focusKey] = false
    const raw = sanitizeDecimalInput(e.target.value)
    if (raw === "" || raw === null || raw === undefined) {
      updateCustomGoldRowKarat(rowId, "")
      setEditingCustomKaratRowId(null)
      return
    }
    const karat = parseFloat(raw)
    if (Number.isNaN(karat) || karat <= 0 || karat > 24) return

    const newLabel = formatGoldKaratLabel(karat)
    updateCustomGoldRowKarat(rowId, karat)
    setEditingCustomKaratRowId(null)

    const customKey = customGoldScrapDwtKey(rowId)
    const dwt = dwtValuesRef.current[customKey] ?? 0
    const oldLabel = lastCustomGoldPurityLabelRef.current[rowId]

    if (oldLabel && oldLabel !== newLabel && dwt > 0 && !isDraft) {
      void saveLineItemBlur("GOLD", oldLabel, 0)
    }
    if (dwt > 0) {
      lastCustomGoldPurityLabelRef.current[rowId] = newLabel
      if (!isDraft) {
        void saveLineItemBlur("GOLD", newLabel, dwt)
      } else if (onLineItemsUpdate) {
        const items = buildDraftLineItems(
          transaction.type,
          dwtValuesRef.current,
          purityPercentagesRef.current,
          spotPricesRef.current,
          percentagesRef.current,
          saleRowsRef.current,
          0,
          customGoldScrapRowsRef.current
        )
        onLineItemsUpdate(items)
      }
    } else {
      lastCustomGoldPurityLabelRef.current[rowId] = newLabel
    }
  }

  function addCustomGoldRow() {
    if (isReadOnly) return
    const newRow = createCustomGoldScrapRow()
    setCustomGoldScrapRows((prev) => [...prev, newRow])
    setEditingCustomKaratRowId(newRow.id)
    requestAnimationFrame(() => {
      customKaratInputRefs.current[newRow.id]?.focus()
    })
  }

  function removeCustomGoldRow(rowId: string) {
    if (isReadOnly) return
    const purity = encodeCustomGoldRowPurity(rowId)
    const savePurity = resolveScrapGoldPurityLabel(purity)
    if (!isCustomGoldRowPurity(savePurity)) {
      void saveLineItemBlur("GOLD", savePurity, 0)
    }
    const key = customGoldScrapDwtKey(rowId)
    const latestDwt = { ...dwtValuesRef.current }
    delete latestDwt[key]
    setDwtValues(latestDwt)
    delete lastCustomGoldPurityLabelRef.current[rowId]
    delete lastSavedValuesRef.current[key]
    if (editingCustomKaratRowId === rowId) setEditingCustomKaratRowId(null)
    const nextRows = customGoldScrapRowsRef.current.filter((row) => row.id !== rowId)
    const rows = nextRows.length > 0 ? nextRows : [createCustomGoldScrapRow()]
    setCustomGoldScrapRows(rows)
    if (isDraft && onLineItemsUpdate) {
      const items = buildDraftLineItems(
        transaction.type,
        latestDwt,
        purityPercentagesRef.current,
        spotPricesRef.current,
        percentagesRef.current,
        saleRowsRef.current,
        0,
        rows
      )
      onLineItemsUpdate(items)
    }
  }

  function handleClear(metalType: MetalType, purity: string) {

    const key = scrapLineItemStateKey(transaction.type, metalType, purity)
    setDwtValues((prev) => ({ ...prev, [key]: 0 }))
    const customRowId = decodeCustomGoldRowPurity(purity)
    if (customRowId && metalType === "GOLD") {
      updateCustomGoldRowKarat(customRowId, "")
      if (editingCustomKaratRowId === customRowId) setEditingCustomKaratRowId(null)
      delete lastCustomGoldPurityLabelRef.current[customRowId]
    }
    if (transaction.type === "MELT") {
      setPurityPercentages((prev) => {
        const updated = { ...prev }
        delete updated[key]
        return updated
      })
      debouncedSave(metalType, metalType, 0)
    } else {
      const savePurity = resolveScrapGoldPurityLabel(purity)
      if (!isCustomGoldRowPurity(savePurity)) {
        debouncedSave(metalType, savePurity, 0)
      }
    }
  }

  function getRowsForMetal(metalType: MetalType): MetalPricingRow[] {
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

          return parseFloat(purity.replace('K', ''))
        } else {

          return parseFloat(purity)
        }
      }
      return getNumericValue(a) - getNumericValue(b)
    })

    const standardRows = sortedPurities.map((purity) => {
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
        isCustomGold: false,
      }
    })

    if (metalType !== "GOLD") {
      return standardRows
    }

    const percentageValue = percentages.scrapGold
    const percentage = typeof percentageValue === "number"
      ? percentageValue
      : typeof percentageValue === "string" && percentageValue !== ""
        ? parseFloat(percentageValue) || 95
        : 95

    const customRows: MetalPricingRow[] = customGoldScrapRows.map((customRow) => {
      const customKey = customGoldScrapDwtKey(customRow.id)
      const customDwt = dwtValues[customKey] || 0
      const customKarat = parseCustomGoldKaratValue(customRow.karat)
      const customLabel = customKarat > 0 ? formatGoldKaratLabel(customKarat) : null
      const existingCustomItem = customLabel
        ? transaction.lineItems.find((item) => item.metalType === "GOLD" && item.purityLabel === customLabel)
        : undefined

      let customPricePerDWT = customKarat > 0
        ? calculateScrapGoldPricePerDWTFromKarat(customKarat, spotPriceNum, percentage)
        : 0
      let customLineTotal = calculateLineTotal(customPricePerDWT, customDwt)

      if ((isStaffLocked || readOnly) && existingCustomItem) {
        customPricePerDWT = existingCustomItem.pricePerOz
        customLineTotal = existingCustomItem.lineTotal
      }

      return {
        purity: encodeCustomGoldRowPurity(customRow.id),
        dwt: customDwt,
        pricePerDWT: customPricePerDWT,
        lineTotal: customLineTotal,
        purityPercentage: undefined,
        saving: saving[customKey] || false,
        existingItem: existingCustomItem,
        isCustomGold: true,
        customKarat: customRow.karat,
        customRowId: customRow.id,
      }
    })

    return [...standardRows, ...customRows]
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
      if (metalType === "GOLD") {
        customGoldScrapRows.forEach((row) => {
          handleClear(metalType, encodeCustomGoldRowPurity(row.id))
        })
        setCustomGoldScrapRows([createCustomGoldScrapRow()])
        setEditingCustomKaratRowId(null)
      }
    }
  }

  function getSalePremiumValue(): number {
    const val = salePremiumRef.current
    return typeof val === "number" ? val : parseFloat(String(val)) || 0
  }

  function getSaleRowCalc(row: SaleRow, existingItem?: LineItem) {
    const gold = typeof spotPrices.gold === "number" ? spotPrices.gold : parseFloat(String(spotPrices.gold)) || 0
    if ((isStaffLocked || readOnly) && existingItem) {
      return {
        dwt: existingItem.dwt,
        pricePerUnit: existingItem.pricePerOz,
        pricePerDWT: existingItem.pricePerOz,
        lineTotal: existingItem.lineTotal,
        premiumAmount: 0,
      }
    }
    const calc = calculateSaleRowValue(gold, row.purity, row.weight, row.weightUnit, getSalePremiumValue())
    return {
      dwt: calc.dwt,
      pricePerUnit: calc.pricePerUnit,
      pricePerDWT: calc.pricePerDWT,
      lineTotal: calc.lineTotal,
      premiumAmount: calc.premiumAmount,
    }
  }

  function handleSalePremiumFocus() {
    originalSalePremiumRef.current = salePremiumRef.current
    isTypingRef.current["sale-premium"] = true
    setSalePremiumPerOz("")
  }

  function handleSalePremiumBlur(e: React.FocusEvent<HTMLInputElement>) {
    isTypingRef.current["sale-premium"] = false
    const raw = e.target.value
    if (raw === "" || raw === null || raw === undefined) {
      const fallback = originalSalePremiumRef.current
      const restored = typeof fallback === "number" ? fallback : parseFloat(String(fallback)) || 0
      setSalePremiumPerOz(restored > 0 ? restored : "")
      salePremiumRef.current = restored > 0 ? restored : ""
      onSalePremiumChange?.(restored)
      return
    }
    const premiumValue = parseFloat(raw)
    if (isNaN(premiumValue) || premiumValue < 0) return

    setSalePremiumPerOz(premiumValue)
    salePremiumRef.current = premiumValue
    onSalePremiumChange?.(premiumValue)
    pushSaleLineItems(saleRowsRef.current)

    if (userRole === "ADMIN" && customerId) {
      fetch(`/api/customers/${customerId}/percentage-override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ salePremiumPerOz: premiumValue }),
      })
        .then((res) => {
          if (!res.ok) {
            return res.json().then((err) => {
              throw new Error((err as { message?: string }).message || "Failed to save premium")
            })
          }
          toast({
            title: "Premium saved for this customer",
            description: `Sale premium set to $${formatDecimal(premiumValue)} per oz.`,
            variant: "success",
          })
        })
        .catch((err) => {
          toast({
            title: "Premium not saved",
            description: err instanceof Error ? err.message : "Customer premium could not be saved.",
            variant: "destructive",
          })
        })
    }

    if (transaction.id && userRole === "ADMIN") {
      fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ salePremiumPerOz: premiumValue }),
      }).catch(() => {})
    }
  }

  function handleSalePremiumChange(value: string) {
    if (isReadOnly) return
    isTypingRef.current["sale-premium"] = true
    if (value === "" || value === null || value === undefined) {
      setSalePremiumPerOz("")
      salePremiumRef.current = ""
      return
    }
    if (value.match(/^[0-9]*\.?[0-9]*$/)) {
      setSalePremiumPerOz(value)
      const numValue = parseFloat(value)
      if (!isNaN(numValue) && numValue >= 0) {
        salePremiumRef.current = numValue
        onSalePremiumChange?.(numValue)
      }
    }
  }

  function updateSaleRow(id: string, patch: Partial<SaleRow>) {
    if (isReadOnly) return
    const next = saleRowsRef.current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    setSaleRows(next)
    pushSaleLineItems(next)
  }

  function addSaleRow() {
    if (isReadOnly) return
    const next = [...saleRowsRef.current, createSaleRow()]
    setSaleRows(next)
    pushSaleLineItems(next)
  }

  function removeSaleRow(id: string) {
    if (isReadOnly) return
    const filtered = saleRowsRef.current.filter((row) => row.id !== id)
    const next = filtered.length > 0 ? filtered : [createSaleRow()]
    setSaleRows(next)
    pushSaleLineItems(next)
  }

  function renderSaleTable() {
    let totalDwt = 0
    let totalPrice = 0

    const rowData = saleRows.map((row) => {
      const existingItem = transaction.lineItems.find((item) => item.id === row.id)
      const calc = getSaleRowCalc(row, existingItem)
      totalDwt += calc.dwt
      totalPrice += calc.lineTotal
      return { row, calc, existingItem }
    })

    return (
      <div className="space-y-3">
        <div className="overflow-x-auto -mx-2 sm:mx-0 rounded-lg border border-border/50 shadow-sm">
          <div className="min-w-full inline-block px-2 sm:px-0">
            <table className="w-full border-collapse" style={{ tableLayout: "fixed", minWidth: "100%" }}>
              <colgroup>
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "30%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "10%", minWidth: "40px" }} />
              </colgroup>
              <thead>
                <tr className="border-b-2 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 shadow-xl">
                  <th className="text-center p-2 sm:p-3 md:p-4 font-extrabold text-base sm:text-lg text-red-600">
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="h-4 w-4 text-red-600 drop-shadow-lg" />
                      <span className="drop-shadow-md">Purity</span>
                    </div>
                  </th>
                  <th className="text-center p-2 sm:p-3 md:p-4 font-extrabold text-base sm:text-lg text-red-600">
                    <div className="flex items-center justify-center gap-2">
                      <DollarSign className="h-4 w-4 text-red-600 drop-shadow-lg" />
                      <span className="drop-shadow-md">Unit Price</span>
                    </div>
                  </th>
                  <th className="text-center p-2 sm:p-3 md:p-4 font-extrabold text-base sm:text-lg text-red-600">
                    <div className="flex items-center justify-center gap-2">
                      <Scale className="h-4 w-4 text-red-600 drop-shadow-lg" />
                      <span className="drop-shadow-md">Weight</span>
                    </div>
                  </th>
                  <th className="text-center p-2 sm:p-3 md:p-4 font-extrabold text-base sm:text-lg text-red-600">
                    <div className="flex items-center justify-center gap-2">
                      <Calculator className="h-4 w-4 text-red-600 drop-shadow-lg" />
                      <span className="drop-shadow-md">Price</span>
                    </div>
                  </th>
                  <th className="text-center p-1 sm:p-2" />
                </tr>
              </thead>
              <tbody>
                {rowData.map(({ row, calc }, index) => (
                  <tr
                    key={row.id}
                    className={`border-b transition-colors ${
                      index % 2 === 0 ? "bg-background" : "bg-muted/20"
                    } ${calc.dwt > 0 ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"}`}
                  >
                    <td className="p-2 sm:p-3 md:p-4 text-center">
                      <Select
                        value={row.purity}
                        onValueChange={(value) => updateSaleRow(row.id, { purity: value as GoldPurity })}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className="w-full max-w-28 mx-auto text-center font-black text-base sm:text-lg text-red-600 bg-primary/10 border-primary/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SALE_GOLD_PURITIES.map((purity) => (
                            <SelectItem key={purity} value={purity}>
                              {purity}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 sm:p-3 md:p-4 text-center font-semibold text-base sm:text-lg text-muted-foreground">
                      <div>${formatDecimal(calc.pricePerUnit)}</div>
                      <div className="text-xs text-muted-foreground">
                        /{row.weightUnit === "DWT" ? "DWT" : "g"}
                      </div>
                    </td>
                    <td className="p-2 sm:p-3 md:p-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.weight}
                          onChange={(e) => updateSaleRow(row.id, { weight: e.target.value })}
                          disabled={isReadOnly}
                          className={`w-full max-w-24 sm:max-w-28 text-center font-bold text-base sm:text-lg transition-all ${
                            calc.dwt > 0
                              ? "bg-primary/10 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                              : "bg-background"
                          }`}
                          placeholder="0.00"
                        />
                        <Select
                          value={row.weightUnit}
                          onValueChange={(value) => updateSaleRow(row.id, { weightUnit: value as WeightUnit })}
                          disabled={isReadOnly}
                        >
                          <SelectTrigger className="w-16 sm:w-20 h-9 text-xs sm:text-sm font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DWT">DWT</SelectItem>
                            <SelectItem value="GRAM">g</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {calc.dwt > 0 && row.weightUnit === "GRAM" && (
                        <p className="mt-1 text-xs text-muted-foreground">= {formatDecimal(calc.dwt)} DWT</p>
                      )}
                    </td>
                    <td className={`p-2 sm:p-3 md:p-4 text-center font-bold text-base sm:text-lg ${calc.lineTotal > 0 ? "text-red-600" : ""}`}>
                      ${formatDecimal(calc.lineTotal)}
                    </td>
                    <td className="p-1 sm:p-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSaleRow(row.id)}
                        disabled={isReadOnly || saleRows.length === 1}
                        className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-4 border-primary/30 bg-primary/5 font-black text-red-600">
                  <td className="p-2 sm:p-3 md:p-4 text-center text-base sm:text-lg">
                    <div className="flex items-center justify-center gap-2">
                      <Calculator className="h-4 w-4" />
                      <span>Total</span>
                    </div>
                  </td>
                  <td className="p-2 sm:p-3 md:p-4 text-center text-base sm:text-lg">—</td>
                  <td className="p-2 sm:p-3 md:p-4 text-center text-base sm:text-lg">{formatDecimal(totalDwt)}</td>
                  <td className="p-2 sm:p-3 md:p-4 text-center text-lg sm:text-xl">${formatDecimal(totalPrice)}</td>
                  <td className="p-1 sm:p-2" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={addSaleRow}
          disabled={isReadOnly}
          className="border-primary/40 text-red-600 hover:bg-primary/10"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add another item
        </Button>
      </div>
    )
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
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '8%', minWidth: '48px' }} />
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
              <th className="py-1 sm:py-2 pl-0 pr-1 sm:pr-2" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const customRowId = row.customRowId
              const rowKaratValue = parseCustomGoldKaratValue(row.customKarat ?? 0)
              const hasRowKarat = row.customKarat !== "" && rowKaratValue > 0
              const showRowKaratInput = Boolean(row.isCustomGold && customRowId && (!hasRowKarat || editingCustomKaratRowId === customRowId))

              return (
              <tr 
                key={row.purity}
                className={`border-b transition-colors ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                } ${
                  row.dwt > 0 || (row.isCustomGold && parseCustomGoldKaratValue(row.customKarat ?? 0) > 0)
                    ? 'bg-primary/5 hover:bg-primary/10'
                    : 'hover:bg-muted/40'
                }`}
              >
                {transaction.type !== "MELT" && (
                  <td className="p-2 sm:p-3 md:p-4 font-black text-center overflow-hidden text-ellipsis text-base sm:text-lg text-red-600">
                    {row.isCustomGold && customRowId ? (
                      showRowKaratInput ? (
                        <div className="flex justify-center items-center gap-1">
                          <Input
                            ref={(el) => { customKaratInputRefs.current[customRowId] = el }}
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            value={row.customKarat === "" ? "" : String(row.customKarat)}
                            onChange={(e) => handleCustomGoldKaratChange(customRowId, e.target.value)}
                            onFocus={() => handleCustomGoldKaratFocus(customRowId)}
                            onBlur={(e) => handleCustomGoldKaratBlur(customRowId, e)}
                            onKeyDown={blockNonNumericDecimalKeyDown}
                            onPaste={(e) => {
                              e.preventDefault()
                              const pasted = e.clipboardData.getData("text")
                              handleCustomGoldKaratChange(customRowId, pasted)
                            }}
                            disabled={isReadOnly}
                            className="w-full max-w-20 sm:max-w-24 text-center font-black text-base sm:text-lg text-red-600 transition-all bg-primary/10 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                            placeholder="0"
                            aria-label="Custom gold karat"
                          />
                          <span className="font-black">K</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startCustomKaratEdit(customRowId)}
                          disabled={isReadOnly}
                          className="font-black text-base sm:text-lg text-red-600 bg-transparent border-0 p-0 cursor-text disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {formatGoldKaratLabel(rowKaratValue)}
                        </button>
                      )
                    ) : (
                      row.purity
                    )}
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
                      onFocus={() => { const k = scrapLineItemStateKey(transaction.type, metalType, row.purity); focusedFieldRef.current = k }}
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
                <td className="py-1 sm:py-2 pl-0 pr-1 sm:pr-2 text-center">
                  {row.isCustomGold && customRowId ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isReadOnly}
                          className="h-10 w-10 p-0 border-primary/30 hover:bg-primary/10"
                          aria-label="Custom karat row options"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[10.5rem]">
                        <DropdownMenuItem
                          onClick={addCustomGoldRow}
                          className="py-2.5 cursor-pointer"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add karat row
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => removeCustomGoldRow(customRowId)}
                          disabled={customGoldScrapRows.length <= 1}
                          className="py-2.5 cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove row
                        </DropdownMenuItem>
                        {(row.dwt > 0 || hasRowKarat) && (
                          <DropdownMenuItem
                            onClick={() => handleClear(metalType, row.purity)}
                            className="py-2.5 cursor-pointer"
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Clear values
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    row.dwt > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleClear(metalType, row.purity)}
                        disabled={isReadOnly}
                        className="h-9 w-9 sm:h-10 sm:w-10 hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Clear DWT"
                      >
                        <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    )
                  )}
                </td>
              </tr>
            )})}
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
              <td className="py-1 sm:py-2 pl-0 pr-1 sm:pr-2">
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

  if (transaction.type === "SALE") {
    return (
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
                <label className="text-base sm:text-lg md:text-xl font-bold text-foreground">Premium (per oz):</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={salePremiumPerOz === "" ? "" : String(salePremiumPerOz)}
                    onFocus={handleSalePremiumFocus}
                    onBlur={handleSalePremiumBlur}
                    onChange={(e) => handleSalePremiumChange(e.target.value)}
                    disabled={isReadOnly}
                    className="w-28 sm:w-36 md:w-40 text-center text-base sm:text-lg md:text-xl font-bold border-2 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className={`p-2 sm:p-6 ${userRole === "STAFF" ? "pt-2 sm:pt-3" : ""}`}>{renderSaleTable()}</CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 sticky bottom-2 sm:bottom-4 bg-background p-2 sm:p-3 md:p-4 border rounded-lg shadow-lg z-50 mx-2 sm:mx-0">
          {customBottom !== undefined ? (
            customBottom
          ) : (
            <>
              {canPrint ? (
                <>
                  <Button onClick={onPrint} className={printButtonClass} size="lg">
                    <Printer className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="whitespace-nowrap">Print</span>
                  </Button>
                  {onSave && (
                    <Button onClick={onSave} variant="secondary" className={saveButtonClass} size="lg">
                      <Save className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                      <span className="whitespace-nowrap">Save</span>
                    </Button>
                  )}
                </>
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
              <Button onClick={handleStartNewTransaction} variant="outline" size="lg" disabled={isReadOnly} className={newTransactionButtonClass}>
                <span className="text-center">Start New <span className="text-red-600 font-semibold">SALE</span> Transaction</span>
              </Button>
            </>
          )}
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
                    const key = getPercentageStateKey(transaction.type, metalType)
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
                      const key = getPercentageStateKey(transaction.type, "GOLD")
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
                      const key = getPercentageStateKey(transaction.type, "SILVER")
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
                      const key = getPercentageStateKey(transaction.type, "PLATINUM")
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
          <>
            <Button onClick={onPrint} className={printButtonClass} size="lg">
              <Printer className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="whitespace-nowrap">Print</span>
            </Button>
            {onSave && (
              <Button onClick={onSave} variant="secondary" className={saveButtonClass} size="lg">
                <Save className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="whitespace-nowrap">Save</span>
              </Button>
            )}
          </>
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
        <Button onClick={handleStartNewTransaction} variant="outline" size="lg" disabled={isReadOnly} className={newTransactionButtonClass}>
          <span className="text-center">Start New <span className="text-red-600 font-semibold">{transaction.type}</span> Transaction</span>
        </Button>
          </>
        )}
      </div>
    </div>
  )
}

