import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PrintView } from "@/components/print-view"

export default async function BatchPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>
}) {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const { ids: idsParam } = await searchParams
  const ids = idsParam ? idsParam.split(",").map((s) => s.trim()).filter(Boolean) : []

  if (ids.length === 0) {
    return (
      <div className="min-h-screen bg-background p-8">
        <p className="text-muted-foreground">No transaction IDs provided. Use ?ids=id1,id2,id3</p>
      </div>
    )
  }

  const transactions = await prisma.transaction.findMany({
    where: { id: { in: ids } },
    include: {
      customer: true,
      createdBy: { select: { id: true, email: true } },
      completedBy: { select: { id: true, email: true } },
      lineItems: { orderBy: [{ metalType: "asc" }, { purityLabel: "asc" }] },
    },
    orderBy: { createdAt: "asc" },
  })

  if (transactions.length === 0) {
    return (
      <div className="min-h-screen bg-background p-8">
        <p className="text-muted-foreground">No transactions found for the given IDs.</p>
      </div>
    )
  }

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
