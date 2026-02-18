"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { getSocket } from "@/lib/socketClient"

interface DailyPrice {
  gold: number
  silver: number
  platinum: number
  percentage: number
  timestamp?: number
}

// Global flag to prevent multiple initial fetches across components
let initialPricesFetched = false
let initialPricesPromise: Promise<DailyPrice | null> | null = null

export function useSocketPrices(
  onPriceUpdate: (prices: DailyPrice) => void,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options
  const [isConnected, setIsConnected] = useState(false)
  const lastPricesRef = useRef<DailyPrice | null>(null)
  const callbackRef = useRef(onPriceUpdate)
  const hasInitializedRef = useRef(false)

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onPriceUpdate
  }, [onPriceUpdate])

  useEffect(() => {
    if (!enabled || hasInitializedRef.current) return
    hasInitializedRef.current = true

    const socket = getSocket()
    
    // Shared initial fetch - only fetch once globally
    const fetchInitialPrices = async () => {
      // If already fetching, wait for that promise
      if (initialPricesPromise) {
        const prices = await initialPricesPromise
        if (prices) {
          lastPricesRef.current = prices
          callbackRef.current(prices)
        }
        return
      }

      // If already fetched, use cached value
      if (initialPricesFetched && lastPricesRef.current) {
        callbackRef.current(lastPricesRef.current)
        return
      }

      // Start new fetch
      initialPricesPromise = (async () => {
        try {
          const res = await fetch("/api/prices/current", {
            credentials: "include",
            cache: "no-store",
          })
          if (res.ok) {
            const data = await res.json()
            const prices: DailyPrice = {
              gold: data.gold,
              silver: data.silver,
              platinum: data.platinum,
              percentage: data.percentage || 95,
              timestamp: data.timestamp,
            }
            initialPricesFetched = true
            lastPricesRef.current = prices
            callbackRef.current(prices)
            return prices
          }
        } catch (error) {
          console.error("Error fetching initial prices:", error)
        }
        return null
      })()

      const prices = await initialPricesPromise
      initialPricesPromise = null
      return prices
    }

    fetchInitialPrices()

    // Join prices room (idempotent - safe to call multiple times)
    socket.emit("join_prices")

    // Listen for connection status
    const onConnect = () => {
      setIsConnected(true)
      socket.emit("join_prices")
    }
    const onDisconnect = () => setIsConnected(false)

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)

    // Listen for price change events
    const onPricesChanged = async () => {
      try {
        const res = await fetch("/api/prices/current", {
          credentials: "include",
          cache: "no-store",
        })
        if (res.ok) {
          const data = await res.json()
          const prices: DailyPrice = {
            gold: data.gold,
            silver: data.silver,
            platinum: data.platinum,
            percentage: data.percentage || 95,
            timestamp: data.timestamp,
          }

          // Only update if prices actually changed
          const pricesChanged = 
            !lastPricesRef.current ||
            lastPricesRef.current.gold !== prices.gold ||
            lastPricesRef.current.silver !== prices.silver ||
            lastPricesRef.current.platinum !== prices.platinum ||
            lastPricesRef.current.percentage !== prices.percentage

          if (pricesChanged) {
            lastPricesRef.current = prices
            callbackRef.current(prices)
          }
        }
      } catch (error) {
        console.error("Error fetching prices after socket event:", error)
      }
    }

    socket.on("prices_changed", onPricesChanged)

    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.off("prices_changed", onPricesChanged)
      hasInitializedRef.current = false
    }
  }, [enabled])

  return { isConnected }
}

