"use client"

import { useEffect, useRef, useState } from "react"
import { getSocket } from "@/lib/socketClient"

interface LineItem {
  id: string
  metalType: "GOLD" | "SILVER" | "PLATINUM"
  purityLabel: string
  dwt: number
  pricePerOz: number
  lineTotal: number
  purityPercentage?: number | null
}

const transactionState = new Map<string, {
  lastLineItems: LineItem[] | null
  fetchPromise: Promise<LineItem[] | null> | null
  refetchTimeout: NodeJS.Timeout | null
  activeCallbacks: Set<(lineItems: LineItem[]) => void>
  socketListenersAttached: boolean
  globalSocket: ReturnType<typeof getSocket> | null
  globalOnLineItemsChanged: ((eventData?: { transactionId?: string }) => void) | null
  globalOnTransactionChanged: ((eventData?: { transactionId?: string }) => void) | null
  globalOnConnect: (() => void) | null
}>()

const inFlightRefetches = new Set<string>()

const lastRefetchTime = new Map<string, number>()
const REFETCH_COOLDOWN_MS = 200

async function refetchLineItems(transactionId: string) {
  const state = transactionState.get(transactionId)
  if (!state) {
    return
  }

  if (inFlightRefetches.has(transactionId)) {
    return
  }

  if (state.refetchTimeout) {
    clearTimeout(state.refetchTimeout)
    state.refetchTimeout = null
  }

  inFlightRefetches.add(transactionId)

  try {
    const res = await fetch(`/api/transactions/${transactionId}/line-items`, {
      credentials: "include",
      cache: "no-store",
    })
    if (res.ok) {
      const data = await res.json()
      const lineItems: LineItem[] = data.lineItems || []

      const itemsChanged = 
        !state.lastLineItems ||
        state.lastLineItems.length !== lineItems.length ||
        JSON.stringify(state.lastLineItems) !== JSON.stringify(lineItems)

      if (itemsChanged) {
        state.lastLineItems = lineItems

        state.activeCallbacks.forEach(callback => callback(lineItems))
      }

      lastRefetchTime.set(transactionId, Date.now())
    }
  } catch (error) {
    console.error("Error fetching line items:", error)
  } finally {

    inFlightRefetches.delete(transactionId)
  }
}

