"use client"

import { useEffect, useRef, useState } from "react"
import { getSocket } from "@/lib/socketClient"

interface DailyPrice {
  gold: number
  silver: number
  platinum: number
  scrapGoldPercentage: number
  scrapSilverPercentage: number
  scrapPlatinumPercentage: number
  meltGoldPercentage: number
  meltSilverPercentage: number
  meltPlatinumPercentage: number
  timestamp?: number
}

// Global state to prevent multiple initial fetches across components
let initialPricesFetched = false
let initialPricesPromise: Promise<DailyPrice | null> | null = null
let globalLastPrices: DailyPrice | null = null
let globalRefetchTimeout: NodeJS.Timeout | null = null
const activeCallbacks = new Set<(prices: DailyPrice) => void>()
// Track if we've already joined the prices room (prevent duplicate joins)
let pricesRoomJoined = false
// Track if socket listeners are already attached (prevent duplicate listeners)
let socketListenersAttached = false
let globalSocket: ReturnType<typeof getSocket> | null = null
let globalOnConnect: (() => void) | null = null
let globalOnDisconnect: (() => void) | null = null
let globalOnPricesChanged: (() => void) | null = null

// Track in-flight refetch to prevent duplicates
let inFlightPricesRefetch = false

// Shared refetch function that notifies all subscribers
async function refetchPrices() {
  // CRITICAL: Prevent duplicate refetches if one is already in flight
  if (inFlightPricesRefetch) {
    console.log('[useSocketPrices] Skipping refetch - already in flight')
    return
  }

  // Clear any pending refetch
  if (globalRefetchTimeout) {
    clearTimeout(globalRefetchTimeout)
    globalRefetchTimeout = null
  }

  // Mark as in-flight
  inFlightPricesRefetch = true

  try {
    console.log('[useSocketPrices] Refetching prices')
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
        scrapGoldPercentage: data.scrapGoldPercentage || 95,
        scrapSilverPercentage: data.scrapSilverPercentage || 95,
        scrapPlatinumPercentage: data.scrapPlatinumPercentage || 95,
        meltGoldPercentage: data.meltGoldPercentage || 95,
        meltSilverPercentage: data.meltSilverPercentage || 95,
        meltPlatinumPercentage: data.meltPlatinumPercentage || 95,
        timestamp: data.timestamp,
      }

      // Only update if prices actually changed
      const pricesChanged = 
        !globalLastPrices ||
        globalLastPrices.gold !== prices.gold ||
        globalLastPrices.silver !== prices.silver ||
        globalLastPrices.platinum !== prices.platinum ||
        globalLastPrices.scrapGoldPercentage !== prices.scrapGoldPercentage ||
        globalLastPrices.scrapSilverPercentage !== prices.scrapSilverPercentage ||
        globalLastPrices.scrapPlatinumPercentage !== prices.scrapPlatinumPercentage ||
        globalLastPrices.meltGoldPercentage !== prices.meltGoldPercentage ||
        globalLastPrices.meltSilverPercentage !== prices.meltSilverPercentage ||
        globalLastPrices.meltPlatinumPercentage !== prices.meltPlatinumPercentage

      if (pricesChanged) {
        globalLastPrices = prices
        // Notify all active subscribers
        activeCallbacks.forEach(callback => callback(prices))
      }
    }
  } catch (error) {
    console.error("Error fetching prices:", error)
  } finally {
    // Clear in-flight flag
    inFlightPricesRefetch = false
  }
}

