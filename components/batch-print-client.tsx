"use client"

import { PrintView } from "@/components/print-view"
import { setSessionActive } from "@/components/session-guard"
import { ArrowLeft, Home, Printer } from "lucide-react"

type Transaction = React.ComponentProps<typeof PrintView>["transaction"]

export function BatchPrintClient({ transactions, showPercentages = true }: { transactions: Transaction[]; showPercentages?: boolean }) {
  return (
    <div className="batch-print min-h-screen bg-background">
      <style jsx global>{`
        @media print {
          .batch-print {
            background: white !important;
            overflow: visible !important;
            min-height: 0 !important;
          }
          .batch-print-receipts {
            overflow: visible !important;
          }
          .print-label-wrapper {
            overflow: visible !important;
          }
          .batch-print-receipts > .print-label-wrapper:not(:last-child) {
            page-break-after: always;
          }
        }
      `}</style>
      <div className="batch-print-receipts">
        {transactions.map((tx) => (
          <div key={tx.id} className="print-label-wrapper">
            <PrintView transaction={tx} hidePrintButton showPercentages={showPercentages} />
          </div>
        ))}
      </div>
      <div className="no-print mx-auto max-w-4xl border-t border-border bg-background px-4 py-8">
        <div className="flex flex-wrap items-center justify-center gap-3">
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
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Printer className="h-4 w-4" />
            Print all
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {transactions.length} receipt{transactions.length === 1 ? "" : "s"} — one label per page when printing
        </p>
      </div>
    </div>
  )
}
