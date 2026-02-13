"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

interface DailyPrice {
  id: string
  date: Date
  gold: number
  silver: number
  platinum: number
}

export function PricesForm({ initialPrices }: { initialPrices: DailyPrice | null }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      gold: parseFloat(formData.get("gold") as string),
      silver: parseFloat(formData.get("silver") as string),
      platinum: parseFloat(formData.get("platinum") as string),
    }

    try {
      const res = await fetch("/api/admin/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to save prices")
      }

      toast({
        title: "Prices saved",
        description: "Daily prices have been updated successfully.",
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save prices",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Today&apos;s Prices</CardTitle>
        <CardDescription>
          Update spot prices for gold, silver, and platinum. These prices will be
          used for all new transactions created today.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="gold">Gold Spot Price (per oz) *</Label>
            <Input
              id="gold"
              name="gold"
              type="number"
              step="0.01"
              required
              defaultValue={initialPrices?.gold || ""}
              placeholder="2000.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="silver">Silver Spot Price (per oz) *</Label>
            <Input
              id="silver"
              name="silver"
              type="number"
              step="0.01"
              required
              defaultValue={initialPrices?.silver || ""}
              placeholder="25.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="platinum">Platinum Spot Price (per oz) *</Label>
            <Input
              id="platinum"
              name="platinum"
              type="number"
              step="0.01"
              required
              defaultValue={initialPrices?.platinum || ""}
              placeholder="1000.00"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Prices"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

