"use client"

import React, { useState, useEffect, useRef } from "react"
import { Logo } from "@/components/logo"
import { formatDecimal } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface Customer {
  id: string
  fullName: string
  phoneNumber: string
  address: string
  isBusiness: boolean
  businessName: string | null
}

interface LineItem {
  id: string
  metalType: "GOLD" | "SILVER" | "PLATINUM"
  purityLabel: string
  dwt: number
  pricePerOz: number
  lineTotal: number
}

interface Transaction {
  id: string
  type: "SCRAP" | "MELT"
  status: string
  goldSpot: number
  silverSpot: number
  platinumSpot: number
  createdAt: Date
  completedAt: Date | null
  customer: Customer
  createdBy: {
    id: string
    email: string
  }
  completedBy: {
    id: string
    email: string
  } | null
  lineItems: LineItem[]
}

export function PrintView({ transaction }: { transaction: Transaction }) {
  const { toast } = useToast()
  const [printing, setPrinting] = useState(false)
  const hasMarkedAsPrinted = useRef(false)

  // Function to mark transaction as printed (silently, no toast)
  const markAsPrinted = async () => {
    // Only mark once and if status is still OPEN
    if (hasMarkedAsPrinted.current || transaction.status !== "OPEN") {
      return
    }

    hasMarkedAsPrinted.current = true
    try {
      const res = await fetch(`/api/transactions/${transaction.id}/print`, {
        method: "POST",
        credentials: "include",
      })

      if (!res.ok) {
        throw new Error("Failed to mark transaction as printed")
      }

      // Silently update status - no toast notification
    } catch (error) {
      // Only show error toast, not success
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark transaction as printed",
        variant: "destructive",
      })
      hasMarkedAsPrinted.current = false // Reset on error so user can try again
    }
  }

  // Listen for browser print events (Ctrl+P, Cmd+P, or browser print menu)
  useEffect(() => {
    const handleBeforePrint = async () => {
      // Silently mark as printed when print dialog opens
      await markAsPrinted()
    }

    window.addEventListener("beforeprint", handleBeforePrint)
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint)
    }
  }, [transaction.id, transaction.status])

  // Handle print button click - mark as printed first, then print
  const handlePrint = async () => {
    // Mark as printed silently (no toast)
    await markAsPrinted()
    // Small delay to ensure API call completes
    await new Promise(resolve => setTimeout(resolve, 100))
    // Open browser print dialog
    window.print()
  }

  // Group line items by metal type
  const groupedItems: Record<string, LineItem[]> = {
    GOLD: [],
    SILVER: [],
    PLATINUM: [],
  }

  transaction.lineItems.forEach((item) => {
    groupedItems[item.metalType].push(item)
  })

  // Calculate totals
  const grandTotal = transaction.lineItems.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  )

  const totalDwt = transaction.lineItems.reduce(
    (sum, item) => sum + item.dwt,
    0
  )

  return (
    <div className="min-h-screen bg-white p-4 print:p-2">
      <style jsx global>{`
        @media print {
          @page {
            size: 4in auto;
            margin: 0.2in;
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: white;
            width: 100%;
            height: auto;
            min-height: 100%;
          }
          body {
            page-break-inside: avoid;
          }
          ::-webkit-scrollbar {
            display: none;
          }
          * {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .no-print {
            display: none !important;
          }
          /* Prevent page breaks within transaction content */
          .print-content {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
        @media screen {
          body {
            background: #f5f5f5;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto print:max-w-none print:w-full print-content" style={{ width: 'auto', maxWidth: '100%' }}>
        {/* Header */}
        <div className="mb-4 pb-3 border-b-2 border-black">
          <div className="mb-2 flex justify-center">
            <Logo size="lg" showText={false} className="print:max-h-16" />
          </div>
          <h1 className="text-2xl font-bold mb-1 text-black">NEW YORK GOLD MARKET</h1>
          <p className="text-sm font-semibold mb-2 text-black">Precious Metals Transaction</p>
          <div className="text-sm space-y-1 text-black">
            <p>
              <strong>Customer:</strong> {transaction.customer.fullName}
            </p>
            {transaction.customer.businessName && (
              <p>
                <strong>Business:</strong> {transaction.customer.businessName}
              </p>
            )}
            <p>
              <strong>Phone:</strong> {transaction.customer.phoneNumber}
            </p>
            <p>
              <strong>Address:</strong> {transaction.customer.address}
            </p>
          </div>
        </div>

        {/* Transaction Info */}
        <div className="mb-4 pb-3 border-b border-gray-700">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-bold text-black">
                  Type: {transaction.type}
                </p>
                <p className="text-xs text-gray-900">
                  Created: {new Date(transaction.createdAt).toLocaleString()}
                </p>
                {transaction.completedAt && (
                  <p className="text-xs text-gray-900">
                    Completed: {new Date(transaction.completedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-900">Transaction ID</p>
                <p className="text-sm font-mono text-black">{transaction.id.slice(0, 8)}</p>
              </div>
            </div>
            <div className="text-xs text-gray-900 space-y-1">
              <p>
                <strong>Created By:</strong> {transaction.createdBy.email}
              </p>
              {transaction.completedBy && (
                <p>
                  <strong>Completed By:</strong> {transaction.completedBy.email}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Price Snapshot */}
        <div className="mb-4 pb-2 border-b border-gray-700 text-xs text-black">
          <p className="font-semibold mb-1">Price Snapshot:</p>
          <div className="flex gap-4">
            <span>Gold: ${formatDecimal(transaction.goldSpot)}</span>
            <span>Silver: ${formatDecimal(transaction.silverSpot)}</span>
            <span>Platinum: ${formatDecimal(transaction.platinumSpot)}</span>
          </div>
        </div>

        {/* Line Items */}
        <div className="mb-4">
          <table className="w-full text-sm border-collapse text-black">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-1 text-black">Metal</th>
                <th className="text-left py-1 text-black">Purity</th>
                <th className="text-right py-1 text-black">DWT</th>
                <th className="text-right py-1 text-black">Price/DWT</th>
                <th className="text-right py-1 text-black">Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedItems).map(([metalType, items]) => {
                if (items.length === 0) return null

                const metalTotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
                const metalDwt = items.reduce((sum, item) => sum + item.dwt, 0)

                return (
                  <React.Fragment key={metalType}>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-gray-700">
                        <td className="py-1 text-black">{metalType}</td>
                        <td className="py-1 text-black">{item.purityLabel}</td>
                        <td className="text-right py-1 text-black">{formatDecimal(item.dwt)}</td>
                        <td className="text-right py-1 text-black">${formatDecimal(item.pricePerOz)}</td>
                        <td className="text-right py-1 font-semibold text-black">
                          ${formatDecimal(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-b-2 border-black font-semibold">
                      <td colSpan={2} className="py-1 text-black">
                        {metalType} Subtotal
                      </td>
                      <td className="text-right py-1 text-black">{formatDecimal(metalDwt)}</td>
                      <td className="text-right py-1 text-black">—</td>
                      <td className="text-right py-1 text-black">${formatDecimal(metalTotal)}</td>
                    </tr>
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Grand Total */}
        <div className="mt-4 pt-3 border-t-2 border-black">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-black">Total DWT: {formatDecimal(totalDwt)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-black">Grand Total</p>
              <p className="text-2xl font-bold text-black">${formatDecimal(grandTotal)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-2 border-t border-gray-700 text-xs text-center text-black">
          <p>Thank you for your business</p>
        </div>
      </div>

      {/* Print Button (hidden when printing) */}
      <div className="no-print mt-8 text-center">
        <button
          onClick={handlePrint}
          disabled={printing}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {printing ? "Updating..." : "Print"}
        </button>
      </div>
    </div>
  )
}

