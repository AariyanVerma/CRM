import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Plus, Search } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LogoutButton } from "@/components/logout-button"
import { CustomersList } from "@/components/customers-list"
import { BackButton } from "@/components/back-button"

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const searchQuery = searchParams.q || ""

  const customers = await prisma.customer.findMany({
    where: searchQuery
      ? {
          OR: [
            { fullName: { contains: searchQuery, mode: "insensitive" } },
            { phoneNumber: { contains: searchQuery, mode: "insensitive" } },
            { businessName: { contains: searchQuery, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      cards: {
        where: { status: "ACTIVE" },
        take: 1,
      },
      _count: {
        select: { transactions: true },
      },
    },
  })

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Customers</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <BackButton href="/dashboard" />
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">All Customers</h2>
              <p className="text-muted-foreground">
                Manage customer records and issue NFC cards
              </p>
            </div>
            <Link href="/customers/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Customer
              </Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Search</CardTitle>
              <CardDescription>Find customers by name, phone, or business name</CardDescription>
            </CardHeader>
            <CardContent>
              <form method="get" className="flex gap-2">
                <Input
                  name="q"
                  placeholder="Search customers..."
                  defaultValue={searchQuery}
                  className="flex-1"
                />
                <Button type="submit">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          <CustomersList customers={customers} />
        </div>
      </main>
    </div>
  )
}

