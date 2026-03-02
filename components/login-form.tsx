"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ForgotPasswordDialog } from "@/components/forgot-password-dialog"
import { PasswordInput } from "@/components/password-input"
import { Logo } from "@/components/logo"

export function LoginForm({ action }: { action: (formData: FormData) => Promise<{ error?: string; redirect?: string } | void> }) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const result = await action(formData)
      
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      } else if (result?.redirect) {

        window.location.href = result.redirect
      } else {
        window.location.href = "/dashboard"
      }
    } catch (error) {
      console.error("Login form error:", error)
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md overflow-hidden">
      <div className="dark rounded-t-lg border-b border-border bg-background text-foreground flex justify-center items-center py-3 px-4">
        <Logo size="lg" href="/" className="pointer-events-auto" />
      </div>
      <CardHeader>
        <CardTitle>Staff Login</CardTitle>
        <CardDescription>
          Enter your credentials to access the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
          <div className="text-center">
            <button
              type="button"
              onClick={() => setForgotPasswordOpen(true)}
              className="text-sm text-red-600 hover:underline"
              disabled={loading}
            >
              Forgot Password?
            </button>
          </div>
        </form>
        <ForgotPasswordDialog
          open={forgotPasswordOpen}
          onOpenChange={setForgotPasswordOpen}
        />
      </CardContent>
    </Card>
  )
}

