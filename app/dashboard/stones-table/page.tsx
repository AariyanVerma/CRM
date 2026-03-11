import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { PageHeader } from "@/components/page-header"
import { BackButton } from "@/components/back-button"
import { StonesTableCard } from "@/components/stones-table-card"

export default async function StonesTablePage() {
  const session = await getSession()
  if (!session) redirect("/")
  if (session.role !== "ADMIN") redirect("/dashboard")

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title="Stones Table" />
      <main className="container mx-auto px-2 sm:px-4 py-8 flex-1 w-full min-w-0">
        <BackButton className="mb-6" />
        <StonesTableCard />
      </main>
    </div>
  )
}
