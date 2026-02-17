import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Users, CreditCard, DollarSign, TrendingUp } from "lucide-react"
import { BackButton } from "@/components/back-button"
import { PageHeader } from "@/components/page-header"
import { UserMenu } from "@/components/user-menu"
import { MetalPricesCarousel } from "@/components/metal-prices-carousel"

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const [customerCount, cardCount, openTransactions, todayPrices] = await Promise.all([
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
  ])

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Dashboard" 
        rightContent={
          <>
            <span className="hidden sm:inline text-sm text-muted-foreground">{session.email}</span>
            <UserMenu email={session.email} role={session.role} />
          </>
        }
      />

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8" style={{ maxWidth: "100vw", overflowX: "hidden" }}>
        <div className="space-y-6">
          <BackButton href="/" label="Home" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
            <p className="text-muted-foreground">
              Welcome back, {session.email}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customerCount}</div>
                <p className="text-xs text-muted-foreground">
                  Total registered customers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Cards</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cardCount}</div>
                <p className="text-xs text-muted-foreground">
                  NFC cards issued
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Transactions</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{openTransactions}</div>
                <p className="text-xs text-muted-foreground">
                  Transactions in progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Metal Prices</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-2">
                <MetalPricesCarousel
                  gold={todayPrices?.gold ?? null}
                  silver={todayPrices?.silver ?? null}
                  platinum={todayPrices?.platinum ?? null}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Customers</CardTitle>
                <CardDescription>
                  Manage customer records and issue NFC cards
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/customers" className="block">
                  <Button className="w-full">View All Customers</Button>
                </Link>
                <Link href="/customers/new" className="block">
                  <Button variant="outline" className="w-full">New Customer</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scan Card</CardTitle>
                <CardDescription>
                  Start a transaction by scanning an NFC card
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/scan" className="block">
                  <Button className="w-full">Scan Entry</Button>
                </Link>
              </CardContent>
            </Card>

            {session.role === 'ADMIN' && (
              <Card>
                <CardHeader>
                  <CardTitle>Admin</CardTitle>
                  <CardDescription>
                    Manage prices and system settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link href="/admin/prices" className="block">
                    <Button className="w-full">Daily Prices</Button>
                  </Link>
                  <Link href="/admin/users" className="block">
                    <Button variant="outline" className="w-full">Manage Users</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

