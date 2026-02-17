import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UsersList } from "@/components/users-list"
import { BackButton } from "@/components/back-button"
import { PageHeader } from "@/components/page-header"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function UsersPage() {
  const session = await requireAdmin().catch(() => null)
  if (!session) {
    redirect("/login")
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Manage Users" />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <BackButton href="/dashboard" />
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Staff Users</h2>
              <p className="text-muted-foreground">
                Manage staff and admin accounts
              </p>
            </div>
            <Link href="/admin/users/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New User
              </Button>
            </Link>
          </div>

          <UsersList users={users} />
        </div>
      </main>
    </div>
  )
}

