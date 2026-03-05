"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { clearSessionActive } from "@/components/session-guard"

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    clearSessionActive()
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {})
    window.location.href = "/"
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleLogout}>
      <LogOut className="h-5 w-5" />
      <span className="sr-only">Logout</span>
    </Button>
  )
}

