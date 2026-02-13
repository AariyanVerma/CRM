"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { CreditCard } from "lucide-react"

export function IssueCardDialog({ customerId }: { customerId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleIssue() {
    setLoading(true)
    try {
      const res = await fetch("/api/cards/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to issue card")
      }

      const data = await res.json()
      toast({
        title: "Card issued",
        description: "New NFC card has been issued successfully.",
      })
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to issue card",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <CreditCard className="mr-2 h-4 w-4" />
          Issue New Card
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue NFC Card</DialogTitle>
          <DialogDescription>
            This will generate a new token and create a new NFC card for this customer.
            Any existing active card will be disabled.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleIssue} disabled={loading}>
            {loading ? "Issuing..." : "Issue Card"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

