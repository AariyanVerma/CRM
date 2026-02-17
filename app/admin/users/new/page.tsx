import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { NewUserForm } from "@/components/new-user-form"
import { BackButton } from "@/components/back-button"
import { PageHeader } from "@/components/page-header"

export default async function NewUserPage() {
  const session = await requireAdmin().catch(() => null)
  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="New User" />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <BackButton href="/admin/users" />
          <NewUserForm />
        </div>
      </main>
    </div>
  )
}

