import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Building2, User, Edit } from "lucide-react"

interface Customer {
  id: string
  fullName: string
  phoneNumber: string
  address: string
  isBusiness: boolean
  businessName: string | null
  identityVerified: boolean
  cards: Array<{ id: string; status: string }>
  _count: { transactions: number }
}

interface CustomersListProps {
  customers: Customer[]
  userRole?: "ADMIN" | "STAFF"
}

export function CustomersList({ customers, userRole }: CustomersListProps) {
  if (customers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No customers found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {customers.map((customer) => (
        <Card key={customer.id}>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{customer.fullName}</h3>
                  <p className="text-sm text-muted-foreground">{customer.phoneNumber}</p>
                </div>
                {customer.isBusiness ? (
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              {customer.businessName && (
                <p className="text-sm font-medium">{customer.businessName}</p>
              )}

              <p className="text-sm text-muted-foreground line-clamp-2">
                {customer.address}
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                {customer.identityVerified && (
                  <Badge variant="default">Verified</Badge>
                )}
                {customer.cards.length > 0 && (
                  <Badge variant="secondary">
                    <CreditCard className="mr-1 h-3 w-3" />
                    Card Active
                  </Badge>
                )}
                <Badge variant="outline">
                  {customer._count.transactions} transactions
                </Badge>
              </div>

              <div className="flex gap-2">
                <Link href={`/customers/${customer.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </Link>
                {userRole === "ADMIN" && (
                  <Link href={`/customers/${customer.id}/edit`}>
                    <Button variant="outline" size="icon" title="Edit Customer">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

