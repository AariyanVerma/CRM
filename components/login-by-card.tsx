"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, Loader2 } from "lucide-react"

function getSlugFromUrl(urlString: string): string | null {
  try {
    const u = new URL(urlString)
    const card = u.searchParams.get("card")
    if (card && /^[a-zA-Z0-9]{8,64}$/.test(card)) return card
    const match = u.pathname.match(/\/login\/c\/([a-zA-Z0-9]+)/)
    if (match && match[1]) return match[1]
    return null
  } catch {
    return null
  }
}

export function LoginByCard({ slugFromUrl, redirectUrl }: { slugFromUrl: string | null; redirectUrl: string }) {
  const { toast } = useToast()
  const [nfcLoading, setNfcLoading] = useState(false)

  useEffect(() => {
    if (!slugFromUrl) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/auth/login-by-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: slugFromUrl, redirect: redirectUrl || "/dashboard" }),
          credentials: "include",
        })
        if (cancelled) return
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.redirect) {
          window.location.href = data.redirect
          return
        }
        toast({ title: "Invalid or locked card", description: data.message || "Could not sign in.", variant: "destructive" })
      } catch (e) {
        if (!cancelled) toast({ title: "Error", description: e instanceof Error ? e.message : "Sign in failed", variant: "destructive" })
      }
    })()
    return () => { cancelled = true }
  }, [slugFromUrl, redirectUrl, toast])

  const handleTapToSignIn = async () => {
    if (typeof window === "undefined" || !("NDEFReader" in window)) {
      toast({ title: "NFC not supported", description: "Use Chrome on Android (HTTPS).", variant: "destructive" })
      return
    }
    setNfcLoading(true)
    try {
      const ndef = new window.NDEFReader()
      await ndef.scan()
      ndef.addEventListener("reading", async (event: { message: { records: Array<{ recordType: string; data: string | DataView | ArrayBuffer }> } }) => {
        const msg = event.message
        if (!msg?.records?.length) return
        let slug: string | null = null
        for (const record of msg.records) {
          if (record.recordType === "url") {
            let urlString: string
            if (typeof record.data === "string") {
              urlString = record.data
            } else {
              const dv = record.data instanceof DataView ? record.data : new DataView(record.data as ArrayBuffer)
              const prefix = (n: number) => ({ 1: "http://www.", 2: "https://www.", 3: "http://", 4: "https://" }[n] || "https://")
              urlString = prefix(dv.getUint8(0)) + new TextDecoder().decode(new Uint8Array(dv.buffer, dv.byteOffset + 1, dv.byteLength - 1))
            }
            slug = getSlugFromUrl(urlString)
            if (slug) break
          }
        }
        if (!slug) {
          toast({ title: "Invalid card", description: "This card is not a staff login card.", variant: "destructive" })
          setNfcLoading(false)
          return
        }
        const res = await fetch("/api/auth/login-by-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, redirect: redirectUrl || "/dashboard" }),
          credentials: "include",
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.redirect) {
          window.location.href = data.redirect
          return
        }
        toast({ title: "Invalid or locked card", description: data.message || "Could not sign in.", variant: "destructive" })
        setNfcLoading(false)
      })
      toast({ title: "Ready", description: "Tap your staff card to sign in.", variant: "default" })
    } catch (e) {
      toast({ title: "NFC error", description: e instanceof Error ? e.message : "Failed to start NFC.", variant: "destructive" })
      setNfcLoading(false)
    }
  }

  if (slugFromUrl) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Signing you in...</span>
      </div>
    )
  }

  return (
    <div className="pt-4 border-t">
      <Button type="button" variant="outline" className="w-full" onClick={handleTapToSignIn} disabled={nfcLoading}>
        {nfcLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
        Or tap your staff card to sign in
      </Button>
    </div>
  )
}
