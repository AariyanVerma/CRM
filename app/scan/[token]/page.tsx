import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ScanPageClient } from "@/components/scan-page-client"
import { ThemeToggle } from "@/components/theme-toggle"
import { LogoutButton } from "@/components/logout-button"

export default async function ScanPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const session = await getSession()
  const { token } = await params
  if (!session) {
    redirect(`/login?redirect=/scan/${token}`)
  }

  // Find card by token
  const card = await prisma.membershipCard.findUnique({
    where: { token },
    include: { customer: true },
  })

  if (!card || card.status !== "ACTIVE") {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Invalid Card</h1>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Card not found or inactive</p>
          </div>
        </main>
      </div>
    )
  }

  // Update last scanned
  await prisma.membershipCard.update({
    where: { id: card.id },
    data: { lastScannedAt: new Date() },
  })

  // Get or create transactions
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayPrice = await prisma.dailyPrice.findFirst({
    where: {
      date: { lte: today },
    },
    orderBy: { date: "desc" },
  })

  if (!todayPrice) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">No Prices Set</h1>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground">
              Please set today&apos;s prices in the admin panel first.
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Get or create SCRAP transaction
  let scrapTransaction = await prisma.transaction.findFirst({
    where: {
      customerId: card.customerId,
      type: "SCRAP",
      status: "OPEN",
    },
    include: { lineItems: true },
  })

  if (!scrapTransaction) {
    scrapTransaction = await prisma.transaction.create({
      data: {
        customerId: card.customerId,
        createdByUserId: session.id,
        type: "SCRAP",
        status: "OPEN",
        goldSpot: todayPrice.gold,
        silverSpot: todayPrice.silver,
        platinumSpot: todayPrice.platinum,
      },
      include: { lineItems: true },
    })
  }

  // Get or create MELT transaction
  let meltTransaction = await prisma.transaction.findFirst({
    where: {
      customerId: card.customerId,
      type: "MELT",
      status: "OPEN",
    },
    include: { lineItems: true },
  })

  if (!meltTransaction) {
    meltTransaction = await prisma.transaction.create({
      data: {
        customerId: card.customerId,
        createdByUserId: session.id,
        type: "MELT",
        status: "OPEN",
        goldSpot: todayPrice.gold,
        silverSpot: todayPrice.silver,
        platinumSpot: todayPrice.platinum,
      },
      include: { lineItems: true },
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Transaction</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <ScanPageClient
          customer={card.customer}
          scrapTransaction={scrapTransaction}
          meltTransaction={meltTransaction}
        />
      </main>
    </div>
  )
}

