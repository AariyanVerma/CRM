import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { PageHeader } from "@/components/page-header"
import { WalkInForm } from "@/components/walk-in-form"
import { BackButton } from "@/components/back-button"

export default async function WalkInPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login?redirect=/walk-in")
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Walk-in Transaction" />

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <div className="space-y-6">
          <BackButton href="/dashboard" />
          <WalkInForm />
        </div>
      </main>
    </div>
  )
}
