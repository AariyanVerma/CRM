"use client"

import React, { useEffect } from "react"

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
  customer: Customer
  lineItems: LineItem[]
}

export function PrintView({ transaction }: { transaction: Transaction }) {
  useEffect(() => {
    // Auto-print when component mounts
    window.print()
  }, [])

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
            size: 4in 6in;
            margin: 0.25in;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none;
          }
        }
      `}</style>

      <div className="max-w-full mx-auto print:max-w-none">
        {/* Header */}
        <div className="mb-4 pb-3 border-b-2 border-black">
          <h1 className="text-2xl font-bold mb-1">PRECIOUS METALS TRANSACTION</h1>
          <div className="text-sm space-y-1">
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
        <div className="mb-4 pb-3 border-b border-gray-400">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-lg font-bold">
                Type: {transaction.type}
              </p>
              <p className="text-xs text-gray-600">
                Date: {new Date(transaction.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">Transaction ID</p>
              <p className="text-sm font-mono">{transaction.id.slice(0, 8)}</p>
            </div>
          </div>
        </div>

        {/* Price Snapshot */}
        <div className="mb-4 pb-2 border-b border-gray-300 text-xs">
          <p className="font-semibold mb-1">Price Snapshot:</p>
          <div className="flex gap-4">
            <span>Gold: ${transaction.goldSpot.toFixed(2)}</span>
            <span>Silver: ${transaction.silverSpot.toFixed(2)}</span>
            <span>Platinum: ${transaction.platinumSpot.toFixed(2)}</span>
          </div>
        </div>

        {/* Line Items */}
        <div className="mb-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-1">Metal</th>
                <th className="text-left py-1">Purity</th>
                <th className="text-right py-1">DWT</th>
                <th className="text-right py-1">Price/oz</th>
                <th className="text-right py-1">Total</th>
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
                      <tr key={item.id} className="border-b border-gray-300">
                        <td className="py-1">{metalType}</td>
                        <td className="py-1">{item.purityLabel}</td>
                        <td className="text-right py-1">{item.dwt.toFixed(2)}</td>
                        <td className="text-right py-1">${item.pricePerOz.toFixed(2)}</td>
                        <td className="text-right py-1 font-semibold">
                          ${item.lineTotal.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-b-2 border-black font-semibold">
                      <td colSpan={2} className="py-1">
                        {metalType} Subtotal
                      </td>
                      <td className="text-right py-1">{metalDwt.toFixed(2)}</td>
                      <td className="text-right py-1">—</td>
                      <td className="text-right py-1">${metalTotal.toFixed(2)}</td>
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
              <p className="text-sm font-semibold">Total DWT: {totalDwt.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">Grand Total</p>
              <p className="text-2xl font-bold">${grandTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-2 border-t border-gray-300 text-xs text-center text-gray-600">
          <p>Thank you for your business</p>
        </div>
      </div>

      {/* Print Button (hidden when printing) */}
      <div className="no-print mt-8 text-center">
        <button
          onClick={() => window.print()}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90"
        >
          Print
        </button>
      </div>
    </div>
  )
}

