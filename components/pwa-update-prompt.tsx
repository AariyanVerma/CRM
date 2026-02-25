"use client"

import { useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"

export function PwaUpdatePrompt() {
  const { toast } = useToast()

  useEffect(() => {
    if (typeof window === "undefined" || process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return

    const showUpdateToast = () => {
      toast({
        title: "Update available",
        description: "A new version is ready. Refresh to update.",
        variant: "default",
        duration: 30000,
        action: (
          <ToastAction altText="Refresh" onClick={() => window.location.reload()}>
            Refresh
          </ToastAction>
        ),
      })
    }

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateToast()
          }
        })
      })
      if (reg.waiting) {
        showUpdateToast()
      }
    })
  }, [toast])

  return null
}
