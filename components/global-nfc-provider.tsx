"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import {
  NFC_APP_RECORD_TYPE,
  ndefRecordDataToString,
  parseNfcCardFromUrl,
  type ParsedNfcCard,
} from "@/lib/nfc"
import { setSessionActive } from "@/components/session-guard"

function getUrlFromRecord(record: NDEFRecord): string | null {
  const isAppCard =
    record.recordType === NFC_APP_RECORD_TYPE ||
    (record.recordType === "mime" && record.mediaType === NFC_APP_RECORD_TYPE)
  if (isAppCard) return ndefRecordDataToString(record.data)
  if (record.recordType === "url") {
    if (typeof record.data === "string") return record.data
    const dv = record.data instanceof DataView ? record.data : new DataView(record.data as ArrayBuffer)
    if (dv.byteLength === 0) return null
    const prefix: Record<number, string> = {
      1: "http://www.",
      2: "https://www.",
      3: "http://",
      4: "https://",
    }
    const url = (prefix[dv.getUint8(0)] || "https://") + new TextDecoder().decode(new Uint8Array(dv.buffer, dv.byteOffset + 1, dv.byteLength - 1))
    return url
  }
  return null
}

function parseMessage(message: NDEFMessage): ParsedNfcCard | null {
  if (!message?.records?.length) return null
  for (const record of message.records) {
    const url = getUrlFromRecord(record as NDEFRecord)
    if (url) {
      const parsed = parseNfcCardFromUrl(url)
      if (parsed) return parsed
    }
  }
  return null
}

export function GlobalNfcProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const lastReadAt = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !("NDEFReader" in window) || !window.isSecureContext) return
    if (pathname === "/scan") return

    let mounted = true
    const ac = new AbortController()
    abortRef.current = ac

    const ndef = new window.NDEFReader()

    const handleReading = async (event: NDEFReadingEvent | ErrorEvent) => {
      if (!mounted || ac.signal.aborted) return
      if (Date.now() - lastReadAt.current < 3000) return
      if (!("message" in event) || typeof event.message === "string") return
      const parsed = parseMessage(event.message as NDEFMessage)
      if (!parsed) return
      lastReadAt.current = Date.now()
      if (parsed.type === "scan") {
        toast({ title: "Card scanned", description: "Opening transaction...", variant: "nfc", duration: 2200 })
        if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("scanBlockReentry")
        router.replace(`/scan/${parsed.token}`)
        return
      }
      const redirectAfterLogin = pathname === "/" || pathname === "/login" ? "/dashboard" : (pathname || "/dashboard")
      toast({ title: "Signing you in...", description: "Verifying staff card", variant: "nfc-login", duration: 3000 })
      try {
        const res = await fetch("/api/auth/login-by-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: parsed.slug, redirect: redirectAfterLogin }),
          credentials: "include",
        })
        const data = await res.json().catch(() => ({}))
        if (!mounted) return
        if (res.ok && data.redirect) {
          setSessionActive()
          window.location.href = data.redirect
          return
        }
        toast({ title: "Invalid or locked card", description: data.message || "Could not sign in.", variant: "destructive", duration: 4000 })
      } catch {
        if (mounted) toast({ title: "Error", description: "Sign in failed", variant: "destructive", duration: 4000 })
      }
    }

    const listener = (evt: Event) => {
      void handleReading(evt as NDEFReadingEvent | ErrorEvent)
    }
    ndef.addEventListener("reading", listener)
    ndef.scan({ signal: ac.signal }).catch(() => {})

    return () => {
      mounted = false
      ndef.removeEventListener("reading", listener)
      ac.abort()
      abortRef.current = null
    }
  }, [pathname, router, toast])

  return <>{children}</>
}
