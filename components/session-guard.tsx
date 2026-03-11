"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

const SESSION_ACTIVE_KEY = "sessionActive"

export function setSessionActive() {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(SESSION_ACTIVE_KEY, "1")
  }
}

export function clearSessionActive() {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(SESSION_ACTIVE_KEY)
  }
}

export function SessionGuard() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const active = typeof window !== "undefined" ? window.sessionStorage.getItem(SESSION_ACTIVE_KEY) : null
    if (active && pathname === "/login") {
      fetch("/api/user/current", { credentials: "include" })
        .then((res) => {
          if (res.ok) {
            const redirect = searchParams.get("redirect") || "/dashboard"
            window.location.href = redirect
          } else {
            clearSessionActive()
            fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {})
          }
        })
        .catch(() => {
          clearSessionActive()
          fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {})
        })
      return
    }
    if (active) return

    if (pathname?.startsWith("/print")) return
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(() => {
      if (pathname !== "/" && pathname !== "/login") {
        window.location.href = "/"
      }
    })
  }, [pathname, searchParams])

  return null
}
