"use client"

import React, { useState, useEffect, useRef } from "react"
import { Logo } from "@/components/logo"
import { formatDecimal, getDisplayName, getCustomerDisplayName } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { GOLD_PURITIES, SILVER_PURITIES, PLATINUM_PURITIES } from "@/lib/pricing"
import { ArrowLeft, Home, Printer } from "lucide-react"
import { setSessionActive } from "@/components/session-guard"

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
  scrapGoldPercentage?: number | null
  scrapSilverPercentage?: number | null
  scrapPlatinumPercentage?: number | null
  meltGoldPercentage?: number | null
  meltSilverPercentage?: number | null
  meltPlatinumPercentage?: number | null
  createdAt: Date
  completedAt: Date | null
  customer: Customer
  createdBy: {
    id: string
    email: string
    firstName?: string | null
    lastName?: string | null
  }
  completedBy: {
    id: string
    email: string
    firstName?: string | null
    lastName?: string | null
  } | null
  lineItems: LineItem[]
}

export function PrintView({ transaction, layout = "label", hidePrintButton, showPercentages = true }: { transaction: Transaction; layout?: "label" | "a4"; hidePrintButton?: boolean; showPercentages?: boolean }) {
  const { toast } = useToast()
  const [printing, setPrinting] = useState(false)
  const hasMarkedAsPrinted = useRef(false)
  const hasPushedHistoryRef = useRef(false)
  const isA4 = layout === "a4"

  useEffect(() => {
    setSessionActive()
  }, [])

  useEffect(() => {
    if (!hasPushedHistoryRef.current) {
      window.history.pushState(null, "", window.location.href)
      hasPushedHistoryRef.current = true
    }
    const handlePopState = () => {
      setSessionActive()
      window.location.replace("/dashboard")
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const markAsPrinted = async () => {

    if (hasMarkedAsPrinted.current || (transaction.status !== "OPEN" && transaction.status !== "APPROVED")) {
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

    } catch (error) {

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark transaction as printed",
        variant: "destructive",
      })
      hasMarkedAsPrinted.current = false
    }
  }

  
  
  
  useEffect(() => {
    const handleBeforePrint = async () => {
      await markAsPrinted()
    }
    window.addEventListener("beforeprint", handleBeforePrint)
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint)
    }
  }, [transaction.id, transaction.status])

  const handlePrint = async () => {
    await markAsPrinted()
    await new Promise(resolve => setTimeout(resolve, 100))
    window.print()
  }

  const purityOrder: Record<string, string[]> = {
    GOLD: GOLD_PURITIES,
    SILVER: SILVER_PURITIES,
    PLATINUM: PLATINUM_PURITIES,
  }
  const sortByPurityOrder = (items: LineItem[], metalType: string) => {
    const order = purityOrder[metalType] ?? []
    return [...items].sort((a, b) => {
      const i = order.indexOf(a.purityLabel)
      const j = order.indexOf(b.purityLabel)
      if (i === -1 && j === -1) return 0
      if (i === -1) return 1
      if (j === -1) return -1
      return i - j
    }).reverse()
  }

  const groupedItems: Record<string, LineItem[]> = {
    GOLD: [],
    SILVER: [],
    PLATINUM: [],
  }

  transaction.lineItems.forEach((item) => {
    groupedItems[item.metalType].push(item)
  })

  Object.keys(groupedItems).forEach((metalType) => {
    groupedItems[metalType] = sortByPurityOrder(groupedItems[metalType], metalType)
  })

  const grandTotal = transaction.lineItems.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  )

  const totalDwt = transaction.lineItems.reduce(
    (sum, item) => sum + item.dwt,
    0
  )

  return (
    <div className={`min-h-screen bg-white p-4 print:min-h-0 print:box-border print:p-0 print:m-0 ${isA4 ? "print-a4" : ""}`}>
      <style jsx global>{`
        @media print {
          @page {
            size: ${isA4 ? "A4" : "letter"};
            margin: ${isA4 ? "12mm" : "10mm"};
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            border: none;
            outline: none;
          }
          ::-webkit-scrollbar {
            display: none;
          }
          * {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .no-print,
          .screen-only-no-receipt {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
          }

          .print-root {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            box-sizing: border-box !important;
          }
          .print-content {
            box-sizing: border-box !important;
            page-break-inside: auto;
            break-inside: auto;
            margin-left: auto !important;
            margin-right: auto !important;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            padding: 0.15in 0.12in !important;
            overflow: visible !important;
            width: ${isA4 ? "100%" : "100%"} !important;
            max-width: ${isA4 ? "100%" : "4.25in"} !important;
          }
          .print-a4 .print-content {
            max-width: 100% !important;
            font-size: 1rem;
            padding: 0.2in !important;
          }
          .print-content table {
            width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
          }
          .print-content table th,
          .print-content table td {
            word-wrap: break-word;
            overflow-wrap: break-word;
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
          .print-content {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="print-root w-full max-w-4xl mx-auto">
      <div className={`max-w-4xl mx-auto print:max-w-none print:w-full print-content ${isA4 ? "max-w-2xl text-base" : ""}`}>
        <div className="mb-4 pb-3 border-b-2 border-black">
          <div className="mb-2 flex justify-center">
            <Logo size="lg" showText={false} className="print:max-h-16" />
          </div>
          <h1 className="text-2xl font-bold mb-1 text-black">NEW YORK GOLD MARKET</h1>
          <p className="text-sm font-semibold mb-2 text-black">Precious Metals Transaction</p>
          <div className="text-sm space-y-1 text-black">
            <p>
              <strong>Customer:</strong> {getCustomerDisplayName(transaction.customer)}
            </p>
            <p>
              <strong>Date &amp; Time:</strong> {new Date(transaction.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mb-4 pb-3 border-b border-gray-700">
          <div className="space-y-2">
            <div className="flex flex-wrap justify-between items-start gap-2 gap-y-2">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-black">
                  Type: <span className="text-red-600 font-bold">{transaction.type}</span>
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
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-900">Transaction ID</p>
                <p className="text-sm font-mono text-black">{transaction.id.slice(0, 8)}</p>
              </div>
            </div>
            <div className="text-xs text-gray-900 space-y-1">
              <p>
                <strong>Created By:</strong> {getDisplayName(transaction.createdBy)}
              </p>
              {transaction.completedBy && (
                <p>
                  <strong>Completed By:</strong> {getDisplayName(transaction.completedBy)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4 pb-2 border-b border-gray-700 text-xs text-black">
          <p className="font-semibold mb-1">Price Snapshot:</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Gold: ${formatDecimal(transaction.goldSpot)}</span>
            <span>Silver: ${formatDecimal(transaction.silverSpot)}</span>
            <span>Platinum: ${formatDecimal(transaction.platinumSpot)}</span>
          </div>
        </div>

        {showPercentages && (
          <div className="no-print screen-only-no-receipt mb-4 pb-2 border-b border-gray-700 text-xs text-black">
            <p className="font-semibold mb-1">Metal percentages used for this sale:</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {transaction.type === "SCRAP" ? (
                <>
                  <span>Scrap Gold: {formatDecimal(transaction.scrapGoldPercentage ?? 95)}%</span>
                  <span>Scrap Silver: {formatDecimal(transaction.scrapSilverPercentage ?? 95)}%</span>
                  <span>Scrap Platinum: {formatDecimal(transaction.scrapPlatinumPercentage ?? 95)}%</span>
                </>
              ) : (
                <>
                  <span>Melt Gold: {formatDecimal(transaction.meltGoldPercentage ?? 95)}%</span>
                  <span>Melt Silver: {formatDecimal(transaction.meltSilverPercentage ?? 95)}%</span>
                  <span>Melt Platinum: {formatDecimal(transaction.meltPlatinumPercentage ?? 95)}%</span>
                </>
              )}
            </div>
          </div>
        )}

        <div className="mb-4">
          <table className="w-full text-sm border-collapse text-black">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-1 font-extrabold text-red-600">Metal</th>
                <th className="text-left py-1 font-extrabold text-red-600">Purity</th>
                <th className="text-right py-1 font-extrabold text-red-600">DWT</th>
                <th className="text-right py-1 font-extrabold text-red-600">Price/DWT</th>
                <th className="text-right py-1 font-extrabold text-red-600">Total</th>
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
                        <td className="py-1 font-black text-red-600">{item.purityLabel}</td>
                        <td className="text-right py-1 text-black">{formatDecimal(item.dwt)}</td>
                        <td className="text-right py-1 text-black">${formatDecimal(item.pricePerOz)}</td>
                        <td className="text-right py-1 font-semibold text-black">
                          ${formatDecimal(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-b-2 border-black font-black text-red-600">
                      <td colSpan={2} className="py-1">
                        {metalType} Subtotal
                      </td>
                      <td className="text-right py-1">{formatDecimal(metalDwt)}</td>
                      <td className="text-right py-1">—</td>
                      <td className="text-right py-1">${formatDecimal(metalTotal)}</td>
                    </tr>
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-3 border-t-2 border-black font-black text-red-600">
          <div className="flex flex-wrap justify-between items-end gap-3">
            <div className="min-w-0">
              <p className="text-sm">Total DWT: {formatDecimal(totalDwt)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs">Grand Total</p>
              <p className="text-2xl">${formatDecimal(grandTotal)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-2 border-t border-gray-700 text-xs text-center text-black">
          <p>Thank you for your business</p>
        </div>

        {!hidePrintButton && (
          <div className="no-print mt-8 flex flex-wrap items-center justify-center gap-3 border-t border-border pt-8 pb-6">
            <button
              type="button"
              onClick={() => {
                setSessionActive()
                if (window.history.length > 1) window.history.back()
                else window.location.replace("/dashboard")
              }}
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-5 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <a
              href="/dashboard"
              onClick={(e) => {
                e.preventDefault()
                setSessionActive()
                window.location.replace("/dashboard")
              }}
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-5 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground no-underline text-foreground"
            >
              <Home className="h-4 w-4" />
              Go home
            </a>
            {transaction.status === "PENDING_APPROVAL" ? (
              <p className="text-muted-foreground text-sm text-center max-w-md">
                This transaction is pending approval. Use Review from the customer or approvals page to approve before printing.
              </p>
            ) : (
              <button
                type="button"
                onClick={handlePrint}
                disabled={printing || !["OPEN", "APPROVED", "PRINTED"].includes(transaction.status)}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                {printing ? "Updating…" : "Print"}
              </button>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

