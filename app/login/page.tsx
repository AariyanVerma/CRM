import { redirect } from "next/navigation"
import { getSession, createSession, verifyCredentials } from "@/lib/auth"
import { LoginForm } from "@/components/login-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { Logo } from "@/components/logo"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const { redirect: redirectUrl } = await searchParams
  const session = await getSession()
  if (session) {
    redirect(redirectUrl || "/dashboard")
  }

  async function handleLogin(formData: FormData) {
    "use server"
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const user = await verifyCredentials(email, password)
    if (!user) {
      return { error: "Invalid email or password" }
    }

    await createSession(user.id)
    const { redirect: redirectUrl } = await searchParams
    redirect(redirectUrl || "/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-2 sm:px-4 py-1.5 sm:py-2 flex justify-between items-center">
          <Logo size="xl" showText={false} />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <LoginForm action={handleLogin} />
      </main>
    </div>
  )
}

