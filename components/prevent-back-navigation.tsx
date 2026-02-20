"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function PreventBackNavigation() {
  const router = useRouter()

  useEffect(() => {
    // Replace current history entry to prevent back navigation
    window.history.pushState(null, '', window.location.href)
    
    const handlePopState = () => {
      // When user tries to go back, push them forward to login page
      window.history.pushState(null, '', '/login')
      router.replace('/login')
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [router])

  return null
}


