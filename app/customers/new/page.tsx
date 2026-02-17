import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { NewCustomerForm } from "@/components/new-customer-form"
import { BackButton } from "@/components/back-button"
import { PageHeader } from "@/components/page-header"

export default async function NewCustomerPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="New Customer" />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <BackButton href="/customers" />
          <NewCustomerForm />
        </div>
      </main>
    </div>
  )
}

