import { redirect } from "next/navigation"
import { getSession, createSession, verifyCredentials } from "@/lib/auth"
import { LoginForm } from "@/components/login-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { Logo } from "@/components/logo"
import { PreventBackNavigation } from "@/components/prevent-back-navigation"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; card?: string }>
}) {
  const params = await searchParams
  const redirectUrl = params.redirect ?? ""
  const cardSlug = params.card ?? null
  const session = await getSession()
  if (session) {
    redirect(redirectUrl || "/dashboard")
  }

  async function handleLogin(formData: FormData) {
    "use server"
    try {
      const email = formData.get("email") as string
      const password = formData.get("password") as string

      if (!email || !password) {
        return { error: "Email and password are required" }
      }

      const user = await verifyCredentials(email, password)
      if (!user) {
        return { error: "Invalid email or password" }
      }

      await createSession(user.id)

      const redirectUrl = formData.get("redirect") as string | null
      const targetUrl = redirectUrl || "/dashboard"

      return { redirect: targetUrl }
    } catch (error: unknown) {
      console.error("Login error:", error)
      return { error: "An error occurred during login. Please try again." }
    }
  }

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ maxWidth: "100vw" }}>
      <PreventBackNavigation />
      <header className="border-b border-zinc-800 bg-zinc-900 text-zinc-100">
        <div className="container mx-auto px-2 sm:px-4 py-1.5 sm:py-2 flex justify-between items-center max-w-full overflow-x-hidden">
          <Logo size="xl" showText={false} />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 max-w-full overflow-x-hidden">
        <LoginForm action={handleLogin} cardSlug={cardSlug} redirectUrl={redirectUrl || "/dashboard"} />
      </main>
    </div>
  )
}

