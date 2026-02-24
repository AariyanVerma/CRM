"use client"

import { useState } from "react"
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
  scrapGoldPercentage?: number
  scrapSilverPercentage?: number
  scrapPlatinumPercentage?: number
  meltGoldPercentage?: number
  meltSilverPercentage?: number
  meltPlatinumPercentage?: number
}

export function PricesForm({ initialPrices }: { initialPrices: DailyPrice | null }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [prices, setPrices] = useState({
    gold: initialPrices?.gold || 0,
    silver: initialPrices?.silver || 0,
    platinum: initialPrices?.platinum || 0,
    scrapGoldPercentage: initialPrices?.scrapGoldPercentage || 95,
    scrapSilverPercentage: initialPrices?.scrapSilverPercentage || 95,
    scrapPlatinumPercentage: initialPrices?.scrapPlatinumPercentage || 95,
    meltGoldPercentage: initialPrices?.meltGoldPercentage || 95,
    meltSilverPercentage: initialPrices?.meltSilverPercentage || 95,
    meltPlatinumPercentage: initialPrices?.meltPlatinumPercentage || 95,
  })

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const data = {
      gold: prices.gold,
      silver: prices.silver,
      platinum: prices.platinum,
      scrapGoldPercentage: prices.scrapGoldPercentage,
      scrapSilverPercentage: prices.scrapSilverPercentage,
      scrapPlatinumPercentage: prices.scrapPlatinumPercentage,
      meltGoldPercentage: prices.meltGoldPercentage,
      meltSilverPercentage: prices.meltSilverPercentage,
      meltPlatinumPercentage: prices.meltPlatinumPercentage,
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
          scrapGoldPercentage: result.scrapGoldPercentage || 95,
          scrapSilverPercentage: result.scrapSilverPercentage || 95,
          scrapPlatinumPercentage: result.scrapPlatinumPercentage || 95,
          meltGoldPercentage: result.meltGoldPercentage || 95,
          meltSilverPercentage: result.meltSilverPercentage || 95,
          meltPlatinumPercentage: result.meltPlatinumPercentage || 95,
        })
      }
      
      toast({
        title: "Prices saved",
        description: "Daily prices have been updated successfully.",
        variant: "success",
      })
      // Socket.IO will handle real-time updates, no need for router.refresh()
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
          Update spot prices and percentages for all metals. These values will be used for all new transactions created today.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Spot Prices</h3>
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
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-red-600">SCRAP Percentages</h3>
            <div className="space-y-2">
              <Label htmlFor="scrapGoldPercentage">Scrap Gold Percentage *</Label>
              <Input
                id="scrapGoldPercentage"
                name="scrapGoldPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={prices.scrapGoldPercentage || ""}
                onChange={(e) => setPrices(prev => ({ ...prev, scrapGoldPercentage: parseFloat(e.target.value) || 95 }))}
                placeholder="95.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scrapSilverPercentage">Scrap Silver Percentage *</Label>
              <Input
                id="scrapSilverPercentage"
                name="scrapSilverPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={prices.scrapSilverPercentage || ""}
                onChange={(e) => setPrices(prev => ({ ...prev, scrapSilverPercentage: parseFloat(e.target.value) || 95 }))}
                placeholder="95.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scrapPlatinumPercentage">Scrap Platinum Percentage *</Label>
              <Input
                id="scrapPlatinumPercentage"
                name="scrapPlatinumPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={prices.scrapPlatinumPercentage || ""}
                onChange={(e) => setPrices(prev => ({ ...prev, scrapPlatinumPercentage: parseFloat(e.target.value) || 95 }))}
                placeholder="95.00"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-red-600">MELT Percentages</h3>
            <div className="space-y-2">
              <Label htmlFor="meltGoldPercentage">Melt Gold Percentage *</Label>
              <Input
                id="meltGoldPercentage"
                name="meltGoldPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={prices.meltGoldPercentage || ""}
                onChange={(e) => setPrices(prev => ({ ...prev, meltGoldPercentage: parseFloat(e.target.value) || 95 }))}
                placeholder="95.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meltSilverPercentage">Melt Silver Percentage *</Label>
              <Input
                id="meltSilverPercentage"
                name="meltSilverPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={prices.meltSilverPercentage || ""}
                onChange={(e) => setPrices(prev => ({ ...prev, meltSilverPercentage: parseFloat(e.target.value) || 95 }))}
                placeholder="95.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meltPlatinumPercentage">Melt Platinum Percentage *</Label>
              <Input
                id="meltPlatinumPercentage"
                name="meltPlatinumPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={prices.meltPlatinumPercentage || ""}
                onChange={(e) => setPrices(prev => ({ ...prev, meltPlatinumPercentage: parseFloat(e.target.value) || 95 }))}
                placeholder="95.00"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Prices"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

