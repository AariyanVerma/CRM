import { redirect } from "next/navigation"
import dynamic from "next/dynamic"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Building2, User, CheckCircle2, XCircle, Edit } from "lucide-react"
import { CustomerCardsCard } from "@/components/customer-cards-card"
import { Badge } from "@/components/ui/badge"
import { TransactionsListSkeleton } from "@/components/skeletons"
import { CustomerDocumentsPortal } from "@/components/customer-documents-portal"

const TransactionsListClient = dynamic(
  () => import("@/components/transactions-list-client").then((m) => ({ default: m.TransactionsListClient })),
  { loading: () => <TransactionsListSkeleton /> }
)
import { BackButton } from "@/components/back-button"
import { PageHeader } from "@/components/page-header"

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) {
    redirect("/")
  }

  const { id } = await params
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      cards: {
        orderBy: { issuedAt: "desc" },
      },
    },
  })

  if (!customer) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Customer not found</p>
              <Link href="/customers">
                <Button variant="outline" className="mt-4">
                  Back to Customers
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
        <PageHeader title="Customer Details" />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <BackButton href="/customers" />
            {session.role === "ADMIN" && (
              <Link href={`/customers/${customer.id}/edit`}>
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Customer
                </Button>
              </Link>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  {customer.isBusiness ? (
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                  <h2 className="text-2xl font-bold">{customer.fullName}</h2>
                </div>

                {customer.businessName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Business Name</p>
                    <p className="font-medium">{customer.businessName}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{customer.phoneNumber}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{customer.address}</p>
                </div>

                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Identity Verified:</p>
                  {customer.identityVerified ? (
                    <Badge className="bg-green-600 hover:bg-green-600/90 text-white border-0">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge className="bg-red-600 hover:bg-red-600/90 text-white border-0">
                      <XCircle className="mr-1 h-3 w-3" />
                      Not Verified
                    </Badge>
                  )}
                </div>

                {customer.identityVerificationNotes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Verification Notes</p>
                    <p className="text-sm">{customer.identityVerificationNotes}</p>
                  </div>
                )}

                {customer.businessVerificationNotes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Business Verification Notes</p>
                    <p className="text-sm">{customer.businessVerificationNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <CustomerCardsCard
              customerId={customer.id}
              cards={customer.cards}
              canIssueCard={session.canIssueCard === true}
              isAdmin={session.role === "ADMIN"}
            />
          </div>

          <CustomerDocumentsPortal customerId={customer.id} canManage={session.role === "ADMIN"} />

          <TransactionsListClient customerId={customer.id} showCustomerColumn={false} userRole={session.role} />
        </div>
      </main>
    </div>
  )
}

