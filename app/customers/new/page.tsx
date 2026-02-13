import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { NewCustomerForm } from "@/components/new-customer-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { LogoutButton } from "@/components/logout-button"
import { BackButton } from "@/components/back-button"

export default async function NewCustomerPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">New Customer</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <BackButton href="/customers" />
          <NewCustomerForm />
        </div>
      </main>
    </div>
  )
}