export function useSocketPrices(
  onPriceUpdate: (prices: DailyPrice) => void,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options
  const [isConnected, setIsConnected] = useState(false)
  const callbackRef = useRef(onPriceUpdate)
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null)

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onPriceUpdate
  }, [onPriceUpdate])

  useEffect(() => {
    if (!enabled) return

    const socket = getSocket()
    socketRef.current = socket

    // Register this callback
    const wrappedCallback = (prices: DailyPrice) => {
      callbackRef.current(prices)
    }
    activeCallbacks.add(wrappedCallback)

    // Shared initial fetch - only fetch once globally
    const fetchInitialPrices = async () => {
      // If already fetching, wait for that promise
      if (initialPricesPromise) {
        const prices = await initialPricesPromise
        if (prices) {
          wrappedCallback(prices)
        }
        return
      }

      // If already fetched, use cached value immediately
      if (initialPricesFetched && globalLastPrices) {
        wrappedCallback(globalLastPrices)
        return
      }

      // Start new fetch only if not already fetched
      console.log('[useSocketPrices] Fetching initial prices (first time)')
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
              scrapGoldPercentage: data.scrapGoldPercentage || 95,
              scrapSilverPercentage: data.scrapSilverPercentage || 95,
              scrapPlatinumPercentage: data.scrapPlatinumPercentage || 95,
              meltGoldPercentage: data.meltGoldPercentage || 95,
              meltSilverPercentage: data.meltSilverPercentage || 95,
              meltPlatinumPercentage: data.meltPlatinumPercentage || 95,
              timestamp: data.timestamp,
            }
            initialPricesFetched = true
            globalLastPrices = prices
            // Notify all active subscribers
            activeCallbacks.forEach(cb => cb(prices))
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

    // Only fetch if this is the first subscriber or prices haven't been fetched yet
    if (!initialPricesFetched || activeCallbacks.size === 1) {
      fetchInitialPrices()
    } else if (globalLastPrices) {
      // Already fetched, just call callback with cached value
      wrappedCallback(globalLastPrices)
    }

    // Join prices room only once globally (prevent duplicate joins)
    if (!pricesRoomJoined) {
      socket.emit("join_prices")
      pricesRoomJoined = true
      console.log('[useSocketPrices] Joined prices room (first time)')
    }

    // Listen for connection status
    const onConnect = () => {
      setIsConnected(true)
      // Re-join on reconnect (socket.io will handle deduplication, but we track it)
      if (pricesRoomJoined) {
        socket.emit("join_prices")
      }
    }
    const onDisconnect = () => setIsConnected(false)

    // Attach socket listeners only once globally
    if (!socketListenersAttached) {
      globalSocket = socket
      socketListenersAttached = true
      
      globalOnConnect = () => {
        // Re-join on reconnect
        if (pricesRoomJoined) {
          socket.emit("join_prices")
        }
      }
      globalOnDisconnect = () => {
        // Connection lost - will reconnect automatically
      }

      // Global price change handler with debouncing
      globalOnPricesChanged = () => {
        // Skip if already refetching
        if (inFlightPricesRefetch) {
          console.log('[useSocketPrices] Socket event received but refetch already in flight - skipping')
          return
        }
        
        // Debounce: wait 100ms before refetching (in case multiple events fire rapidly)
        if (globalRefetchTimeout) {
          clearTimeout(globalRefetchTimeout)
        }
        globalRefetchTimeout = setTimeout(() => {
          refetchPrices()
        }, 100)
      }

      socket.on("connect", globalOnConnect)
      socket.on("disconnect", globalOnDisconnect)
      socket.on("prices_changed", globalOnPricesChanged)
      
      console.log('[useSocketPrices] Socket listeners attached (global)')
    }

    // Also attach per-instance connection status handler for isConnected state
    const onInstanceConnect = () => {
      setIsConnected(true)
    }
    const onInstanceDisconnect = () => {
      setIsConnected(false)
    }
    socket.on("connect", onInstanceConnect)
    socket.on("disconnect", onInstanceDisconnect)

    return () => {
      // Remove this callback
      activeCallbacks.delete(wrappedCallback)
      
      // Remove per-instance handlers
      socket.off("connect", onInstanceConnect)
      socket.off("disconnect", onInstanceDisconnect)
      
      // Remove global listeners only when last subscriber unsubscribes
      if (activeCallbacks.size === 0 && socketListenersAttached && globalSocket) {
        if (globalOnConnect) globalSocket.off("connect", globalOnConnect)
        if (globalOnDisconnect) globalSocket.off("disconnect", globalOnDisconnect)
        if (globalOnPricesChanged) globalSocket.off("prices_changed", globalOnPricesChanged)
        socketListenersAttached = false
        globalSocket = null
        globalOnConnect = null
        globalOnDisconnect = null
        globalOnPricesChanged = null
        initialPricesFetched = false
        globalLastPrices = null
        pricesRoomJoined = false
        if (globalRefetchTimeout) {
          clearTimeout(globalRefetchTimeout)
          globalRefetchTimeout = null
        }
        console.log('[useSocketPrices] Socket listeners removed (last subscriber)')
      }
    }
  }, [enabled])

  return { isConnected }
}
