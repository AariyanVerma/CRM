"use client"

import { useEffect, useRef, useState } from "react"

interface LineItem {
  id: string
  metalType: "GOLD" | "SILVER" | "PLATINUM"
  purityLabel: string
  dwt: number
  pricePerOz: number
  lineTotal: number
}

export function useTransactionPolling(
  transactionId: string,
  onLineItemsUpdate: (lineItems: LineItem[]) => void,
  options: { interval?: number; enabled?: boolean } = {}
) {
  const { interval = 500, enabled = true } = options
  const [isPolling, setIsPolling] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastLineItemsRef = useRef<LineItem[] | null>(null)
  const lastTimestampRef = useRef<number | null>(null)
  const isVisibleRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!transactionId || !enabled) return

    // Check if page is visible
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden
      if (isVisibleRef.current && enabled) {
        // Resume polling when page becomes visible
        if (!intervalRef.current) {
          startPolling()
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    if (enabled && isVisibleRef.current) {
      startPolling()
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [transactionId, enabled, interval])

  const startPolling = () => {
    if (intervalRef.current) return

    setIsPolling(true)
    
    // Fetch immediately
    fetchLineItems()

    // Then poll at interval
    intervalRef.current = setInterval(() => {
      if (isVisibleRef.current) {
        fetchLineItems()
      }
    }, interval)
  }

  const fetchLineItems = async () => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    try {
      const res = await fetch(`/api/transactions/${transactionId}/line-items`, {
        credentials: "include",
        cache: "no-store",
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      })

      if (!res.ok) return

      const data = await res.json()
      const lineItems: LineItem[] = data.lineItems || []
      const timestamp = data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now()

      // Check if line items changed
      const itemsChanged = 
        !lastLineItemsRef.current ||
        lastLineItemsRef.current.length !== lineItems.length ||
        JSON.stringify(lastLineItemsRef.current) !== JSON.stringify(lineItems)

      const timestampChanged = 
        timestamp && 
        lastTimestampRef.current !== timestamp

      // Only call onLineItemsUpdate if items actually changed
      if (itemsChanged || timestampChanged) {
        lastLineItemsRef.current = lineItems
        if (timestamp) {
          lastTimestampRef.current = timestamp
        }
        onLineItemsUpdate(lineItems)
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error.name !== 'AbortError') {
        console.error("Error fetching line items:", error)
      }
    } finally {
      abortControllerRef.current = null
    }
  }

  return { isPolling }
}


