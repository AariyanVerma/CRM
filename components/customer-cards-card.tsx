"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Lock, Unlock, Edit, Shield, Trash2, Loader2, AlertTriangle } from "lucide-react"
import { EditCardDialog } from "@/components/edit-card-dialog"
import { useToast } from "@/hooks/use-toast"
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

type CardRecord = {
  id: string
  token: string
  scanSlug?: string | null
  status: string
  locked?: boolean
  lockedAt?: Date | null
  tagPermanentlyLockedAt?: Date | string | null
  issuedAt: Date
  lastScannedAt: Date | null
}

export function CustomerCardsCard({
  customerId,
  cards,
  canIssueCard,
  isAdmin,
}: {
  customerId: string
  cards: CardRecord[]
  canIssueCard: boolean
  isAdmin: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [editingCard, setEditingCard] = useState<CardRecord | null>(null)
  const [lockLoadingId, setLockLoadingId] = useState<string | null>(null)
  const [permanentLockLoading, setPermanentLockLoading] = useState<string | null>(null)
  const [permanentLockConfirmCardId, setPermanentLockConfirmCardId] = useState<string | null>(null)
  const [deleteConfirmCardId, setDeleteConfirmCardId] = useState<string | null>(null)
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null)
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null)

  useEffect(() => {
    setNfcSupported(typeof window !== "undefined" && "NDEFReader" in window)
  }, [])

  const handleLockToggle = async (card: CardRecord) => {
    setLockLoadingId(card.id)
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: !card.locked }),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Update failed")
      toast({ title: card.locked ? "Card unlocked" : "Card locked", variant: "success" })
      router.refresh()
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Update failed", variant: "destructive" })
    } finally {
      setLockLoadingId(null)
    }
  }

  const openPermanentLockConfirm = (card: CardRecord) => {
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
    setPermanentLockConfirmCardId(card.id)
  }

  const handlePermanentLockConfirm = async () => {
    const cardId = permanentLockConfirmCardId
    if (!cardId) return
    setPermanentLockConfirmCardId(null)
    setPermanentLockLoading(cardId)
    try {
      const reader = new window.NDEFReader()
      await (reader as unknown as { makeReadOnly(options?: { signal?: AbortSignal }): Promise<void> }).makeReadOnly()
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagPermanentlyLockedAt: true }),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Update failed")
      toast({
        title: "Tag permanently locked",
        description: "No device or app can ever write, erase, or format this NFC tag again.",
        variant: "success",
      })
      router.refresh()
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

  const handleDelete = async () => {
    const cardId = deleteConfirmCardId
    if (!cardId) return
    setDeleteConfirmCardId(null)
    setDeleteLoadingId(cardId)
    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error("Delete failed")
      toast({ title: "Card deleted", variant: "success" })
      router.refresh()
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Delete failed", variant: "destructive" })
    } finally {
      setDeleteLoadingId(null)
    }
  }

  const activeCard = cards.find((c) => c.status === "ACTIVE")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membership Cards</CardTitle>
        <CardDescription>
          Manage membership cards for this customer. When a card is locked, only this app and authorized users can scan it to see or edit data—no one else can use it anywhere.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {cards.length === 0 ? (
          <div className="flex items-center gap-2">
            <Badge className="bg-muted text-muted-foreground">No cards issued</Badge>
            <p className="text-sm text-muted-foreground">Issue a new card to get started.</p>
          </div>
        ) : (
          <>
          <ul className="space-y-4">
            {cards.map((card) => (
              <li
                key={card.id}
                className="rounded-lg border p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <Badge
                    variant={card.status === "ACTIVE" ? "default" : "secondary"}
                    className={
                      card.status === "ACTIVE"
                        ? "bg-blue-600 hover:bg-blue-600/90"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {card.status}
                  </Badge>
                  {card.locked === true && (
                    <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                      <Lock className="mr-1 h-3 w-3" />
                      Locked
                    </Badge>
                  )}
                  {card.tagPermanentlyLockedAt && (
                    <Badge variant="outline" className="border-amber-600/50 text-amber-700 dark:text-amber-400">
                      <Shield className="mr-1 h-3 w-3" />
                      Tag permanently read-only
                    </Badge>
                  )}
                  {isAdmin && (
                    <div className="ml-auto flex flex-wrap items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={lockLoadingId !== null}
                        onClick={() => handleLockToggle(card)}
                        title={card.locked ? "Unlock card (editable in app)" : "Lock card (read-only in app)"}
                      >
                        {lockLoadingId === card.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : card.locked ? (
                          <Unlock className="h-3 w-3" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                      </Button>
                      {nfcSupported && card.locked && !card.tagPermanentlyLockedAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={permanentLockLoading !== null}
                          onClick={() => openPermanentLockConfirm(card)}
                          title="Permanently lock physical tag (irreversible)"
                          className="border-amber-500/50 text-amber-700 hover:bg-amber-500/10"
                        >
                          {permanentLockLoading === card.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Shield className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCard(card)}
                        title="Edit status"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmCardId(card.id)}
                        title="Delete card"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="grid gap-1 text-sm">
                  <p className="text-muted-foreground">
                    Token: <span className="font-mono text-xs break-all">{card.token}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Issued: {new Date(card.issuedAt).toLocaleDateString()}
                  </p>
                  {card.lastScannedAt && (
                    <p className="text-muted-foreground">
                      Last scanned: {new Date(card.lastScannedAt).toLocaleString()}
                    </p>
                  )}
                  {card.status === "ACTIVE" && (
                    <p className="text-muted-foreground">
                      NDEF URL:{" "}
                      <span className="font-mono text-xs break-all bg-muted p-1 rounded">
                        {process.env.NEXT_PUBLIC_APP_URL || ""}/scan/{card.scanSlug ?? card.token}
                      </span>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>

        {/* Permanent lock confirmation */}
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
                      You can still unlock the card in this app to edit data. Only the physical tag stays read-only.
                    </li>
                  </ul>
                  <p className="pt-1">Are you sure you want to permanently lock this tag?</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handlePermanentLockConfirm}
                className="w-full border-amber-500/50 bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500/20 sm:w-auto"
              >
                Yes, lock permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {}
        <AlertDialog open={deleteConfirmCardId !== null} onOpenChange={(open) => !open && setDeleteConfirmCardId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this card?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the membership card from this customer. They will need a new card to be issued to scan again. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteLoadingId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
          </>
        )}

        {(isAdmin || canIssueCard) && (
          <div className="pt-2">
            <Button asChild>
              <Link href={`/cards/portal?customerId=${encodeURIComponent(customerId)}`}>
                <CreditCard className="mr-2 h-4 w-4" />
                Issue New Card
              </Link>
            </Button>
          </div>
        )}

        {editingCard && (
          <EditCardDialog
            card={{
              id: editingCard.id,
              token: editingCard.token,
              status: editingCard.status as "ACTIVE" | "LOST" | "DISABLED",
              locked: editingCard.locked === true,
              lockedAt: editingCard.lockedAt ? new Date(editingCard.lockedAt).toISOString() : null,
              issuedAt: new Date(editingCard.issuedAt).toISOString(),
              lastScannedAt: editingCard.lastScannedAt ? new Date(editingCard.lastScannedAt).toISOString() : null,
            }}
            open={!!editingCard}
            onOpenChange={(open) => !open && setEditingCard(null)}
          />
        )}
      </CardContent>
    </Card>
  )
}
