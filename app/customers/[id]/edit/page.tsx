import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { EditCustomerForm } from "@/components/edit-customer-form"
import { BackButton } from "@/components/back-button"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }
  if (session.role !== "ADMIN") {
    redirect("/customers")
  }

  const { id } = await params
  const customer = await prisma.customer.findUnique({
    where: { id },
  })

  if (!customer) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Edit Customer" />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Customer not found</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Edit Customer" />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <BackButton href={`/customers/${id}`} />
          <EditCustomerForm customer={customer} />
        </div>
      </main>
    </div>
  )
}


