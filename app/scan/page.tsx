import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { ManualScanForm } from "@/components/manual-scan-form"
import { NFCScanCard } from "@/components/nfc-scan-card"
import { ThemeToggle } from "@/components/theme-toggle"
import { LogoutButton } from "@/components/logout-button"
import { BackButton } from "@/components/back-button"

export default async function ManualScanPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Scan Card</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

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

