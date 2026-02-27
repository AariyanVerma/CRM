import { redirect } from "next/navigation"
import dynamic from "next/dynamic"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PrintViewSkeleton } from "@/components/skeletons"

const PrintView = dynamic(
  () => import("@/components/print-view").then((m) => ({ default: m.PrintView })),
  { loading: () => <PrintViewSkeleton /> }
)

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ layout?: string }>
}) {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const { id } = await params
  const { layout } = await searchParams
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      completedBy: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      lineItems: {
        orderBy: [
          { metalType: "asc" },
          { purityLabel: "asc" },
        ],
      },
    },
  })

  if (!transaction) {
    return (
      <div className="min-h-screen bg-background p-8">
        <p>Transaction not found</p>
      </div>
    )
  }

  return <PrintView transaction={transaction} layout={layout === "a4" ? "a4" : "label"} />
}

