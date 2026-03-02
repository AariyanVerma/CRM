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
    console.log(`[useSocketTransaction] No state found for transaction ${transactionId} - skipping refetch`)
    return
  }

  if (inFlightRefetches.has(transactionId)) {
    console.log(`[useSocketTransaction] Skipping refetch for ${transactionId} - already in flight`)
    return
  }

  if (state.refetchTimeout) {
    clearTimeout(state.refetchTimeout)
    state.refetchTimeout = null
  }

  inFlightRefetches.add(transactionId)

  try {
    console.log(`[useSocketTransaction] Refetching line items for transaction ${transactionId}`)
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

      console.log(`[useSocketTransaction] Fetching initial line items for transaction ${transactionId}`)
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
              console.log(`[useSocketTransaction] Ignoring line_items_changed event for transaction ${eventData.transactionId} (we are ${transactionId})`)
              return
            }
          }

          if (!eventData?.transactionId) {
            console.warn(`[useSocketTransaction] line_items_changed event received without transactionId - processing anyway for ${transactionId}`)
          }

          if (inFlightRefetches.has(transactionId)) {
            console.log(`[useSocketTransaction] Socket event received for ${transactionId} but refetch already in flight - skipping`)
            return
          }

          const lastRefetch = lastRefetchTime.get(transactionId)
          const timeSinceLastRefetch = lastRefetch ? Date.now() - lastRefetch : Infinity
          if (timeSinceLastRefetch < REFETCH_COOLDOWN_MS) {
            console.log(`[useSocketTransaction] Socket event received for ${transactionId} but refetch completed ${timeSinceLastRefetch}ms ago (cooldown: ${REFETCH_COOLDOWN_MS}ms) - skipping`)
            return
          }

          if (state.refetchTimeout) {
            console.log(`[useSocketTransaction] Socket event received for ${transactionId} but debounced refetch already scheduled - skipping (will use existing timeout)`)
            return
          }

          console.log(`[useSocketTransaction] Scheduling debounced refetch for ${transactionId} in 100ms`)
          state.refetchTimeout = setTimeout(() => {

            state.refetchTimeout = null

            if (inFlightRefetches.has(transactionId)) {
              console.log(`[useSocketTransaction] Debounced refetch for ${transactionId} cancelled - refetch already in flight`)
              return
            }

            const lastRefetch = lastRefetchTime.get(transactionId)
            const timeSinceLastRefetch = lastRefetch ? Date.now() - lastRefetch : Infinity
            if (timeSinceLastRefetch < REFETCH_COOLDOWN_MS) {
              console.log(`[useSocketTransaction] Debounced refetch for ${transactionId} cancelled - refetch completed ${timeSinceLastRefetch}ms ago (cooldown: ${REFETCH_COOLDOWN_MS}ms)`)
              return
            }

            refetchLineItems(transactionId)
          }, 100)
        }

      state.globalOnTransactionChanged = (eventData?: { transactionId?: string }) => {

        if (eventData?.transactionId) {
          if (eventData.transactionId !== transactionId) {
            console.log(`[useSocketTransaction] Ignoring transaction_changed event for transaction ${eventData.transactionId} (we are ${transactionId})`)
            return
          }
        }

        if (!eventData?.transactionId) {
          console.warn(`[useSocketTransaction] transaction_changed event received without transactionId - processing anyway for ${transactionId}`)
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
      
      console.log(`[useSocketTransaction] Socket listeners attached for transaction ${transactionId} (global)`)
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
        console.log(`[useSocketTransaction] Socket listeners removed for transaction ${transactionId} (last subscriber)`)
      } else if (state.activeCallbacks.size > 0) {

        socket.emit("leave_tx", { transactionId })
      }
    }
  }, [transactionId, enabled])

  return { isConnected }
}
