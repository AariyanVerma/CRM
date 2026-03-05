import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { PageHeader } from "@/components/page-header"
import { BackButton } from "@/components/back-button"
import { ReportsLazy } from "@/components/reports-lazy"

export default async function ReportsPage() {
  const session = await requireAdmin().catch(() => null)
  if (!session) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title="Reports" />
      <main className="flex-1 min-h-0 overflow-y-auto w-full">
        <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-8">
          <BackButton href="/dashboard" />
          <ReportsLazy />
        </div>
      </main>
    </div>
  )
}
