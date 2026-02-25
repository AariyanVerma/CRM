"use client"

import { PrintView } from "@/components/print-view"

type Transaction = React.ComponentProps<typeof PrintView>["transaction"]

export function BatchPrintClient({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="batch-print">
      <style jsx global>{`
        @media print {
          .batch-print > .print-label-wrapper {
            page-break-after: always;
          }
          .batch-print > .print-label-wrapper:last-child {
            page-break-after: auto;
          }
        }
      `}</style>
      <div className="no-print p-4 text-center bg-muted/50 sticky top-0 z-10">
        <p className="text-sm text-muted-foreground mb-2">{transactions.length} label(s). Use Ctrl+P (or Cmd+P) to print all.</p>
      </div>
      {transactions.map((tx) => (
        <div key={tx.id} className="print-label-wrapper">
          <PrintView transaction={tx} hidePrintButton />
        </div>
      ))}
    </div>
  )
}
