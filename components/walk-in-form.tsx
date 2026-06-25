"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { BackButton } from "@/components/back-button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { UserPlus, Search, SkipForward } from "lucide-react"

type CustomerMatch = {
  id: string
  fullName: string
  phoneNumber: string
  isBusiness: boolean
  businessName: string | null
}

export function WalkInForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [fullName, setFullName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<CustomerMatch[]>([])
  const [searching, setSearching] = useState(false)
  const [pendingMatch, setPendingMatch] = useState<CustomerMatch | null>(null)

  const searchCustomers = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q.trim())}`, {
        credentials: "include",
      })
      if (!res.ok) return
      const data = (await res.json()) as CustomerMatch[]
      setSearchResults(data)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchCustomers(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery, searchCustomers])

  async function findPhoneMatch(phone: string): Promise<CustomerMatch | null> {
    const normalized = phone.trim()
    if (!normalized) return null
    const res = await fetch(`/api/customers?q=${encodeURIComponent(normalized)}`, {
      credentials: "include",
    })
    if (!res.ok) return null
    const data = (await res.json()) as CustomerMatch[]
    return data.find((c) => c.phoneNumber.replace(/\D/g, "") === normalized.replace(/\D/g, "")) ?? data[0] ?? null
  }

  async function createWalkIn(skipDetails: boolean) {
    setLoading(true)
    try {
      const res = await fetch("/api/customers/walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: fullName.trim() || undefined,
          phoneNumber: phoneNumber.trim() || undefined,
          skipDetails,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { message?: string }).message || "Failed to create walk-in customer")
      }
      const data = (await res.json()) as { customer: { id: string } }
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("scanBlockReentry")
      }
      router.push(`/transaction/${data.customer.id}`)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start walk-in transaction",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  async function handleContinue() {
    if (!fullName.trim() && !phoneNumber.trim()) {
      toast({
        title: "Missing details",
        description: "Enter a name or phone number, or use Skip details.",
        variant: "destructive",
      })
      return
    }

    if (phoneNumber.trim()) {
      const match = await findPhoneMatch(phoneNumber)
      if (match) {
        setPendingMatch(match)
        return
      }
    }

    await createWalkIn(false)
  }

  function useExistingCustomer() {
    if (!pendingMatch) return
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("scanBlockReentry")
    }
    router.push(`/transaction/${pendingMatch.id}`)
  }

  function createNewAnyway() {
    setPendingMatch(null)
    void createWalkIn(false)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Walk-in Customer
          </CardTitle>
          <CardDescription>
            Start a transaction without scanning a card. Name and phone are optional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="walkInName">Full Name</Label>
              <Input
                id="walkInName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Optional"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="walkInPhone">Phone Number</Label>
              <Input
                id="walkInPhone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Optional"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="flex-1" onClick={() => void handleContinue()} disabled={loading}>
              Continue to transaction
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => void createWalkIn(true)}
              disabled={loading}
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Skip details
            </Button>
          </div>

          <div className="border-t pt-6 space-y-3">
            <Label htmlFor="customerSearch" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search existing customer
            </Label>
            <Input
              id="customerSearch"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name or phone..."
              disabled={loading}
            />
            {searching && <p className="text-sm text-muted-foreground">Searching...</p>}
            {searchResults.length > 0 && (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {searchResults.map((c) => (
                  <Button
                    key={c.id}
                    variant="outline"
                    className="justify-start h-auto py-3"
                    disabled={loading}
                    onClick={() => {
                      if (typeof sessionStorage !== "undefined") {
                        sessionStorage.removeItem("scanBlockReentry")
                      }
                      router.push(`/transaction/${c.id}`)
                    }}
                  >
                    <div className="text-left">
                      <p className="font-medium">{c.fullName}</p>
                      <p className="text-xs text-muted-foreground">{c.phoneNumber}</p>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!pendingMatch} onOpenChange={(open) => !open && setPendingMatch(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Existing customer found</DialogTitle>
            <DialogDescription>
              A customer with this phone number already exists. Use the existing record or create a new walk-in?
            </DialogDescription>
          </DialogHeader>
          {pendingMatch && (
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="font-semibold">{pendingMatch.fullName}</p>
              <p className="text-sm text-muted-foreground">{pendingMatch.phoneNumber}</p>
            </div>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={useExistingCustomer} disabled={loading}>
              Use existing customer
            </Button>
            <Button variant="outline" onClick={createNewAnyway} disabled={loading}>
              Create new walk-in anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
