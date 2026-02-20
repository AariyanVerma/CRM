"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    // Optimistically navigate first for faster UX
    window.history.replaceState(null, '', '/')
    router.replace("/")
    
    // Then destroy session in background (don't wait for it)
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {
      // Silently handle errors - user is already logged out on client side
    })
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleLogout}>
      <LogOut className="h-5 w-5" />
      <span className="sr-only">Logout</span>
    </Button>
  )
}

