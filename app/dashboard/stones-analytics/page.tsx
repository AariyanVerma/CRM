import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { PageHeader } from "@/components/page-header"
import { BackButton } from "@/components/back-button"
import { StonesAnalyticsClient } from "@/components/stones-analytics-client"

export default async function StonesAnalyticsPage() {
  const session = await getSession()
  if (!session) redirect("/")
  if (session.role !== "ADMIN") redirect("/dashboard")

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title="Stones Analytics & Reports" />
      <main className="container mx-auto px-4 py-8 flex-1">
        <BackButton className="mb-6" />
        <StonesAnalyticsClient />
      </main>
    </div>
  )
}
