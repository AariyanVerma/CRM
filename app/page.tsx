import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Logo } from "@/components/logo"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-2 sm:px-4 py-1.5 sm:py-2 flex justify-between items-center">
          <Logo size="xl" showText={false} />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-3 sm:px-4 py-8 sm:py-12 md:py-16" style={{ maxWidth: "100vw", overflowX: "hidden" }}>
        <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12">
          <div className="text-center space-y-3 sm:space-y-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight px-2">
              New York Gold Market
              <br />
              <span className="text-primary">Precious Metals Transaction System</span>
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
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
          <p>© 2024 New York Gold Market. Premium transaction management system.</p>
        </div>
      </footer>
    </div>
  )
}

