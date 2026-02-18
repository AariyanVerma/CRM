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

export function useSocketPrices(
  onPriceUpdate: (prices: DailyPrice) => void,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options
  const [isConnected, setIsConnected] = useState(false)
  const lastPricesRef = useRef<DailyPrice | null>(null)
  const callbackRef = useRef(onPriceUpdate)

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onPriceUpdate
  }, [onPriceUpdate])

  useEffect(() => {
    if (!enabled) return

    const socket = getSocket()
    
    // Initial fetch on mount
    const fetchInitialPrices = async () => {
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
          lastPricesRef.current = prices
          callbackRef.current(prices)
        }
      } catch (error) {
        console.error("Error fetching initial prices:", error)
      }
    }

    fetchInitialPrices()

    // Join prices room
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
      // Note: We don't disconnect the socket here as it's a singleton
      // and may be used by other components
    }
  }, [enabled])

  return { isConnected }
}

