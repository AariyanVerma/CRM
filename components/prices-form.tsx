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
  percentage?: number
}

export function PricesForm({ initialPrices }: { initialPrices: DailyPrice | null }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [prices, setPrices] = useState({
    gold: initialPrices?.gold || 0,
    silver: initialPrices?.silver || 0,
    platinum: initialPrices?.platinum || 0,
    percentage: initialPrices?.percentage || 95,
  })

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const data = {
      gold: prices.gold,
      silver: prices.silver,
      platinum: prices.platinum,
      percentage: prices.percentage,
    }

    try {
      const res = await fetch("/api/admin/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: 'include', // Ensure cookies are sent
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to save prices")
      }

      // Update local state from response
      const result = await res.json()
      if (result.gold && result.silver && result.platinum) {
        setPrices({
          gold: result.gold,
          silver: result.silver,
          platinum: result.platinum,
          percentage: result.percentage || 95,
        })
      }
      
      toast({
        title: "Prices saved",
        description: "Daily prices have been updated successfully.",
        variant: "success",
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
          Update spot prices for gold, silver, and platinum, and the percentage for gold calculations. These prices will be
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
              value={prices.gold || ""}
              onChange={(e) => setPrices(prev => ({ ...prev, gold: parseFloat(e.target.value) || 0 }))}
              placeholder="2000.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="percentage">Percentage (for gold price calculation) *</Label>
            <Input
              id="percentage"
              name="percentage"
              type="number"
              step="0.01"
              min="0"
              max="100"
              required
              value={prices.percentage || ""}
              onChange={(e) => setPrices(prev => ({ ...prev, percentage: parseFloat(e.target.value) || 95 }))}
              placeholder="95.00"
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
              value={prices.silver || ""}
              onChange={(e) => setPrices(prev => ({ ...prev, silver: parseFloat(e.target.value) || 0 }))}
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
              value={prices.platinum || ""}
              onChange={(e) => setPrices(prev => ({ ...prev, platinum: parseFloat(e.target.value) || 0 }))}
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

