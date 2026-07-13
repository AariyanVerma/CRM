import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { PageHeader } from "@/components/page-header"
import { BackButton } from "@/components/back-button"
import { PriceHistoryClient } from "@/components/price-history-client"

export default async function PriceHistoryPage() {
  const session = await requireAdmin().catch(() => null)
  if (!session) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title="Price History" />
      <main className="flex-1 min-h-0 overflow-y-auto w-full">
        <div className="w-full max-w-[1200px] mx-auto px-4 py-6 space-y-6">
          <BackButton href="/dashboard" />
          <PriceHistoryClient />
        </div>
      </main>
    </div>
  )
}