export function useSocketTransaction(
  transactionId: string,
  onLineItemsUpdate: (lineItems: LineItem[]) => void,
  options: { enabled?: boolean; onTransactionChanged?: (transactionId: string) => void } = {}
) {
  const { enabled = true, onTransactionChanged } = options
  const [isConnected, setIsConnected] = useState(false)
  const callbackRef = useRef(onLineItemsUpdate)
  const transactionChangedCallbackRef = useRef(onTransactionChanged)
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null)

  useEffect(() => {
    callbackRef.current = onLineItemsUpdate
  }, [onLineItemsUpdate])

  useEffect(() => {
    transactionChangedCallbackRef.current = onTransactionChanged
  }, [onTransactionChanged])

  useEffect(() => {
    if (!transactionId || !enabled) return

    if (!transactionState.has(transactionId)) {
      transactionState.set(transactionId, {
        lastLineItems: null,
        fetchPromise: null,
        refetchTimeout: null,
        activeCallbacks: new Set(),
        socketListenersAttached: false,
        globalSocket: null,
        globalOnLineItemsChanged: null,
        globalOnTransactionChanged: null,
        globalOnConnect: null,
      })
    }
    const state = transactionState.get(transactionId)!

    const socket = getSocket()
    socketRef.current = socket

    const wrappedCallback = (lineItems: LineItem[]) => {
      callbackRef.current(lineItems)
    }
    state.activeCallbacks.add(wrappedCallback)

    const fetchInitialLineItems = async () => {

      if (state.fetchPromise) {
        const lineItems = await state.fetchPromise
        if (lineItems) {
          wrappedCallback(lineItems)
        }
        return
      }

      if (state.lastLineItems) {
        wrappedCallback(state.lastLineItems)
        return
      }

      state.fetchPromise = (async () => {
        try {
          const res = await fetch(`/api/transactions/${transactionId}/line-items`, {
            credentials: "include",
            cache: "no-store",
          })
          if (res.ok) {
            const data = await res.json()
            const lineItems: LineItem[] = data.lineItems || []
            state.lastLineItems = lineItems

            state.activeCallbacks.forEach(cb => cb(lineItems))
            return lineItems
          }
        } catch (error) {
          console.error("Error fetching initial line items:", error)
        }
        return null
      })()

      const lineItems = await state.fetchPromise
      state.fetchPromise = null
      return lineItems
    }

    if (!state.lastLineItems || state.activeCallbacks.size === 1) {
      fetchInitialLineItems()
    } else if (state.lastLineItems) {

      wrappedCallback(state.lastLineItems)
    }

    socket.emit("join_tx", { transactionId })

    if (!state.socketListenersAttached) {
      state.globalSocket = socket
      state.socketListenersAttached = true

        state.globalOnLineItemsChanged = (eventData?: { transactionId?: string }) => {
          if (eventData?.transactionId) {
            if (eventData.transactionId !== transactionId) {
              return
            }
          }

          if (inFlightRefetches.has(transactionId)) {
            return
          }

          const lastRefetch = lastRefetchTime.get(transactionId)
          const timeSinceLastRefetch = lastRefetch ? Date.now() - lastRefetch : Infinity
          if (timeSinceLastRefetch < REFETCH_COOLDOWN_MS) {
            return
          }

          if (state.refetchTimeout) {
            return
          }

          state.refetchTimeout = setTimeout(() => {
            state.refetchTimeout = null

            if (inFlightRefetches.has(transactionId)) {
              return
            }

            const lastRefetch = lastRefetchTime.get(transactionId)
            const timeSinceLastRefetch = lastRefetch ? Date.now() - lastRefetch : Infinity
            if (timeSinceLastRefetch < REFETCH_COOLDOWN_MS) {
              return
            }

            refetchLineItems(transactionId)
          }, 100)
        }

      state.globalOnTransactionChanged = (eventData?: { transactionId?: string }) => {
        if (eventData?.transactionId) {
          if (eventData.transactionId !== transactionId) {
            return
          }
        }

        if (state.globalOnLineItemsChanged) {
          state.globalOnLineItemsChanged(eventData)
        }
      }

      state.globalOnConnect = () => {

        socket.emit("join_tx", { transactionId })
      }

      socket.on("line_items_changed", state.globalOnLineItemsChanged)
      socket.on("transaction_changed", state.globalOnTransactionChanged)
      socket.on("connect", state.globalOnConnect)
    }

    const onInstanceConnect = () => {
      setIsConnected(true)
      socket.emit("join_tx", { transactionId })
    }
    const onInstanceDisconnect = () => {
      setIsConnected(false)
    }
    socket.on("connect", onInstanceConnect)
    socket.on("disconnect", onInstanceDisconnect)

    return () => {

      state.activeCallbacks.delete(wrappedCallback)

      socket.off("connect", onInstanceConnect)
      socket.off("disconnect", onInstanceDisconnect)

      if (state.activeCallbacks.size === 0 && state.socketListenersAttached && state.globalSocket) {
        if (state.globalOnLineItemsChanged) state.globalSocket.off("line_items_changed", state.globalOnLineItemsChanged)
        if (state.globalOnTransactionChanged) state.globalSocket.off("transaction_changed", state.globalOnTransactionChanged)
        if (state.globalOnConnect) state.globalSocket.off("connect", state.globalOnConnect)
        state.globalSocket.emit("leave_tx", { transactionId })
        state.socketListenersAttached = false
        state.globalSocket = null
        state.globalOnLineItemsChanged = null
        state.globalOnTransactionChanged = null
        state.globalOnConnect = null
        if (state.refetchTimeout) {
          clearTimeout(state.refetchTimeout)
          state.refetchTimeout = null
        }
        transactionState.delete(transactionId)
      } else if (state.activeCallbacks.size > 0) {

        socket.emit("leave_tx", { transactionId })
      }
    }
  }, [transactionId, enabled])

  return { isConnected }
}
