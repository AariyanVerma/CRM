import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PricesForm } from "@/components/prices-form"
import { BackButton } from "@/components/back-button"
import { PageHeader } from "@/components/page-header"

export default async function PricesPage() {
  const session = await requireAdmin().catch(() => null)
  if (!session) {
    redirect("/")
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayPrice = await prisma.dailyPrice.findUnique({
    where: { date: today },
  })

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Daily Prices" />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <BackButton href="/dashboard" />
          <PricesForm initialPrices={todayPrice} />
        </div>
      </main>
    </div>
  )
}

