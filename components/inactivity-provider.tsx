"use client"

import { useEffect, useRef, useCallback } from "react"
import { clearSessionActive } from "@/components/session-guard"

const INACTIVITY_TIMEOUT_CHANGED = "inactivity-timeout-changed"

export function InactivityProvider({ children }: { children: React.ReactNode }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeoutMinutesRef = useRef<number | null>(null)
  const removeListenersRef = useRef<(() => void) | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    clearTimer()
    const mins = timeoutMinutesRef.current
    if (mins == null || mins <= 0) return
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      removeListenersRef.current?.()
      clearSessionActive()
      fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {})
      window.location.href = "/"
    }, mins * 60 * 1000)
  }, [clearTimer])

  const setupListeners = useCallback(() => {
    removeListenersRef.current?.()
    if (timeoutMinutesRef.current == null) return
    let lastReset = 0
    const throttleMs = 1000
    const resetTimer = () => {
      const now = Date.now()
      if (now - lastReset < throttleMs) return
      lastReset = now
      if (timeoutMinutesRef.current != null) startTimer()
    }
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"]
    events.forEach((e) => window.addEventListener(e, resetTimer))
    removeListenersRef.current = () => {
      clearTimer()
      events.forEach((e) => window.removeEventListener(e, resetTimer))
      removeListenersRef.current = null
    }
    startTimer()
  }, [startTimer, clearTimer])

  useEffect(() => {
    let cancelled = false
    function fetchAndSetup() {
      fetch("/api/profile", { credentials: "include" })
        .then((res) => {
          if (cancelled || !res.ok) return
          return res.json()
        })
        .then((data) => {
          if (cancelled || !data) return
          const mins = data.inactivityTimeoutMinutes
          timeoutMinutesRef.current = mins == null || mins === "" ? null : Number(mins)
          if (timeoutMinutesRef.current != null && timeoutMinutesRef.current > 0) {
            setupListeners()
          } else {
            clearTimer()
            removeListenersRef.current?.()
          }
        })
        .catch(() => {})
    }
    fetchAndSetup()
    const onChanged = (e: CustomEvent<number | null>) => {
      timeoutMinutesRef.current = e.detail
      if (timeoutMinutesRef.current != null && timeoutMinutesRef.current > 0) {
        setupListeners()
      } else {
        clearTimer()
        removeListenersRef.current?.()
      }
    }
    window.addEventListener(INACTIVITY_TIMEOUT_CHANGED, onChanged as EventListener)
    return () => {
      cancelled = true
      clearTimer()
      removeListenersRef.current?.()
      window.removeEventListener(INACTIVITY_TIMEOUT_CHANGED, onChanged as EventListener)
    }
  }, [setupListeners, clearTimer])

  return <>{children}</>
}

export function dispatchInactivityTimeoutChanged(minutes: number | null) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(INACTIVITY_TIMEOUT_CHANGED, { detail: minutes }))
}
