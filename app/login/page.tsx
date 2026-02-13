import { redirect } from "next/navigation"
import { getSession, createSession, verifyCredentials } from "@/lib/auth"
import { LoginForm } from "@/components/login-form"
import { ThemeToggle } from "@/components/theme-toggle"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string }
}) {
  const session = await getSession()
  if (session) {
    redirect(searchParams.redirect || "/dashboard")
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
    redirect(searchParams.redirect || "/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">NFC Membership CRM</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <LoginForm action={handleLogin} />
      </main>
    </div>
  )
}

