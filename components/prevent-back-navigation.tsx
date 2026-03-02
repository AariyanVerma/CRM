"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function PreventBackNavigation() {
  const router = useRouter()

  useEffect(() => {
    window.history.pushState(null, '', window.location.href)
    
    const handlePopState = () => {
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




