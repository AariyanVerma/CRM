import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">NFC Membership CRM</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-5xl font-bold tracking-tight">
              Premium Precious Metals
              <br />
              <span className="text-primary">Transaction System</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Streamline your scrap gold, silver, and platinum buying operations
              with NFC-enabled membership cards and real-time transaction management.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>NFC Cards</CardTitle>
                <CardDescription>
                  Issue secure membership cards with token-based authentication
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Each card contains only a secure token, linking to customer records
                  in the database. No PII stored on cards.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dual Transactions</CardTitle>
                <CardDescription>
                  Manage both SCRAP and MELT transactions seamlessly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Switch between transaction types without losing state. Track
                  gold, silver, and platinum with precision pricing.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4x6 Labels</CardTitle>
                <CardDescription>
                  Professional print-ready transaction receipts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Generate clean, formatted 4x6 inch labels for each transaction
                  with all line items and totals.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Link href="/login">
              <Button size="lg" className="text-lg px-8">
                Staff Login
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 NFC Membership CRM. Premium transaction management system.</p>
        </div>
      </footer>
    </div>
  )
}

