"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

type CardStatus = "ACTIVE" | "LOST" | "DISABLED"

type Card = {
  id: string
  token: string
  status: CardStatus
  locked: boolean
  lockedAt: string | null
  issuedAt: string
  lastScannedAt: string | null
}

export function EditCardDialog({
  card,
  open,
  onOpenChange,
}: {
  card: Card
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<CardStatus>(card.status)
  const [locked, setLocked] = useState(card.locked)

  useEffect(() => {
    if (open) {
      setStatus(card.status)
      setLocked(card.locked)
    }
  }, [open, card.status, card.locked])

  async function handleSave() {
    setLoading(true)
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, locked }),
        credentials: "include",
      })
      if (!res.ok) {
        let message = "Failed to update card"
        try {
          const text = await res.text()
          if (text) {
            const err = JSON.parse(text)
            if (err?.message) message = err.message
          }
        } catch {
          if (res.status === 401) message = "Unauthorized"
          else if (res.status === 403) message = "Only administrators can edit or lock cards"
          else if (res.status >= 500) message = "Server error. Try again."
        }
        throw new Error(message)
      }
      toast({
        title: "Card updated",
        description: "Card status and lock have been saved.",
        variant: "success",
      })
      onOpenChange(false)
      router.refresh()
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to update card",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Card</DialogTitle>
          <DialogDescription>
            Change card status or lock the card. Locked cards can only be used by an administrator or a user with permission to access locked cards.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as CardStatus)}>
              <SelectTrigger disabled={card.locked}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="LOST">Lost</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="locked"
              checked={locked}
              onCheckedChange={(checked) => setLocked(checked === true)}
            />
            <Label htmlFor="locked" className="cursor-pointer">
              Lock card (only admin or authorized users can use it)
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
