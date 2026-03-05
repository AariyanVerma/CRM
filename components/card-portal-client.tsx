"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getCustomerDisplayName } from "@/lib/utils"
import {
  CreditCard,
  Loader2,
  Lock,
  Shield,
  CheckCircle2,
  SmartphoneNfc,
  UserSearch,
  RefreshCw,
  AlertTriangle,
} from "lucide-react"
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

type CardStatus = "ACTIVE" | "LOST" | "DISABLED"

interface IssuedCard {
  id: string
  token: string
  scanUrl: string
  status: CardStatus
  locked?: boolean
  tagPermanentlyLockedAt?: string | null
}

interface CustomerOption {
  id: string
  fullName: string
  isBusiness?: boolean
  businessName?: string | null
}

interface CardPortalClientProps {
  isAdmin: boolean
  initialCustomer?: CustomerOption | null
}

export function CardPortalClient({ isAdmin, initialCustomer }: CardPortalClientProps) {
  const { toast } = useToast()
  const [customerSearch, setCustomerSearch] = useState("")
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [customerId, setCustomerId] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [issueLoading, setIssueLoading] = useState(false)
  const [writeLoading, setWriteLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [permanentLockLoading, setPermanentLockLoading] = useState(false)
  const [permanentLockConfirmOpen, setPermanentLockConfirmOpen] = useState(false)
  const [card, setCard] = useState<IssuedCard | null>(null)
  const [locked, setLocked] = useState(false)
  const [status, setStatus] = useState<CardStatus>("ACTIVE")
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null)

  useEffect(() => {
    setNfcSupported(
      typeof window !== "undefined" && "NDEFReader" in window
    )
  }, [])

  useEffect(() => {
    if (initialCustomer) {
      setCustomerId(initialCustomer.id)
      setCustomers([initialCustomer])
      setCustomerSearch(getCustomerDisplayName(initialCustomer))
    }
  }, [initialCustomer])

  useEffect(() => {
    const t = setTimeout(async () => {
      if (customerSearch.length < 2) {
        setCustomers([])
        return
      }
      setSearchLoading(true)
      try {
        const res = await fetch(
          `/api/customers?q=${encodeURIComponent(customerSearch)}`,
          { credentials: "include" }
        )
        if (res.ok) {
          const data = await res.json()
          setCustomers(data)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [customerSearch])

  const handleIssue = async () => {
    if (!customerId) {
      toast({
        title: "Select customer",
        description: "Search and select a customer first.",
        variant: "destructive",
      })
      return
    }
    setIssueLoading(true)
    try {
      const res = await fetch("/api/cards/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
        credentials: "include",
      })
      const text = await res.text()
      if (!res.ok) {
        const err = text ? (() => { try { return JSON.parse(text).message } catch { return text } })() : "Failed to issue card"
        throw new Error(err)
      }
      const data = text ? JSON.parse(text) : {}
      setCard({
        id: data.id,
        token: data.token,
        scanUrl: data.scanUrl || `${process.env.NEXT_PUBLIC_APP_URL || ""}/scan/${data.scanSlug ?? data.token}`,
        status: data.status || "ACTIVE",
        locked: data.locked ?? false,
      })
      setLocked(data.locked ?? false)
      setStatus((data.status as CardStatus) || "ACTIVE")
      toast({
        title: "Card issued",
        description: "Now tap the physical NFC card to write the scan URL, then lock/save if needed.",
        variant: "success",
      })
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to issue card",
        variant: "destructive",
      })
    } finally {
      setIssueLoading(false)
    }
  }

  const tagPermanentlyLocked = Boolean(card?.tagPermanentlyLockedAt)

  const openPermanentLockConfirm = () => {
    if (!card || typeof window === "undefined" || !window.NDEFReader) {
      toast({ title: "NFC not available", description: "Use Chrome on Android (HTTPS).", variant: "destructive" })
      return
    }
    const reader = new window.NDEFReader()
    if (typeof (reader as unknown as { makeReadOnly?: (opts?: { signal?: AbortSignal }) => Promise<void> }).makeReadOnly !== "function") {
      toast({
        title: "Not supported",
        description: "Permanent tag lock (makeReadOnly) is not available in this browser. Use Chrome on Android.",
        variant: "destructive",
      })
      return
    }
    setPermanentLockConfirmOpen(true)
  }

  const handleMakeReadOnlyConfirm = async () => {
    if (!card) return
    setPermanentLockLoading(true)
    setPermanentLockConfirmOpen(false)
    try {
      const reader = new window.NDEFReader()
      await (reader as unknown as { makeReadOnly(options?: { signal?: AbortSignal }): Promise<void> }).makeReadOnly()
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagPermanentlyLockedAt: true }),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to save")
      const updated = await res.json()
      setCard((prev) => prev ? { ...prev, tagPermanentlyLockedAt: updated.tagPermanentlyLockedAt ?? new Date().toISOString() } : null)
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
      setPermanentLockLoading(false)
    }
  }

  const handleWriteNfc = async () => {
    if (tagPermanentlyLocked) {
      toast({
        title: "Tag is permanently locked",
        description: "This NFC tag can no longer be written to by any device.",
        variant: "destructive",
      })
      return
    }
    if (locked) {
      toast({
        title: "Card is locked",
        description: "Unlock the card to write or change the NFC tag. Locked cards are read-only.",
        variant: "destructive",
      })
      return
    }
    const url = card?.scanUrl != null ? String(card.scanUrl) : ""
    if (!url || typeof window === "undefined" || !window.NDEFReader) {
      toast({
        title: "NFC not available",
        description: "Web NFC is only supported in Chrome on Android (HTTPS).",
        variant: "destructive",
      })
      return
    }
    setWriteLoading(true)
    try {
      const ndef = new window.NDEFReader()
      await ndef.write({
        records: [
          {
            recordType: "mime",
            mediaType: "application/vnd.nygm.card",
            data: new TextEncoder().encode(url),
          },
        ],
      })
      toast({
        title: "Card written",
        description: "The scan URL has been written to the NFC card. You can now lock and save.",
        variant: "success",
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "NFC write failed"
      toast({
        title: "Write failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setWriteLoading(false)
    }
  }

  const handleSave = async () => {
    if (!card) return
    setSaveLoading(true)
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isAdmin ? { status } : {}),
          locked: isAdmin ? locked : undefined,
        }),
        credentials: "include",
      })
      const text = await res.text()
      if (!res.ok) {
        const err = text ? (() => { try { return JSON.parse(text).message } catch { return text } })() : "Failed to save"
        throw new Error(err)
      }
      const updated = text ? JSON.parse(text) : {}
      setCard((prev) => prev ? { ...prev, status: updated.status ?? prev.status, locked: updated.locked ?? prev.locked, tagPermanentlyLockedAt: updated.tagPermanentlyLockedAt ?? prev.tagPermanentlyLockedAt } : null)
      toast({
        title: "Card saved",
        description: locked ? "Card is locked; only admin or permitted users can scan it." : "Card is ready for use.",
        variant: "success",
      })
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to save card",
        variant: "destructive",
      })
    } finally {
      setSaveLoading(false)
    }
  }

  const resetFlow = () => {
    setCard(null)
    setCustomerId("")
    setCustomerSearch("")
    setCustomers([])
    setLocked(false)
    setStatus("ACTIVE")
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Issue &amp; write card
        </CardTitle>
        <CardDescription>
          Select a customer, issue a card, write the scan URL to the physical NFC card, then lock and save. When locked, no one else can scan the card anywhere to see or edit the data—only this app and authorized users can use it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!card ? (
          <>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <UserSearch className="h-4 w-4" />
                Customer
              </Label>
              <Input
                placeholder="Search by name or phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              {searchLoading && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                </p>
              )}
              {!searchLoading && customers.length > 0 && (
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {getCustomerDisplayName(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!searchLoading && customerSearch.length >= 2 && customers.length === 0 && (
                <p className="text-sm text-muted-foreground">No customers found</p>
              )}
            </div>
            <Button
              onClick={handleIssue}
              disabled={issueLoading || !customerId}
              className="w-full"
            >
              {issueLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Issuing...
                </>
              ) : (
                "Issue new card"
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <p className="text-sm font-medium">Scan URL (written to card)</p>
              <p className="text-xs text-muted-foreground break-all font-mono">{card.scanUrl}</p>
            </div>

            {nfcSupported && (
              <>
                {tagPermanentlyLocked ? (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-1">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
                      <Shield className="h-4 w-4 shrink-0" />
                      Physical tag is permanently read-only
                    </p>
                    <p className="text-xs text-muted-foreground">
                      No device or app in the world can write, erase, or format this NFC tag again. The tag is locked at the hardware level.
                    </p>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleWriteNfc}
                      disabled={writeLoading || locked}
                      className="w-full"
                    >
                      {writeLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Hold card to device...
                        </>
                      ) : (
                        <>
                          <SmartphoneNfc className="mr-2 h-4 w-4" />
                          {locked ? "Card locked — unlock to write" : "Write URL to NFC card (tap card on screen)"}
                        </>
                      )}
                    </Button>
                    {locked && (
                      <>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Lock className="h-4 w-4 shrink-0" />
                          Locked cards are read-only in the app. Unlock above to write or overwrite the physical NFC tag.
                        </p>
                        {isAdmin && (
                          <>
                            <Button
                              variant="outline"
                              onClick={openPermanentLockConfirm}
                              disabled={permanentLockLoading}
                              className="w-full border-amber-500/50 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                            >
                              {permanentLockLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Hold tag to device...
                                </>
                            ) : (
                              <>
                                <Shield className="mr-2 h-4 w-4" />
                                Permanently lock physical tag — no tool worldwide can write or erase it (irreversible)
                              </>
                            )}
                            </Button>
                            <AlertDialog open={permanentLockConfirmOpen} onOpenChange={setPermanentLockConfirmOpen}>
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
                                          You can still unlock the card in this app to edit data (transactions, status, etc.). Only the physical tag stays read-only.
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
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
            {nfcSupported === false && (
              <p className="text-sm text-muted-foreground">
                Web NFC is not available in this browser (use Chrome on Android over HTTPS to write the card).
              </p>
            )}

            {isAdmin && (
              <div className="space-y-4 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="lock-card"
                    checked={locked}
                    onChange={(e) => setLocked(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="lock-card" className="flex items-center gap-2 cursor-pointer">
                    <Lock className="h-4 w-4" />
                    Lock card so only this app and authorized users can scan, see, or edit data—no one else can use it anywhere
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as CardStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="DISABLED">Disabled</SelectItem>
                      <SelectItem value="LOST">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {isAdmin && (
                <Button
                  onClick={handleSave}
                  disabled={saveLoading}
                  className="flex-1"
                >
                  {saveLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Save &amp; ready for use
                    </>
                  )}
                </Button>
              )}
              <Button
                variant={isAdmin ? "outline" : "default"}
                onClick={resetFlow}
                disabled={saveLoading}
                className={isAdmin ? "" : "flex-1"}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {card ? "Issue another card" : "Reset"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
