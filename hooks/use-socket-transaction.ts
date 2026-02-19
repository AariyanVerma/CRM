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

// Track per-transaction state to prevent duplicate fetches
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

// Track in-flight refetches to prevent duplicate requests
const inFlightRefetches = new Set<string>()
// Track when refetches completed to prevent rapid successive refetches
const lastRefetchTime = new Map<string, number>()
const REFETCH_COOLDOWN_MS = 200 // Minimum time between refetches

// Shared refetch function per transaction
async function refetchLineItems(transactionId: string) {
  const state = transactionState.get(transactionId)
  if (!state) {
    console.log(`[useSocketTransaction] No state found for transaction ${transactionId} - skipping refetch`)
    return
  }

  // CRITICAL: Prevent duplicate refetches if one is already in flight
  if (inFlightRefetches.has(transactionId)) {
    console.log(`[useSocketTransaction] Skipping refetch for ${transactionId} - already in flight`)
    return
  }

  // Clear any pending refetch timeout
  if (state.refetchTimeout) {
    clearTimeout(state.refetchTimeout)
    state.refetchTimeout = null
  }

  // Mark as in-flight
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

      // Only update if line items actually changed
      const itemsChanged = 
        !state.lastLineItems ||
        state.lastLineItems.length !== lineItems.length ||
        JSON.stringify(state.lastLineItems) !== JSON.stringify(lineItems)

      if (itemsChanged) {
        state.lastLineItems = lineItems
        // Notify all active subscribers
        state.activeCallbacks.forEach(callback => callback(lineItems))
      }
      
      // Record when refetch completed for cooldown period
      lastRefetchTime.set(transactionId, Date.now())
    }
  } catch (error) {
    console.error("Error fetching line items:", error)
  } finally {
    // Clear in-flight flag
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

  // Keep callback refs updated
  useEffect(() => {
    callbackRef.current = onLineItemsUpdate
  }, [onLineItemsUpdate])

  useEffect(() => {
    transactionChangedCallbackRef.current = onTransactionChanged
  }, [onTransactionChanged])

  useEffect(() => {
    if (!transactionId || !enabled) return

    // Get or create transaction state
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

    // Register this callback
    const wrappedCallback = (lineItems: LineItem[]) => {
      callbackRef.current(lineItems)
    }
    state.activeCallbacks.add(wrappedCallback)

    // Initial fetch on mount (only once per transaction)
    const fetchInitialLineItems = async () => {
      // If already fetching, wait for that promise
      if (state.fetchPromise) {
        const lineItems = await state.fetchPromise
        if (lineItems) {
          wrappedCallback(lineItems)
        }
        return
      }

      // If already fetched, use cached value immediately
      if (state.lastLineItems) {
        wrappedCallback(state.lastLineItems)
        return
      }

      // Start new fetch
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
            // Notify all active subscribers
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

    // Only fetch if this is the first subscriber or line items haven't been fetched yet
    if (!state.lastLineItems || state.activeCallbacks.size === 1) {
      fetchInitialLineItems()
    } else if (state.lastLineItems) {
      // Already fetched, just call callback with cached value
      wrappedCallback(state.lastLineItems)
    }

    // Join transaction room (idempotent)
    socket.emit("join_tx", { transactionId })

    // Attach socket listeners only once per transaction (global for this transaction)
    if (!state.socketListenersAttached) {
      state.globalSocket = socket
      state.socketListenersAttached = true
      
      // Global line items change handler with debouncing
      // CRITICAL: Check transactionId in event payload to only refetch for this transaction
        state.globalOnLineItemsChanged = (eventData?: { transactionId?: string }) => {
          // CRITICAL: Only process events for this specific transaction
          // If eventData has a transactionId, it MUST match our transactionId
          if (eventData?.transactionId) {
            if (eventData.transactionId !== transactionId) {
              console.log(`[useSocketTransaction] Ignoring line_items_changed event for transaction ${eventData.transactionId} (we are ${transactionId})`)
              return // Ignore events for other transactions
            }
          }
          // If no transactionId in event, we still process it (backward compatibility)
          // but log a warning
          if (!eventData?.transactionId) {
            console.warn(`[useSocketTransaction] line_items_changed event received without transactionId - processing anyway for ${transactionId}`)
          }
          
          // CRITICAL: Skip if already refetching (in-flight check)
          if (inFlightRefetches.has(transactionId)) {
            console.log(`[useSocketTransaction] Socket event received for ${transactionId} but refetch already in flight - skipping`)
            return
          }
          
          // CRITICAL: Skip if we just refetched recently (cooldown period)
          const lastRefetch = lastRefetchTime.get(transactionId)
          const timeSinceLastRefetch = lastRefetch ? Date.now() - lastRefetch : Infinity
          if (timeSinceLastRefetch < REFETCH_COOLDOWN_MS) {
            console.log(`[useSocketTransaction] Socket event received for ${transactionId} but refetch completed ${timeSinceLastRefetch}ms ago (cooldown: ${REFETCH_COOLDOWN_MS}ms) - skipping`)
            return
          }
          
          // CRITICAL: Skip if a debounced refetch is already scheduled
          // Don't reschedule - just let the existing one handle it
          if (state.refetchTimeout) {
            console.log(`[useSocketTransaction] Socket event received for ${transactionId} but debounced refetch already scheduled - skipping (will use existing timeout)`)
            return
          }
          
          // Debounce: wait 100ms before refetching (in case multiple events fire rapidly)
          console.log(`[useSocketTransaction] Scheduling debounced refetch for ${transactionId} in 100ms`)
          state.refetchTimeout = setTimeout(() => {
            // Clear timeout reference immediately
            state.refetchTimeout = null
            
            // Double-check: still no request in flight (might have been set by another event)
            if (inFlightRefetches.has(transactionId)) {
              console.log(`[useSocketTransaction] Debounced refetch for ${transactionId} cancelled - refetch already in flight`)
              return
            }
            
            // CRITICAL: Check cooldown period - if we just refetched recently, skip this one
            const lastRefetch = lastRefetchTime.get(transactionId)
            const timeSinceLastRefetch = lastRefetch ? Date.now() - lastRefetch : Infinity
            if (timeSinceLastRefetch < REFETCH_COOLDOWN_MS) {
              console.log(`[useSocketTransaction] Debounced refetch for ${transactionId} cancelled - refetch completed ${timeSinceLastRefetch}ms ago (cooldown: ${REFETCH_COOLDOWN_MS}ms)`)
              return
            }
            
            // Now actually refetch
            refetchLineItems(transactionId)
          }, 100)
        }

      // Global transaction change handler
      // CRITICAL: Check transactionId in event payload to only refetch for this transaction
      state.globalOnTransactionChanged = (eventData?: { transactionId?: string }) => {
        // CRITICAL: Only process events for this specific transaction
        // If eventData has a transactionId, it MUST match our transactionId
        if (eventData?.transactionId) {
          if (eventData.transactionId !== transactionId) {
            console.log(`[useSocketTransaction] Ignoring transaction_changed event for transaction ${eventData.transactionId} (we are ${transactionId})`)
            return // Ignore events for other transactions
          }
        }
        // If no transactionId in event, we still process it (backward compatibility)
        // but log a warning
        if (!eventData?.transactionId) {
          console.warn(`[useSocketTransaction] transaction_changed event received without transactionId - processing anyway for ${transactionId}`)
        }
        
        // Refetch line items when transaction changes
        if (state.globalOnLineItemsChanged) {
          state.globalOnLineItemsChanged(eventData)
        }
      }

      state.globalOnConnect = () => {
        // Re-join on reconnect
        socket.emit("join_tx", { transactionId })
      }

      socket.on("line_items_changed", state.globalOnLineItemsChanged)
      socket.on("transaction_changed", state.globalOnTransactionChanged)
      socket.on("connect", state.globalOnConnect)
      
      console.log(`[useSocketTransaction] Socket listeners attached for transaction ${transactionId} (global)`)
    }

    // Also attach per-instance connection status handler for isConnected state
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
      // Remove this callback
      state.activeCallbacks.delete(wrappedCallback)
      
      // Remove per-instance handlers
      socket.off("connect", onInstanceConnect)
      socket.off("disconnect", onInstanceDisconnect)
      
      // Remove global listeners only when last subscriber unsubscribes
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
        // Still have other subscribers, just leave the room for this instance
        socket.emit("leave_tx", { transactionId })
      }
    }
  }, [transactionId, enabled])

  return { isConnected }
}
