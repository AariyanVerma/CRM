"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const res = await fetch("/api/auth/logout", { method: "POST" })
    if (res.ok) {
      router.push("/login")
      router.refresh()
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleLogout}>
      <LogOut className="h-5 w-5" />
      <span className="sr-only">Logout</span>
    </Button>
  )
}

