import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getPreviousDailyPrice, getTodayDateBound } from "@/lib/daily-prices"
import { PricesForm } from "@/components/prices-form"
import { BackButton } from "@/components/back-button"
import { PageHeader } from "@/components/page-header"

export default async function PricesPage() {
  const session = await requireAdmin().catch(() => null)
  if (!session) {
    redirect("/")
  }

  const today = getTodayDateBound()

  const todayPrice = await prisma.dailyPrice.findUnique({
    where: { date: today },
  })
  // When today has no row yet, show last saved day so % and spots don't look "reset" to 95/0.
  const initialPrices = todayPrice ?? (await getPreviousDailyPrice(today))

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Daily Prices" />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <BackButton href="/dashboard" />
          <PricesForm initialPrices={initialPrices} />
        </div>
      </main>
    </div>
  )
}

