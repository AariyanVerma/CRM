import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { PageHeader } from "@/components/page-header"
import { BackButton } from "@/components/back-button"
import { TransactionsListClient } from "@/components/transactions-list-client"

export default async function AdminTransactionsPage() {
  const session = await requireAdmin().catch(() => null)
  if (!session) {
    redirect("/login")
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
