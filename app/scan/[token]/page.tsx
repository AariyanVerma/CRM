import { redirect } from "next/navigation"
import dynamic from "next/dynamic"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { ScanPageSkeleton } from "@/components/skeletons"

const ScanPageClient = dynamic(
  () => import("@/components/scan-page-client").then((m) => ({ default: m.ScanPageClient })),
  { loading: () => <ScanPageSkeleton /> }
)
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
        <PageHeader title="Invalid Card" />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Card not found or inactive</p>
          </div>
        </main>
      </div>
    )
  }

  // Run price lookup and transaction lookups in parallel with card update
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [, todayPrice, scrapTransactionOrNull, meltTransactionOrNull] = await Promise.all([
    prisma.membershipCard.update({
      where: { id: card.id },
      data: { lastScannedAt: new Date() },
    }),
    prisma.dailyPrice.findFirst({
      where: { date: { lte: today } },
      orderBy: { date: "desc" },
    }),
    prisma.transaction.findFirst({
      where: {
        customerId: card.customerId,
        type: "SCRAP",
        status: "OPEN",
      },
      include: { lineItems: true },
    }),
    prisma.transaction.findFirst({
      where: {
        customerId: card.customerId,
        type: "MELT",
        status: "OPEN",
      },
      include: { lineItems: true },
    }),
  ])

  if (!todayPrice) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="No Prices Set" />
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

  // Create SCRAP or MELT only if missing
  let scrapTransaction = scrapTransactionOrNull
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

  let meltTransaction = meltTransactionOrNull
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
    <div className="min-h-screen bg-background" style={{ overflowY: "auto", height: "100vh" }}>
      <PageHeader title="Transaction" />

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8" style={{ touchAction: "pan-y", maxWidth: "100vw", overflowX: "hidden" }}>
        <ScanPageClient
          customer={card.customer}
          scrapTransaction={scrapTransaction}
          meltTransaction={meltTransaction}
          userRole={session.role}
          userId={session.id}
        />
      </main>
    </div>
  )
}

