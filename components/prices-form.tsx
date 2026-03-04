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
  const [prices, setPrices] = useState<{
    gold: number | ""
    silver: number | ""
    platinum: number | ""
    scrapGoldPercentage: number | ""
    scrapSilverPercentage: number | ""
    scrapPlatinumPercentage: number | ""
    meltGoldPercentage: number | ""
    meltSilverPercentage: number | ""
    meltPlatinumPercentage: number | ""
  }>({
    gold: initialPrices?.gold ?? 0,
    silver: initialPrices?.silver ?? 0,
    platinum: initialPrices?.platinum ?? 0,
    scrapGoldPercentage: initialPrices?.scrapGoldPercentage ?? 95,
    scrapSilverPercentage: initialPrices?.scrapSilverPercentage ?? 95,
    scrapPlatinumPercentage: initialPrices?.scrapPlatinumPercentage ?? 95,
    meltGoldPercentage: initialPrices?.meltGoldPercentage ?? 95,
    meltSilverPercentage: initialPrices?.meltSilverPercentage ?? 95,
    meltPlatinumPercentage: initialPrices?.meltPlatinumPercentage ?? 95,
  })

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const data = {
      gold: Number(prices.gold) || 0,
      silver: Number(prices.silver) || 0,
      platinum: Number(prices.platinum) || 0,
      scrapGoldPercentage: Number(prices.scrapGoldPercentage) || 95,
      scrapSilverPercentage: Number(prices.scrapSilverPercentage) || 95,
      scrapPlatinumPercentage: Number(prices.scrapPlatinumPercentage) || 95,
      meltGoldPercentage: Number(prices.meltGoldPercentage) || 95,
      meltSilverPercentage: Number(prices.meltSilverPercentage) || 95,
      meltPlatinumPercentage: Number(prices.meltPlatinumPercentage) || 95,
    }

    try {
      const res = await fetch("/api/admin/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: 'include',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to save prices")
      }
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
                value={prices.gold === "" ? "" : prices.gold}
                onFocus={() => setPrices(prev => ({ ...prev, gold: "" }))}
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
                value={prices.silver === "" ? "" : prices.silver}
                onFocus={() => setPrices(prev => ({ ...prev, silver: "" }))}
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
                value={prices.platinum === "" ? "" : prices.platinum}
                onFocus={() => setPrices(prev => ({ ...prev, platinum: "" }))}
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
                value={prices.scrapGoldPercentage === "" ? "" : prices.scrapGoldPercentage}
                onFocus={() => setPrices(prev => ({ ...prev, scrapGoldPercentage: "" }))}
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
                value={prices.scrapSilverPercentage === "" ? "" : prices.scrapSilverPercentage}
                onFocus={() => setPrices(prev => ({ ...prev, scrapSilverPercentage: "" }))}
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
                value={prices.scrapPlatinumPercentage === "" ? "" : prices.scrapPlatinumPercentage}
                onFocus={() => setPrices(prev => ({ ...prev, scrapPlatinumPercentage: "" }))}
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
                value={prices.meltGoldPercentage === "" ? "" : prices.meltGoldPercentage}
                onFocus={() => setPrices(prev => ({ ...prev, meltGoldPercentage: "" }))}
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
                value={prices.meltSilverPercentage === "" ? "" : prices.meltSilverPercentage}
                onFocus={() => setPrices(prev => ({ ...prev, meltSilverPercentage: "" }))}
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
                value={prices.meltPlatinumPercentage === "" ? "" : prices.meltPlatinumPercentage}
                onFocus={() => setPrices(prev => ({ ...prev, meltPlatinumPercentage: "" }))}
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

