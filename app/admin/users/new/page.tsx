import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { NewUserForm } from "@/components/new-user-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { LogoutButton } from "@/components/logout-button"
import { BackButton } from "@/components/back-button"

export default async function NewUserPage() {
  const session = await requireAdmin().catch(() => null)
  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">New User</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <BackButton href="/admin/users" />
          <NewUserForm />
        </div>
      </main>
    </div>
  )
}

