import { redirect } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { loadTransactionPageData } from "@/lib/transaction-page-data"
import { PageHeader } from "@/components/page-header"
import { ScanPageSkeleton } from "@/components/skeletons"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock, AlertCircle } from "lucide-react"

const ScanPageClient = dynamic(
  () => import("@/components/scan-page-client").then((m) => ({ default: m.ScanPageClient })),
  { loading: () => <ScanPageSkeleton /> }
)

export default async function WalkInTransactionPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const session = await getSession()
  const { customerId } = await params
  if (!session) {
    redirect(`/login?redirect=/transaction/${customerId}`)
  }

  const pageData = await loadTransactionPageData(customerId)

  if ("error" in pageData) {
    if (pageData.error === "not_found") {
      return (
        <div className="min-h-screen bg-background flex flex-col">
          <PageHeader title="Customer Not Found" />
          <main className="flex-1 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardContent className="pt-8 pb-8 px-6 text-center">
                <p className="text-muted-foreground">This customer record could not be found.</p>
                <Link href="/walk-in" className="mt-6 inline-block">
                  <Button variant="outline">Back to walk-in</Button>
                </Link>
              </CardContent>
            </Card>
          </main>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="No Prices Set" />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground">
              Please set today&apos;s prices in the admin panel first.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background" style={{ overflowY: "auto", height: "100vh" }}>
      <PageHeader title="Walk-in Transaction" />

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8" style={{ touchAction: "pan-y", maxWidth: "100vw", overflowX: "hidden" }}>
        <ScanPageClient
          customer={pageData.customer}
          scrapTransaction={pageData.scrapDraft}
          saleTransaction={pageData.saleDraft}
          meltTransaction={pageData.meltDraft}
          userRole={session.role}
          userId={session.id}
          cardLocked={false}
          initialPercentages={pageData.initialPercentages}
          initialSalePremium={pageData.initialSalePremium}
          walkInMode
        />
      </main>
    </div>
  )
}
