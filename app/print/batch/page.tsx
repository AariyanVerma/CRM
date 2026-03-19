import { redirect } from "next/navigation"
import dynamic from "next/dynamic"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PrintViewSkeleton } from "@/components/skeletons"

const BatchPrintClient = dynamic(
  () => import("@/components/batch-print-client").then((m) => ({ default: m.BatchPrintClient })),
  { loading: () => <PrintViewSkeleton /> }
)

export default async function BatchPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>
}) {
  const session = await getSession()
  if (!session) {
    redirect("/")
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
      createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      completedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
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

  return <BatchPrintClient transactions={transactions} showPercentages={session.role === "ADMIN"} />
}
