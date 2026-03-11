import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { PageHeader } from "@/components/page-header"
import { BackButton } from "@/components/back-button"
import { ApprovalsClient } from "@/components/approvals-client"

export default async function ApprovalsPage() {
  const session = await getSession()
  if (!session) redirect("/")
  if (session.role !== "ADMIN") redirect("/dashboard")

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title="Pending Approvals" />
      <main className="container mx-auto px-4 py-8 flex-1">
        <BackButton className="mb-6" />
        <ApprovalsClient adminId={session.id} />
      </main>
    </div>
  )
}
