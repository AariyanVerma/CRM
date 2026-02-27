"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { useSocketPrices } from "@/hooks/use-socket-prices"
import { useSocketTransaction } from "@/hooks/use-socket-transaction"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
import { TradingViewTickerTape } from "@/components/trading-view-ticker-tape"

interface LineItem {
  id: string
  metalType: "GOLD" | "SILVER" | "PLATINUM"
  purityLabel: string
  dwt: number
  pricePerOz: number
  lineTotal: number
  purityPercentage?: number | null // For MELT transactions
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
  onLineItemsUpdate,
}: {
  transaction: Transaction
  onPrint: () => void
  onNewTransaction: () => void
  metalType?: MetalType
  userRole?: "ADMIN" | "STAFF"
  onLineItemsUpdate?: (lineItems: LineItem[]) => void
}) {
  const { toast } = useToast()
  const [dwtValues, setDwtValues] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [spotPrices, setSpotPrices] = useState({
    gold: transaction.goldSpot,
    silver: transaction.silverSpot,
    platinum: transaction.platinumSpot,
  })
  // Percentages per metal type and transaction type (allow string for empty state)
  // Initialize with defaults, will be updated from DailyPrice via socket
  const [percentages, setPercentages] = useState<Record<string, number | string>>({
    scrapGold: 95,
    scrapSilver: 95,
    scrapPlatinum: 95,
    meltGold: 95,
    meltSilver: 95,
    meltPlatinum: 95,
  })
  
  // Percentages are now fetched via useSocketPrices hook - no need for duplicate fetch
  // Purity percentages for MELT (stored per line item)
  const [purityPercentages, setPurityPercentages] = useState<Record<string, number | string>>({})
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const lastEditTimeRef = useRef<Record<string, number>>({}) // Track when each field was last edited
  const isTypingRef = useRef<Record<string, boolean>>({}) // Track if user is actively typing
  const pendingPriceRef = useRef<Record<string, number>>({}) // Track pending price values

  // Initialize DWT values and purity percentages from line items
  useEffect(() => {
    const values: Record<string, number> = {}
    const purityValues: Record<string, number> = {}
    transaction.lineItems.forEach((item) => {
      const key = `${item.metalType}-${item.purityLabel}`
      values[key] = item.dwt
      // For MELT transactions, include purity percentage (including 0)
      if (transaction.type === "MELT" && item.purityPercentage !== undefined && item.purityPercentage !== null) {
        purityValues[key] = item.purityPercentage
      }
    })
    setDwtValues(values)
    setPurityPercentages(purityValues)
  }, [transaction.lineItems, transaction.type])

  // Socket-based price updates (real-time push updates including percentages)
  useSocketPrices(
    useCallback((prices) => {
      setSpotPrices({
        gold: prices.gold,
        silver: prices.silver,
        platinum: prices.platinum,
      })
      
      // Update percentages from DailyPrice (only if user is not typing)
      const isTypingAnyPercentage = Object.keys(isTypingRef.current).some(key => 
        key.startsWith('percentage-') && isTypingRef.current[key]
      )
      
      if (!isTypingAnyPercentage) {
        setPercentages(prev => {
          // Only update if values actually changed to prevent unnecessary re-renders
          const newPercentages = {
            scrapGold: prices.scrapGoldPercentage,
            scrapSilver: prices.scrapSilverPercentage,
            scrapPlatinum: prices.scrapPlatinumPercentage,
            meltGold: prices.meltGoldPercentage,
            meltSilver: prices.meltSilverPercentage,
            meltPlatinum: prices.meltPlatinumPercentage,
          }
          
          // Check if any value actually changed
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

  // Socket-based transaction line items updates (real-time DWT and purity percentage sync)
  useSocketTransaction(
    transaction.id,
    useCallback((lineItems) => {
      // Notify parent component if callback provided
      if (onLineItemsUpdate) {
        onLineItemsUpdate(lineItems)
      }
      
      // Update DWT values and purity percentages from fetched line items
      const values: Record<string, number> = {}
      const purityValues: Record<string, number> = {}
      
      lineItems.forEach((item) => {
        // For MELT, use metal type as key; for SCRAP, use metalType-purityLabel
        const key = transaction.type === "MELT" ? item.metalType : `${item.metalType}-${item.purityLabel}`
        values[key] = item.dwt
        // For MELT transactions, include purity percentage (including 0)
        if (transaction.type === "MELT") {
          // Include purityPercentage if it's a number (including 0), but exclude null/undefined
          // Also handle the case where purityPercentage might be 0 (which is valid)
          if (item.purityPercentage !== undefined && item.purityPercentage !== null) {
            const purityNum = typeof item.purityPercentage === 'number' ? item.purityPercentage : parseFloat(String(item.purityPercentage))
            if (!isNaN(purityNum)) {
              purityValues[key] = purityNum
            }
          }
        }
      })
      
      // Update lastSavedValuesRef from socket updates to prevent unnecessary POSTs
      lineItems.forEach((item: any) => {
        // For MELT, use metal type as key; for SCRAP, use metalType-purityLabel
        const key = transaction.type === "MELT" ? item.metalType : `${item.metalType}-${item.purityLabel}`
        lastSavedValuesRef.current[key] = {
          dwt: item.dwt,
          purityPercentage: transaction.type === "MELT" ? (item.purityPercentage ?? undefined) : undefined
        }
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
          
          // Only update if value changed and field wasn't edited in last 3 seconds
          // Increased from 2s to 3s to prevent socket updates from overwriting values while user is typing
          if (prev[key] !== values[key] && timeSinceEdit > 3000) {
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
              // Remove from lastSavedValuesRef when item is deleted
              delete lastSavedValuesRef.current[key]
            }
          }
        })
        
        return hasChanges ? updated : prev
      })
      
      // Update purity percentages for MELT transactions
      if (transaction.type === "MELT") {
        setPurityPercentages((prev) => {
          const now = Date.now()
          const updated = { ...prev }
          let hasChanges = false
          
          // Update existing or add new purity percentages
          Object.keys(purityValues).forEach((key) => {
            const lastEditTime = lastEditTimeRef.current[`purity-${key}`] || 0
            const timeSinceEdit = now - lastEditTime
            
            // Only update if value changed and field wasn't edited in last 2 seconds
            // Use explicit comparison to handle undefined/0 correctly
            const currentValue = prev[key]
            const newValue = purityValues[key]
            
            // Check if value actually changed (handles undefined, null, 0 correctly)
            const valueChanged = currentValue !== newValue
            
            if (valueChanged && timeSinceEdit > 2000) {
              updated[key] = newValue
              hasChanges = true
            }
          })
          
          // Remove deleted purity percentages (only if not recently edited)
          Object.keys(prev).forEach((key) => {
            if (!(key in purityValues)) {
              const lastEditTime = lastEditTimeRef.current[`purity-${key}`] || 0
              const timeSinceEdit = now - lastEditTime
              
              if (timeSinceEdit > 2000) {
                delete updated[key]
                hasChanges = true
              }
            }
          })
          
          return hasChanges ? updated : prev
        })
      }
    }, [transaction.type, onLineItemsUpdate]),
    { enabled: true }
  )

  // Track in-flight requests to prevent duplicate POSTs
  const inFlightRequestsRef = useRef<Set<string>>(new Set())
  // Track last saved values to prevent unnecessary POSTs
  const lastSavedValuesRef = useRef<Record<string, { dwt: number; purityPercentage?: number }>>({})

  // Debounced save function - ONLY called from user input handlers
  const debouncedSave = useCallback(
    (() => {
      const timeouts: Record<string, NodeJS.Timeout | null> = {}
      return (metalType: MetalType, purity: string, dwt: number, purityPercentage?: number) => {
        const key = `${metalType}-${purity}`
        
        // CRITICAL: Prevent POST if there's already a request in flight for this field
        if (inFlightRequestsRef.current.has(key)) {
          console.log(`[debouncedSave] Skipping POST for ${key} - request already in flight`)
          return
        }

        // CRITICAL: Prevent POST if value hasn't actually changed from last saved value
        const lastSaved = lastSavedValuesRef.current[key]
        const currentDwt = parseFloat(dwt.toString()) || 0
        const currentPurityPct = purityPercentage !== undefined ? purityPercentage : (typeof purityPercentages[key] === 'number' ? purityPercentages[key] : parseFloat(String(purityPercentages[key] || 0)))
        
        if (lastSaved && 
            lastSaved.dwt === currentDwt && 
            (transaction.type !== "MELT" || lastSaved.purityPercentage === currentPurityPct)) {
          console.log(`[debouncedSave] Skipping POST for ${key} - value unchanged (dwt: ${currentDwt}, purity: ${currentPurityPct})`)
          return
        }
        
        // Clear existing timeout for this specific field
        if (timeouts[key]) {
          clearTimeout(timeouts[key])
        }
        
        timeouts[key] = setTimeout(async () => {
          // Double-check: still no request in flight
          if (inFlightRequestsRef.current.has(key)) {
            console.log(`[debouncedSave] Skipping POST for ${key} - request started during debounce`)
            return
          }

          // Mark as in-flight
          inFlightRequestsRef.current.add(key)
          setSaving((prev) => ({ ...prev, [key]: true }))

          try {
            const body: any = {
              metalType,
              purityLabel: purity,
              dwt: currentDwt,
            }
            
            // Include purity percentage for MELT transactions (always include, even if 0)
            if (transaction.type === "MELT") {
              body.purityPercentage = currentPurityPct
            }

            console.log(`[debouncedSave] POST /api/transactions/${transaction.id}/line-items for ${key}`, body)

            const res = await fetch(`/api/transactions/${transaction.id}/line-items`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
              credentials: 'include',
            })

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}))
              throw new Error(errorData.message || "Failed to save")
            }

            await res.json()

            // Update last saved values
            lastSavedValuesRef.current[key] = {
              dwt: currentDwt,
              purityPercentage: transaction.type === "MELT" ? currentPurityPct : undefined
            }

            // Clear in-flight flag and saving state
            inFlightRequestsRef.current.delete(key)
            setSaving((prev) => {
              const updated = { ...prev }
              delete updated[key]
              return updated
            })

            toast({
              title: "Saved",
              description: `${purity} ${metalType} updated`,
              variant: "success",
            })
          } catch (error) {
            console.error("Error saving line item:", error)
            // Clear in-flight flag and saving state on error
            inFlightRequestsRef.current.delete(key)
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
        }, 800) // Increased from 400ms to 800ms to wait longer for user to finish typing
      }
    })()
  , [transaction.id, transaction.type, toast, purityPercentages])

  function handleDwtChange(metalType: MetalType, purity: string, value: string, purityPercentage?: number) {
    const numValue = parseFloat(value) || 0
    if (numValue < 0) return

    // For MELT, use metal type as key; for SCRAP, use metalType-purity
    const key = transaction.type === "MELT" ? metalType : `${metalType}-${purity}`
    
    // CRITICAL: Only proceed if this is a real user change (not a programmatic update)
    // Check if value actually changed from current state
    const currentValue = dwtValues[key] ?? 0
    if (currentValue === numValue) {
      // Value hasn't changed, this might be a programmatic update - don't save
      return
    }
    
    lastEditTimeRef.current[key] = Date.now() // Mark as recently edited
    setDwtValues((prev) => ({ ...prev, [key]: numValue }))
    
    // Use current purity percentage if not provided
    const purityPctValue = purityPercentage ?? purityPercentages[key] ?? 0
    const currentPurityPercentage = typeof purityPctValue === 'string' ? parseFloat(purityPctValue) || 0 : purityPctValue
    // For MELT, use metalType as purity parameter; for SCRAP, use actual purity
    const purityParam = transaction.type === "MELT" ? metalType : purity
    debouncedSave(metalType, purityParam, numValue, currentPurityPercentage)
  }

  // Debounced price update function with longer delay
  const debouncedPriceUpdate = useCallback(
    (() => {
      let timeout: NodeJS.Timeout | null = null
      return (metalType: string, price: number) => {
        // Store pending price
        pendingPriceRef.current[metalType] = price
        // Mark as typing
        isTypingRef.current[metalType] = true
        
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(async () => {
          // Check if user is still typing (if they typed again, this will be cancelled)
          if (!isTypingRef.current[metalType]) return
          
          // Get the latest pending price
          const priceToSave = pendingPriceRef.current[metalType]
          isTypingRef.current[metalType] = false
          
          try {
            const res = await fetch("/api/admin/prices", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                metalType,
                price: priceToSave,
              }),
              credentials: 'include',
            })

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({ message: "Failed to update price" }))
              throw new Error(errorData.message || "Failed to update price")
            }

            await res.json()

            toast({
              title: "Price updated",
              description: `${metalType} spot price updated to $${formatDecimal(priceToSave)}`,
              variant: "success",
            })
          } catch (error) {
            toast({
              title: "Error",
              description: error instanceof Error ? error.message : "Failed to update price",
              variant: "destructive",
            })
          }
        }, 2500) // Increased to 2.5 seconds to give admin more time
      }
    })()
  , [toast])

  // Debounced percentage update function for transaction percentages
  const debouncedTransactionPercentageUpdate = useCallback(
    (() => {
      const timeouts: Record<string, NodeJS.Timeout | null> = {}
      return (metalType: MetalType, percentageValue: number) => {
        // Convert transaction type to lowercase and metal type to camelCase
        const transactionTypeLower = transaction.type.toLowerCase()
        const metalTypeCamel = metalType.charAt(0) + metalType.slice(1).toLowerCase()
        const key = `${transactionTypeLower}${metalTypeCamel.charAt(0).toUpperCase() + metalTypeCamel.slice(1)}`
        const typingKey = `percentage-${key}`
        
        // Mark as typing
        isTypingRef.current[typingKey] = true
        
        // Clear existing timeout for this specific field
        if (timeouts[typingKey]) {
          clearTimeout(timeouts[typingKey])
        }
        
        timeouts[typingKey] = setTimeout(async () => {
          // Check if user is still typing
          if (!isTypingRef.current[typingKey]) return
          
          try {
            // Use current spot price from state (no need to fetch - we already have it)
            const currentSpotPrice = spotPrices[metalType.toLowerCase() as keyof typeof spotPrices]
            
            // Update percentage in DailyPrice via prices API
            const percentageKey = `${transaction.type.toLowerCase()}${metalType.charAt(0).toUpperCase() + metalType.slice(1).toLowerCase()}Percentage`
            const requestBody: any = {
              metalType: metalType.toLowerCase(),
              price: currentSpotPrice,
              transactionType: transaction.type,
            }
            requestBody[percentageKey] = percentageValue
            
            
            const res = await fetch("/api/admin/prices", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
              credentials: 'include',
            })

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({ message: "Failed to update percentage" }))
              throw new Error(errorData.message || "Failed to update percentage")
            }

            const updated = await res.json()
            
            // Clear typing flag after successful save so real-time updates can come through
            isTypingRef.current[typingKey] = false

            toast({
              title: "Percentage updated",
              description: `${metalType} ${transaction.type.toLowerCase()} percentage updated to ${formatDecimal(percentageValue)}%`,
              variant: "success",
            })
          } catch (error) {
            // Clear typing flag even on error so user can try again
            isTypingRef.current[typingKey] = false
            
            toast({
              title: "Error",
              description: error instanceof Error ? error.message : "Failed to update percentage",
              variant: "destructive",
            })
          }
        }, 2500)
      }
    })(),
    [toast, transaction.id, transaction.type]
  )

  function handlePriceChange(metalType: MetalType, value: string) {
    const numValue = parseFloat(value) || 0
    if (numValue < 0) return

    const metalKey = metalType.toLowerCase()
    
    // Update local state immediately for responsive UI
    setSpotPrices((prev) => ({
      ...prev,
      [metalKey]: numValue,
    }))
    
    // Debounce the save
    debouncedPriceUpdate(metalKey, numValue)
  }

  function handlePercentageChange(metalType: MetalType, value: string) {
    // Convert transaction type to lowercase and metal type to camelCase
    const transactionTypeLower = transaction.type.toLowerCase()
    const metalTypeCamel = metalType.charAt(0) + metalType.slice(1).toLowerCase()
    const key = `${transactionTypeLower}${metalTypeCamel.charAt(0).toUpperCase() + metalTypeCamel.slice(1)}`
    const typingKey = `percentage-${key}`
    
    // Mark as typing immediately
    isTypingRef.current[typingKey] = true
    
    // Allow empty string for clearing the field
    if (value === "" || value === null || value === undefined) {
      setPercentages(prev => ({
        ...prev,
        [key]: "" // Allow empty temporarily
      }))
      // Clear typing flag after a delay to allow clearing
      setTimeout(() => {
        if (value === "") {
          isTypingRef.current[typingKey] = false
        }
      }, 100)
      return
    }
    
    // Parse the value
    const numValue = parseFloat(value)
    
    // If it's a valid number, update state and trigger save
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setPercentages(prev => ({
        ...prev,
        [key]: numValue
      }))
      
      // Always trigger debounced save for valid numbers
      debouncedTransactionPercentageUpdate(metalType, numValue)
    } else if (value.match(/^[0-9]*\.?[0-9]*$/)) {
      // Allow partial input like "9" or "9." - store as string temporarily
      setPercentages(prev => ({
        ...prev,
        [key]: value
      }))
      // Don't save partial numbers yet
    }
  }

  function handlePurityPercentageChange(metalType: MetalType, purity: string, value: string) {
    // For MELT, use metal type as key; for SCRAP, use metalType-purity
    const key = transaction.type === "MELT" ? metalType : `${metalType}-${purity}`
    
    // CRITICAL: Only proceed if this is a real user change (not a programmatic update)
    // Check if value actually changed from current state
    const currentValue = purityPercentages[key]
    const numValue = parseFloat(value)
    const currentNumValue = typeof currentValue === 'number' ? currentValue : (currentValue ? parseFloat(String(currentValue)) : NaN)
    
    // Handle empty string - clear the field
    if (value === "" || value === null || value === undefined) {
      // Only clear if it's actually different from current state
      if (currentValue !== undefined && currentValue !== null && currentValue !== "") {
        setPurityPercentages(prev => {
          const updated = { ...prev }
          delete updated[key]
          return updated
        })
      }
      // Don't save immediately when field is cleared, wait for user to enter a value
      return
    }
    
    // If value hasn't changed, this might be a programmatic update - don't proceed
    if (!isNaN(numValue) && !isNaN(currentNumValue) && numValue === currentNumValue) {
      return
    }
    
    // Mark as recently edited to prevent socket updates from overwriting
    lastEditTimeRef.current[`purity-${key}`] = Date.now()
    
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      // Allow partial input (like "9." or "9.5")
      if (value.match(/^[0-9]*\.?[0-9]*$/)) {
        setPurityPercentages(prev => ({
          ...prev,
          [key]: value as any // Store as string temporarily for partial input
        }))
      }
      return
    }
    
    setPurityPercentages(prev => ({
      ...prev,
      [key]: numValue
    }))
    
    // Always save purity percentage, even if DWT is 0
    const currentDwt = dwtValues[key] || 0
    // Use debouncedSave which will save the purity percentage
    // For MELT, use metalType as purity parameter; for SCRAP, use actual purity
    const purityParam = transaction.type === "MELT" ? metalType : purity
    debouncedSave(metalType, purityParam, currentDwt, numValue)
  }
  
  function handlePurityPercentageFocus(metalType: MetalType, purity: string, e: React.FocusEvent<HTMLInputElement>) {
    // For MELT, use metal type as key; for SCRAP, use metalType-purity
    const key = transaction.type === "MELT" ? metalType : `${metalType}-${purity}`
    const currentValue = purityPercentages[key] ?? 0
    
    // If the field has value 0, clear it when focused
    if (currentValue === 0) {
      setPurityPercentages(prev => {
        const updated = { ...prev }
        delete updated[key]
        return updated
      })
      // Clear the input field
      e.target.value = ""
    }
  }
  
  function handlePurityPercentageBlur(metalType: MetalType, purity: string, e: React.FocusEvent<HTMLInputElement>) {
    // For MELT, use metal type as key instead of purity
    const key = transaction.type === "MELT" ? metalType : `${metalType}-${purity}`
    const value = e.target.value
    
    // If field is empty on blur, set it back to 0
    if (value === "" || value === null || value === undefined) {
      setPurityPercentages(prev => ({
        ...prev,
        [key]: 0
      }))
      const currentDwt = dwtValues[key] || 0
      if (transaction.type === "MELT") {
        debouncedSave(metalType, metalType, currentDwt, 0) // Use metalType as purity for MELT
      } else {
        debouncedSave(metalType, purity, currentDwt, 0)
      }
    }
  }

  function handleClear(metalType: MetalType, purity: string) {
    // For MELT, use metal type as key instead of purity
    const key = transaction.type === "MELT" ? metalType : `${metalType}-${purity}`
    setDwtValues((prev) => ({ ...prev, [key]: 0 }))
    if (transaction.type === "MELT") {
      setPurityPercentages((prev) => {
        const updated = { ...prev }
        delete updated[key]
        return updated
      })
      debouncedSave(metalType, metalType, 0) // Use metalType as purity for MELT
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

    if (transaction.type === "MELT") {
      // For MELT: single row, use metal type as key
      const key = metalType
      const dwt = dwtValues[key] || 0
      const purityPctValue = purityPercentages[key] ?? 0
      const purityPercentage = typeof purityPctValue === 'string' ? parseFloat(purityPctValue) || 0 : purityPctValue
      
      // Find existing line item (for MELT, we look for any line item with this metal type)
      const existingItem = transaction.lineItems.find(
        (item) => item.metalType === metalType
      )
      
      const metalTypeCamel = metalType.charAt(0) + metalType.slice(1).toLowerCase()
      const percentageKey = `melt${metalTypeCamel.charAt(0).toUpperCase() + metalTypeCamel.slice(1)}`
      const percentageValue = percentages[percentageKey]
      const percentage = typeof percentageValue === 'number' ? percentageValue : (typeof percentageValue === 'string' && percentageValue !== '' ? parseFloat(percentageValue) || 95 : 95)
      
      const rows = getMeltPricingRows(metalType, spotPrice, { [key]: dwt }, { [key]: purityPercentage }, percentage)
      const row = rows[0] // Single row for MELT
      
      return [{
        purity: metalType, // Use metal type as purity identifier
        dwt: row.dwt,
        pricePerDWT: row.pricePerDWT,
        lineTotal: row.lineTotal,
        purityPercentage: row.purityPercentage,
        saving: saving[key] || false,
        existingItem,
      }]
    }

    // For SCRAP: multiple rows based on purity
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

      let pricePerDWT = 0
      let lineTotal = 0

      // Use SCRAP formulas
      const metalTypeCamel = metalType.charAt(0) + metalType.slice(1).toLowerCase()
      const percentageKey = `scrap${metalTypeCamel.charAt(0).toUpperCase() + metalTypeCamel.slice(1)}`
      const percentageValue = percentages[percentageKey]
      const percentage = typeof percentageValue === 'number' ? percentageValue : (typeof percentageValue === 'string' && percentageValue !== '' ? parseFloat(percentageValue) || 95 : 95)
      const rows = getScrapPricingRows(metalType, spotPrice, { [purity]: dwt }, percentage)
      const row = rows.find((r) => r.purity === purity)!
      pricePerDWT = row.pricePerDWT
      lineTotal = row.lineTotal

      return {
        purity,
        dwt,
        pricePerDWT,
        lineTotal,
        purityPercentage: undefined, // SCRAP doesn't use purity percentage
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
      // For MELT, just clear the single row
      handleClear(metalType, metalType)
    } else {
      // For SCRAP, clear all purity rows
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
                  value={spotPrice || ""}
                  onChange={(e) => handlePriceChange(metalType, e.target.value)}
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
                  onChange={(e) => handlePercentageChange(metalType, e.target.value)}
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

  // Show all metal tables stacked vertically (no carousel)
  return (
    <div className="space-y-4">
      {/* Metal prices ticker (same as dashboard) */}
      <div className="w-full min-w-0 max-w-full">
        <TradingViewTickerTape />
      </div>

      {/* All Metal Tables Stacked */}
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
                    value={spotPrices.gold || ""}
                    onChange={(e) => handlePriceChange("GOLD", e.target.value)}
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
                    onChange={(e) => handlePercentageChange("GOLD", e.target.value)}
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
                    value={spotPrices.silver || ""}
                    onChange={(e) => handlePriceChange("SILVER", e.target.value)}
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
                    onChange={(e) => handlePercentageChange("SILVER", e.target.value)}
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
                    value={spotPrices.platinum || ""}
                    onChange={(e) => handlePriceChange("PLATINUM", e.target.value)}
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
                    onChange={(e) => handlePercentageChange("PLATINUM", e.target.value)}
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

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 sticky bottom-2 sm:bottom-4 bg-background p-2 sm:p-3 md:p-4 border rounded-lg shadow-lg z-50 mx-2 sm:mx-0">
        <Button onClick={onPrint} className="flex-1 w-full sm:w-auto text-sm sm:text-base" size="lg">
          <Printer className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <span className="whitespace-nowrap">Print</span>
        </Button>
        <Button onClick={onNewTransaction} variant="outline" size="lg" className="w-full sm:w-auto whitespace-normal sm:whitespace-nowrap text-sm sm:text-base">
          <span className="text-center">Start New <span className="text-red-600 font-semibold">{transaction.type}</span> Transaction</span>
        </Button>
      </div>
    </div>
  )
}

