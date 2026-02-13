import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PricesForm } from "@/components/prices-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { LogoutButton } from "@/components/logout-button"
import { BackButton } from "@/components/back-button"

export default async function PricesPage() {
  const session = await requireAdmin().catch(() => null)
  if (!session) {
    redirect("/login")
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayPrice = await prisma.dailyPrice.findUnique({
    where: { date: today },
  })

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Daily Prices</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <BackButton href="/dashboard" />
          <PricesForm initialPrices={todayPrice} />
        </div>
      </main>
    </div>
  )
}

