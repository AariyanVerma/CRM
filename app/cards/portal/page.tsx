import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { BackButton } from "@/components/back-button"
import { CardPortalClient } from "@/components/card-portal-client"

export default async function CardPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>
}) {
  const session = await getSession()
  if (!session) {
    redirect("/")
  }
  const canAccess = session.role === "ADMIN" || session.canIssueCard === true
  if (!canAccess) {
    redirect("/dashboard")
  }

  const params = await searchParams
  const customerId = params.customerId
  const initialCustomer =
    customerId ?
      await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true, fullName: true, isBusiness: true, businessName: true },
      })
    : null

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Card Portal" />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <BackButton href="/dashboard" />
        <CardPortalClient
          isAdmin={session.role === "ADMIN"}
          initialCustomer={initialCustomer}
        />
      </main>
    </div>
  )
}
