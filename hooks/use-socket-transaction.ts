"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { getSocket } from "@/lib/socketClient"

interface LineItem {
  id: string
  metalType: "GOLD" | "SILVER" | "PLATINUM"
  purityLabel: string
  dwt: number
  pricePerOz: number
  lineTotal: number
}

// Track initialized transactions to prevent duplicate fetches
const initializedTransactions = new Set<string>()

export function useSocketTransaction(
  transactionId: string,
  onLineItemsUpdate: (lineItems: LineItem[]) => void,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options
  const [isConnected, setIsConnected] = useState(false)
  const lastLineItemsRef = useRef<LineItem[] | null>(null)
  const callbackRef = useRef(onLineItemsUpdate)
  const hasInitializedRef = useRef(false)

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onLineItemsUpdate
  }, [onLineItemsUpdate])

  useEffect(() => {
    if (!transactionId || !enabled || hasInitializedRef.current) return
    hasInitializedRef.current = true

    const socket = getSocket()
    
    // Initial fetch on mount (only once per transaction)
    const fetchInitialLineItems = async () => {
      // Skip if already initialized for this transaction
      if (initializedTransactions.has(transactionId)) {
        if (lastLineItemsRef.current) {
          callbackRef.current(lastLineItemsRef.current)
        }
        return
      }

      try {
        initializedTransactions.add(transactionId)
        const res = await fetch(`/api/transactions/${transactionId}/line-items`, {
          credentials: "include",
          cache: "no-store",
        })
        if (res.ok) {
          const data = await res.json()
          const lineItems: LineItem[] = data.lineItems || []
          lastLineItemsRef.current = lineItems
          callbackRef.current(lineItems)
        }
      } catch (error) {
        console.error("Error fetching initial line items:", error)
        initializedTransactions.delete(transactionId)
      }
    }

    fetchInitialLineItems()

    // Join transaction room (idempotent)
    socket.emit("join_tx", { transactionId })

    // Listen for connection status
    const onConnect = () => {
      setIsConnected(true)
      socket.emit("join_tx", { transactionId })
    }
    const onDisconnect = () => setIsConnected(false)

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)

    // Listen for line items change events
    const onLineItemsChanged = async () => {
      try {
        const res = await fetch(`/api/transactions/${transactionId}/line-items`, {
          credentials: "include",
          cache: "no-store",
        })
        if (res.ok) {
          const data = await res.json()
          const lineItems: LineItem[] = data.lineItems || []

          // Only update if line items actually changed
          const itemsChanged = 
            !lastLineItemsRef.current ||
            lastLineItemsRef.current.length !== lineItems.length ||
            JSON.stringify(lastLineItemsRef.current) !== JSON.stringify(lineItems)

          if (itemsChanged) {
            lastLineItemsRef.current = lineItems
            callbackRef.current(lineItems)
          }
        }
      } catch (error) {
        console.error("Error fetching line items after socket event:", error)
      }
    }

    socket.on("line_items_changed", onLineItemsChanged)

    // Listen for transaction changes (status, etc.)
    const onTransactionChanged = async () => {
      // Refetch line items when transaction changes
      onLineItemsChanged()
    }

    socket.on("transaction_changed", onTransactionChanged)

    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.off("line_items_changed", onLineItemsChanged)
      socket.off("transaction_changed", onTransactionChanged)
      socket.emit("leave_tx", { transactionId })
      hasInitializedRef.current = false
      // Note: We don't remove from initializedTransactions here as the transaction
      // might still be used by other components
    }
  }, [transactionId, enabled])

  return { isConnected }
}

