import { redirect } from "next/navigation"
import dynamic from "next/dynamic"
import { requireAdmin } from "@/lib/auth"
import { PageHeader } from "@/components/page-header"
import { BackButton } from "@/components/back-button"
import { TransactionsListSkeleton } from "@/components/skeletons"

const TransactionsListClient = dynamic(
  () => import("@/components/transactions-list-client").then((m) => ({ default: m.TransactionsListClient })),
  { loading: () => <TransactionsListSkeleton /> }
)

export default async function AdminTransactionsPage() {
  const session = await requireAdmin().catch(() => null)
  if (!session) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="All Transactions" />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <BackButton href="/dashboard" />
          <TransactionsListClient customerId={null} showCustomerColumn />
        </div>
      </main>
    </div>
  )
}
