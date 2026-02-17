import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { ManualScanForm } from "@/components/manual-scan-form"
import { NFCScanCard } from "@/components/nfc-scan-card"
import { BackButton } from "@/components/back-button"
import { PageHeader } from "@/components/page-header"

export default async function ManualScanPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Scan Card" />

      <main className="container mx-auto px-4 py-8 max-w-md">
        <div className="space-y-6">
          <BackButton href="/dashboard" />
          <NFCScanCard />
          <div className="text-center">
            <p className="text-sm text-muted-foreground">OR</p>
          </div>
          <ManualScanForm />
        </div>
      </main>
    </div>
  )
}

