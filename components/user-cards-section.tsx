"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, Lock, Unlock, Shield, Trash2, SmartphoneNfc, Loader2, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type CardStatus = "ACTIVE" | "LOST" | "DISABLED"

interface UserCardRow {
  id: string
  userId: string
  token: string
  scanSlug: string
  status: CardStatus
  locked: boolean
  lockedAt: string | null
  tagPermanentlyLockedAt?: string | null
  issuedAt: string
  scanUrl: string
}

export function UserCardsSection({ userId }: { userId: string }) {
  const { toast } = useToast()
  const [cards, setCards] = useState<UserCardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [issueLoading, setIssueLoading] = useState(false)
  const [writeLoading, setWriteLoading] = useState<string | null>(null)
  const [permanentLockLoading, setPermanentLockLoading] = useState<string | null>(null)
  const [permanentLockConfirmCardId, setPermanentLockConfirmCardId] = useState<string | null>(null)
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null)

  useEffect(() => {
    setNfcSupported(typeof window !== "undefined" && "NDEFReader" in window)
  }, [])

  const fetchCards = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/user-cards?userId=${encodeURIComponent(userId)}`, {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setCards(data)
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to load cards", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCards()
  }, [userId])

  const handleIssue = async () => {
    setIssueLoading(true)
    try {
      const res = await fetch("/api/admin/user-cards/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
        credentials: "include",
      })
      const text = await res.text()
      if (!res.ok) {
        const msg = text ? (() => { try { return JSON.parse(text).message } catch { return text } })() : "Failed"
        throw new Error(msg)
      }
      const data = text ? JSON.parse(text) : {}
      setCards((prev) => [{ ...data, scanSlug: data.scanSlug || "" }, ...prev])
      toast({ title: "Card issued", description: "Tap the physical NFC card to write the login URL.", variant: "success" })
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to issue card", variant: "destructive" })
    } finally {
      setIssueLoading(false)
    }
  }

  const handleWriteNfc = async (scanUrl: string) => {
    const url = typeof scanUrl === "string" ? String(scanUrl).trim() : ""
    if (!url || typeof window === "undefined" || !window.NDEFReader) {
      toast({ title: "NFC not available", description: "Use Chrome on Android (HTTPS).", variant: "destructive" })
      return
    }
    setWriteLoading(url)
    try {
      const ndef = new window.NDEFReader()
      const encoded = new TextEncoder().encode(url)
      await ndef.write({
        records: [
          {
            recordType: "mime",
            mediaType: "application/vnd.nygm.card",
            data: encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength),
          },
        ],
      })
      toast({ title: "Card written", description: "Login URL written to the NFC card.", variant: "success" })
    } catch (e) {
      toast({ title: "Write failed", description: e instanceof Error ? e.message : "NFC write failed", variant: "destructive" })
    } finally {
      setWriteLoading(null)
    }
  }

  const handlePatch = async (cardId: string, updates: { status?: CardStatus; locked?: boolean; tagPermanentlyLockedAt?: boolean }) => {
    try {
      const res = await fetch(`/api/admin/user-cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Update failed")
      const updated = await res.json()
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, ...updated } : c)))
      toast({ title: "Card updated", variant: "success" })
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Update failed", variant: "destructive" })
    }
  }

  const openPermanentLockConfirm = (cardId: string) => {
    if (typeof window === "undefined" || !window.NDEFReader) {
      toast({ title: "NFC not available", description: "Use Chrome on Android (HTTPS).", variant: "destructive" })
      return
    }
    const reader = new window.NDEFReader()
    if (typeof (reader as unknown as { makeReadOnly?: (opts?: { signal?: AbortSignal }) => Promise<void> }).makeReadOnly !== "function") {
      toast({
        title: "Not supported",
        description: "Permanent tag lock is not available in this browser. Use Chrome on Android.",
        variant: "destructive",
      })
      return
    }
    setPermanentLockConfirmCardId(cardId)
  }

  const handleMakeReadOnlyConfirm = async () => {
    const cardId = permanentLockConfirmCardId
    if (!cardId) return
    setPermanentLockConfirmCardId(null)
    setPermanentLockLoading(cardId)
    try {
      const reader = new window.NDEFReader()
      await (reader as unknown as { makeReadOnly(options?: { signal?: AbortSignal }): Promise<void> }).makeReadOnly()
      const res = await fetch(`/api/admin/user-cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagPermanentlyLockedAt: true }),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Update failed")
      const updated = await res.json()
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, ...updated } : c)))
      toast({
        title: "Tag permanently locked",
        description: "No device or app can ever write, erase, or format this NFC tag again.",
        variant: "success",
      })
    } catch (e) {
      toast({
        title: "Failed to lock tag",
        description: e instanceof Error ? e.message : "Hold the card to the device and try again.",
        variant: "destructive",
      })
    } finally {
      setPermanentLockLoading(null)
    }
  }

  const handleDelete = async (cardId: string) => {
    if (!confirm("Delete this login card? The staff member will need a new card to tap to sign in.")) return
    try {
      const res = await fetch(`/api/admin/user-cards/${cardId}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error("Delete failed")
      setCards((prev) => prev.filter((c) => c.id !== cardId))
      toast({ title: "Card deleted", variant: "success" })
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Delete failed", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Staff login cards
        </CardTitle>
        <CardDescription>
          Assign NFC cards so this user can sign in by tapping at the login page. Only admin can create and manage these.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleIssue} disabled={issueLoading}>
          {issueLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Issue new card
        </Button>
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cards assigned yet. Issue a card and write it to a physical NFC tag.</p>
        ) : (
          <ul className="space-y-3">
            {cards.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                <span className="text-xs font-mono truncate flex-1 min-w-0">{c.scanUrl}</span>
                <Badge variant={c.status === "ACTIVE" ? "default" : c.status === "LOST" ? "destructive" : "secondary"}>{c.status}</Badge>
                {c.locked && <span className="text-xs text-amber-600">Locked</span>}
                {c.tagPermanentlyLockedAt && (
                  <span className="text-xs text-amber-700 font-medium inline-flex items-center gap-1">
                    <Shield className="h-3 w-3 shrink-0" />
                    Tag permanently read-only
                  </span>
                )}
                <Select
                  value={c.status}
                  onValueChange={(v) => handlePatch(c.id, { status: v as CardStatus })}
                >
                  <SelectTrigger className="w-28" disabled={c.locked}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="DISABLED">Disabled</SelectItem>
                    <SelectItem value="LOST">Lost</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => handlePatch(c.id, { locked: !c.locked })} title={c.locked ? "Unlock to edit" : "Lock card (read-only)"}>
                  {c.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </Button>
                {nfcSupported && !c.tagPermanentlyLockedAt && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={writeLoading !== null || c.locked}
                    onClick={() => handleWriteNfc(c.scanUrl)}
                  >
                    {writeLoading === c.scanUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : <SmartphoneNfc className="h-4 w-4" />}
                  </Button>
                )}
                {nfcSupported && c.locked && !c.tagPermanentlyLockedAt && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={permanentLockLoading !== null}
                    onClick={() => openPermanentLockConfirm(c.id)}
                    title="Permanently lock physical tag — no tool worldwide can write or erase (irreversible)"
                    className="border-amber-500/50 text-amber-700 hover:bg-amber-500/10"
                  >
                    {permanentLockLoading === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => handleDelete(c.id)} disabled={c.locked}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <AlertDialog open={permanentLockConfirmCardId !== null} onOpenChange={(open) => !open && setPermanentLockConfirmCardId(null)}>
          <AlertDialogContent className="border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-background shadow-xl sm:max-w-md">
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/20 ring-4 ring-amber-500/10">
                  <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <AlertDialogTitle className="text-left text-lg font-semibold text-amber-900 dark:text-amber-100">
                  Permanently lock this NFC tag?
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription asChild>
                <div className="space-y-3 pt-2 text-left text-sm text-muted-foreground">
                  <p className="font-medium text-amber-800/90 dark:text-amber-200/90">
                    This action is irreversible.
                  </p>
                  <ul className="list-inside space-y-2">
                    <li className="flex gap-2">
                      <span className="text-amber-600 dark:text-amber-400">•</span>
                      No device or app in the world will ever be able to write, erase, or format this physical tag again.
                    </li>
                    <li className="flex gap-2">
                      <span className="text-amber-600 dark:text-amber-400">•</span>
                      You can still unlock the card in this app to edit (status, etc.). Only the physical tag stays read-only.
                    </li>
                  </ul>
                  <p className="pt-1">Are you sure you want to permanently lock this tag?</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleMakeReadOnlyConfirm}
                className="w-full border-amber-500/50 bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500/20 sm:w-auto"
              >
                Yes, lock permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

