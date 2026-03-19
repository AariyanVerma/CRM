import { redirect } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { ScanPageSkeleton } from "@/components/skeletons"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock, AlertCircle } from "lucide-react"

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
  const { token: slugOrToken } = await params
  if (!session) {
    redirect(`/login?redirect=/scan/${slugOrToken}`)
  }

  const rows = await prisma.$queryRaw<[{ id: string }]>`
    SELECT id FROM "MembershipCard"
    WHERE "token" = ${slugOrToken} OR "scanSlug" = ${slugOrToken}
    LIMIT 1
  `
  const card = rows[0]
    ? await prisma.membershipCard.findUnique({
        where: { id: rows[0].id },
        include: { customer: true },
      })
    : null

  if (!card || card.status !== "ACTIVE") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PageHeader title="Invalid Card" />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-2 border-red-500/30 bg-gradient-to-br from-red-500/5 to-red-600/5 shadow-lg">
            <CardContent className="pt-8 pb-8 px-6 sm:px-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 ring-4 ring-red-500/10">
                <AlertCircle className="h-7 w-7 text-red-600 dark:text-red-400" strokeWidth={2} />
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Invalid card
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                This card was not found or it is no longer active. It may have been disabled, marked as lost, or the link is incorrect.
              </p>
              <Link href="/dashboard" className="mt-6 inline-block">
                <Button variant="outline" className="border-red-500/40 hover:bg-red-500 hover:border-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:border-red-500">
                  Back to dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const canUseLockedCard = session.role === "ADMIN" || session.canAccessLockedCards === true
  const isLocked = (card as { locked?: boolean }).locked === true
  if (isLocked && !canUseLockedCard) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PageHeader title="Card Locked" />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 shadow-lg">
            <CardContent className="pt-8 pb-8 px-6 sm:px-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 ring-4 ring-amber-500/10">
                <Lock className="h-7 w-7 text-amber-600 dark:text-amber-400" strokeWidth={2} />
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Card locked
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Only this app and authorized users (administrator or users with access to locked cards) can scan this card to see or use any data. No customer or transaction information is shown or editable here for anyone else—the card cannot be used outside this app to view or change data.
              </p>
              <Link href="/dashboard" className="mt-6 inline-block">
                <Button variant="outline" className="border-amber-500/40 hover:bg-amber-500/10 hover:border-amber-500/60">
                  Back to dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  type CustomerOverrides = {
    scrapGoldPercentageOverride?: number | null
    scrapSilverPercentageOverride?: number | null
    scrapPlatinumPercentageOverride?: number | null
    meltGoldPercentageOverride?: number | null
    meltSilverPercentageOverride?: number | null
    meltPlatinumPercentageOverride?: number | null
  }
  const [_, todayPrice, customerWithOverridesRaw] = await Promise.all([
    prisma.membershipCard.update({
      where: { id: card.id },
      data: { lastScannedAt: new Date() },
    }),
    prisma.dailyPrice.findFirst({
      where: { date: { lte: today } },
      orderBy: { date: "desc" },
    }),
    prisma.customer.findUnique({
      where: { id: card.customer.id },
      select: {
        
        scrapGoldPercentageOverride: true,
        scrapSilverPercentageOverride: true,
        scrapPlatinumPercentageOverride: true,
        meltGoldPercentageOverride: true,
        meltSilverPercentageOverride: true,
        meltPlatinumPercentageOverride: true,
      } as Record<string, boolean>,
    }) as Promise<CustomerOverrides | null>,
  ])
  const customerWithOverrides = customerWithOverridesRaw as CustomerOverrides | null

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

  type DraftTransaction = { id: string | null; type: "SCRAP" | "MELT"; status: string; goldSpot: number; silverSpot: number; platinumSpot: number; lineItems: { id: string; metalType: "GOLD" | "SILVER" | "PLATINUM"; purityLabel: string; dwt: number; pricePerOz: number; lineTotal: number; purityPercentage?: number | null }[] }
  const scrapDraft: DraftTransaction = {
    id: null,
    type: "SCRAP",
    status: "DRAFT",
    goldSpot: todayPrice.gold,
    silverSpot: todayPrice.silver,
    platinumSpot: todayPrice.platinum,
    lineItems: [],
  }
  const meltDraft: DraftTransaction = {
    id: null,
    type: "MELT",
    status: "DRAFT",
    goldSpot: todayPrice.gold,
    silverSpot: todayPrice.silver,
    platinumSpot: todayPrice.platinum,
    lineItems: [],
  }

  return (
    <div className="min-h-screen bg-background" style={{ overflowY: "auto", height: "100vh" }}>
      <PageHeader title="Transaction" />

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8" style={{ touchAction: "pan-y", maxWidth: "100vw", overflowX: "hidden" }}>
        <ScanPageClient
          customer={card.customer}
          scrapTransaction={scrapDraft}
          meltTransaction={meltDraft}
          userRole={session.role}
          userId={session.id}
          cardLocked={isLocked}
          initialPercentages={{
            scrapGold: customerWithOverrides?.scrapGoldPercentageOverride ?? todayPrice.scrapGoldPercentage ?? 95,
            scrapSilver: customerWithOverrides?.scrapSilverPercentageOverride ?? todayPrice.scrapSilverPercentage ?? 95,
            scrapPlatinum: customerWithOverrides?.scrapPlatinumPercentageOverride ?? todayPrice.scrapPlatinumPercentage ?? 95,
            meltGold: customerWithOverrides?.meltGoldPercentageOverride ?? todayPrice.meltGoldPercentage ?? 95,
            meltSilver: customerWithOverrides?.meltSilverPercentageOverride ?? todayPrice.meltSilverPercentage ?? 95,
            meltPlatinum: customerWithOverrides?.meltPlatinumPercentageOverride ?? todayPrice.meltPlatinumPercentage ?? 95,
          }}
        />
      </main>
    </div>
  )
}

