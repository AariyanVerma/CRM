import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { PageHeader } from "@/components/page-header"
import { BackButton } from "@/components/back-button"
import { AnalyticsDashboardLazy } from "@/components/analytics-dashboard-lazy"

export default async function AnalyticsDashboardPage() {
  const session = await requireAdmin().catch(() => null)
  if (!session) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title="Analytics Dashboard" />
      <main className="flex-1 min-h-0 overflow-y-auto w-full">
        <div className="w-full max-w-[1600px] mx-auto px-4 py-6 flex flex-col min-h-full gap-6">
          <BackButton href="/dashboard" className="shrink-0 self-start" />
          <div className="flex-1 min-h-0 flex flex-col">
            <AnalyticsDashboardLazy />
          </div>
        </div>
      </main>
    </div>
  )
}
