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
  CheckCircle2,
  SmartphoneNfc,
  UserSearch,
  RefreshCw,
} from "lucide-react"

type CardStatus = "ACTIVE" | "LOST" | "DISABLED"

interface IssuedCard {
  id: string
  token: string
  scanUrl: string
  status: CardStatus
  locked?: boolean
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

  const handleWriteNfc = async () => {
    if (!card?.scanUrl || typeof window === "undefined" || !window.NDEFReader) {
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
      const encoder = new TextEncoder()
      const encoded = encoder.encode(card.scanUrl)
      await ndef.write({
        records: [
          {
            recordType: "url",
            data: encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength),
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
      setCard((prev) => prev ? { ...prev, status: updated.status ?? prev.status, locked: updated.locked ?? prev.locked } : null)
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
              <Button
                variant="outline"
                onClick={handleWriteNfc}
                disabled={writeLoading}
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
                    Write URL to NFC card (tap card on screen)
                  </>
                )}
              </Button>
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
