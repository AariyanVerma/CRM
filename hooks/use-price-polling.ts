"use client"

import { useEffect, useRef, useState } from "react"

interface DailyPrice {
  gold: number
  silver: number
  platinum: number
  percentage: number
  timestamp?: number
}

export function usePricePolling(
  onPriceUpdate: (prices: DailyPrice) => void,
  options: { interval?: number; enabled?: boolean } = {}
) {
  const { interval = 500, enabled = true } = options
  const [isPolling, setIsPolling] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastPricesRef = useRef<DailyPrice | null>(null)
  const lastTimestampRef = useRef<number | null>(null)
  const isVisibleRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
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
  }, [enabled, interval])

  const startPolling = () => {
    if (intervalRef.current) return

    setIsPolling(true)
    
    // Fetch immediately
    fetchPrices()

    // Then poll at interval
    intervalRef.current = setInterval(() => {
      if (isVisibleRef.current) {
        fetchPrices()
      }
    }, interval)
  }

  const fetchPrices = async () => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    try {
      const res = await fetch("/api/prices/current", {
        credentials: "include",
        cache: "no-store",
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      })

      if (!res.ok) return

      const data = await res.json()
      const prices: DailyPrice = {
        gold: data.gold,
        silver: data.silver,
        platinum: data.platinum,
        percentage: data.percentage || 95,
        timestamp: data.timestamp,
      }

      // Check if prices changed by comparing both values and timestamp
      const pricesChanged = 
        !lastPricesRef.current ||
        lastPricesRef.current.gold !== prices.gold ||
        lastPricesRef.current.silver !== prices.silver ||
        lastPricesRef.current.platinum !== prices.platinum ||
        lastPricesRef.current.percentage !== prices.percentage

      const timestampChanged = 
        prices.timestamp && 
        lastTimestampRef.current !== prices.timestamp

      // Only call onPriceUpdate if prices actually changed
      if (pricesChanged || timestampChanged) {
        lastPricesRef.current = prices
        if (prices.timestamp) {
          lastTimestampRef.current = prices.timestamp
        }
        onPriceUpdate(prices)
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error.name !== 'AbortError') {
        console.error("Error fetching prices:", error)
      }
    } finally {
      abortControllerRef.current = null
    }
  }

  return { isPolling }
}

