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
let initialPricesFetched = false
let initialPricesPromise: Promise<DailyPrice | null> | null = null
let globalLastPrices: DailyPrice | null = null
let globalRefetchTimeout: NodeJS.Timeout | null = null
const activeCallbacks = new Set<(prices: DailyPrice) => void>()
let pricesRoomJoined = false
let socketListenersAttached = false
let globalSocket: ReturnType<typeof getSocket> | null = null
let globalOnConnect: (() => void) | null = null
let globalOnDisconnect: (() => void) | null = null
let globalOnPricesChanged: (() => void) | null = null
let inFlightPricesRefetch = false
async function refetchPrices() {
  if (inFlightPricesRefetch) {
    console.log('[useSocketPrices] Skipping refetch - already in flight')
    return
  }
  if (globalRefetchTimeout) {
    clearTimeout(globalRefetchTimeout)
    globalRefetchTimeout = null
  }
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
        activeCallbacks.forEach(callback => callback(prices))
      }
    }
  } catch (error) {
    console.error("Error fetching prices:", error)
  } finally {
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
  useEffect(() => {
    callbackRef.current = onPriceUpdate
  }, [onPriceUpdate])

  useEffect(() => {
    if (!enabled) return

    const socket = getSocket()
    socketRef.current = socket
    const wrappedCallback = (prices: DailyPrice) => {
      callbackRef.current(prices)
    }
    activeCallbacks.add(wrappedCallback)
    const fetchInitialPrices = async () => {
      if (initialPricesPromise) {
        const prices = await initialPricesPromise
        if (prices) {
          wrappedCallback(prices)
        }
        return
      }
      if (initialPricesFetched && globalLastPrices) {
        wrappedCallback(globalLastPrices)
        return
      }
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
    if (!initialPricesFetched || activeCallbacks.size === 1) {
      fetchInitialPrices()
    } else if (globalLastPrices) {
      wrappedCallback(globalLastPrices)
    }
    if (!pricesRoomJoined) {
      socket.emit("join_prices")
      pricesRoomJoined = true
      console.log('[useSocketPrices] Joined prices room (first time)')
    }
    const onConnect = () => {
      setIsConnected(true)
      if (pricesRoomJoined) {
        socket.emit("join_prices")
      }
    }
    const onDisconnect = () => setIsConnected(false)
    if (!socketListenersAttached) {
      globalSocket = socket
      socketListenersAttached = true
      
      globalOnConnect = () => {
        if (pricesRoomJoined) {
          socket.emit("join_prices")
        }
      }
      globalOnDisconnect = () => {
      }
      globalOnPricesChanged = () => {
        if (inFlightPricesRefetch) {
          console.log('[useSocketPrices] Socket event received but refetch already in flight - skipping')
          return
        }
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
    const onInstanceConnect = () => {
      setIsConnected(true)
    }
    const onInstanceDisconnect = () => {
      setIsConnected(false)
    }
    socket.on("connect", onInstanceConnect)
    socket.on("disconnect", onInstanceDisconnect)

    return () => {
      activeCallbacks.delete(wrappedCallback)
      socket.off("connect", onInstanceConnect)
      socket.off("disconnect", onInstanceDisconnect)
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
