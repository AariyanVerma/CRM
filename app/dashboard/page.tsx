import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { DashboardStats } from "@/components/dashboard-stats"
import { DashboardActions } from "@/components/dashboard-actions"

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)

  const [customerCount, cardCount, openTransactions, todayPrices, todayStats] = await Promise.all([
    prisma.customer.count(),
    prisma.membershipCard.count({ where: { status: 'ACTIVE' } }),
    prisma.transaction.count({ where: { status: 'OPEN' } }),
    prisma.dailyPrice.findFirst({
      where: {
        date: {
          lte: new Date(),
        },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.transaction.findMany({
      where: { createdAt: { gte: todayStart, lt: todayEnd } },
      include: { lineItems: { select: { lineTotal: true } } },
    }),
  ])

  const todayTransactionCount = todayStats.length
  const todayTotalValue = todayStats.reduce((s, t) => s + t.lineItems.reduce((a, i) => a + i.lineTotal, 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <PageHeader title="Dashboard" />

      <main className="container mx-auto px-4 sm:px-6 py-8 relative z-10" style={{ maxWidth: "100vw", overflowX: "hidden" }}>
        <div className="space-y-10">
          {/* Header with animation */}
          <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-700">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
              Welcome back!
            </h1>
            <p className="text-lg text-muted-foreground font-medium">
              {session.email}
            </p>
          </div>

          {/* Stats Grid */}
          <DashboardStats
            customerCount={customerCount}
            cardCount={cardCount}
            openTransactions={openTransactions}
            gold={todayPrices?.gold ?? null}
            silver={todayPrices?.silver ?? null}
            platinum={todayPrices?.platinum ?? null}
            todayTransactionCount={todayTransactionCount}
            todayTotalValue={todayTotalValue}
            isAdmin={session.role === "ADMIN"}
          />

          {/* Quick Actions */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight animate-in fade-in slide-in-from-left-4 duration-700" style={{ animationDelay: '300ms' }}>
              Quick Actions
            </h2>
            <DashboardActions isAdmin={session.role === 'ADMIN'} />
          </div>
        </div>
      </main>
    </div>
  )
}

