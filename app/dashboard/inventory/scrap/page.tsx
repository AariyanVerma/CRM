import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { PageHeader } from "@/components/page-header"
import { ScrapInventoryClient } from "@/components/scrap-inventory-client"

export default async function ScrapInventoryPage() {
  const session = await getSession()
  if (!session) redirect("/")

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <main className="container mx-auto px-4 sm:px-6 py-8">
        <PageHeader title="Scrap inventory" />
        <ScrapInventoryClient />
      </main>
    </div>
  )
}

