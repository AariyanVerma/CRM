import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Logo } from "@/components/logo"
import { HomePageContent } from "@/components/home-page-content"

// Force dynamic rendering to avoid database queries during build
export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-2 sm:px-4 py-1.5 sm:py-2 flex justify-end items-center">
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-3 sm:px-4 py-8 sm:py-12 md:py-16" style={{ maxWidth: "100vw", overflowX: "hidden" }}>
        <div className="max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="text-center space-y-6 sm:space-y-8 mb-12 sm:mb-16">
            {/* Logo - Centered */}
            <div className="flex justify-center mb-4">
              <Logo size="xl" showText={false} className="drop-shadow-lg scale-125 sm:scale-150" />
            </div>
            
            {/* Company Name */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent">
                New York Gold Market
              </h1>
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-primary">
                Precious Metals Transaction System
              </h2>
            </div>

          </div>

          {/* Useful Content */}
          <HomePageContent />

          {/* CTA Section */}
          <div className="text-center space-y-6 mt-12">
            <div>
              <Link href="/login">
                <Button size="lg" className="text-lg px-8 py-6 h-auto shadow-lg hover:shadow-xl transition-shadow">
                  Staff Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-8 mt-auto bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 New York Gold Market. Premium transaction management system.</p>
        </div>
      </footer>
    </div>
  )
}

