"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Gem, Plus, Trash2, ArrowRight, Calendar } from "lucide-react"
import {
  GOLD_PURITIES,
  SILVER_PURITIES,
  PLATINUM_PURITIES,
  calculateScrapGoldPricePerDWT,
  calculateScrapSilverPricePerDWT,
  calculateScrapPlatinumPricePerDWT,
  calculateLineTotal,
  type MetalType,
  type GoldPurity,
  type SilverPurity,
  type PlatinumPurity,
} from "@/lib/pricing"

const METALS = ["GOLD", "SILVER", "PLATINUM"] as const

type Row = {
  id: string
  date: string
  metal: string
  purity: string
  dwt: string
  spotPrice: string
  pricePaid: string
}

function todayStr() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function getDateParts(value: string): { month: string; day: string } | null {
  if (!value) return null
  const [y, m, d] = value.split("-").map((p) => parseInt(p, 10))
  if (!y || !m || !d) return null
  const dt = new Date(y, m - 1, d)
  const month = dt.toLocaleDateString(undefined, { month: "short" })
  const day = dt.getDate().toString()
  return { month, day }
}

const DEFAULT_SCRAP_PERCENTAGE = 95

function getScrapPercentageForMetal(
  metal: MetalType,
  scrapPercentages: { gold: number; silver: number; platinum: number } | null
): number {
  if (!scrapPercentages) return DEFAULT_SCRAP_PERCENTAGE
  switch (metal) {
    case "GOLD":
      return scrapPercentages.gold ?? DEFAULT_SCRAP_PERCENTAGE
    case "SILVER":
      return scrapPercentages.silver ?? DEFAULT_SCRAP_PERCENTAGE
    case "PLATINUM":
      return scrapPercentages.platinum ?? DEFAULT_SCRAP_PERCENTAGE
    default:
      return DEFAULT_SCRAP_PERCENTAGE
  }
}

function calculateRowScrapTotal(
  row: Row,
  scrapPercentages: { gold: number; silver: number; platinum: number } | null
): number {
  const spot = parseFloat(row.spotPrice)
  const dwt = parseFloat(row.dwt)
  if (!row.purity?.trim() || isNaN(spot) || isNaN(dwt) || dwt <= 0) return 0
  const metal = row.metal as MetalType
  const percentage = getScrapPercentageForMetal(metal, scrapPercentages)
  let pricePerDWT = 0
  switch (metal) {
    case "GOLD":
      pricePerDWT = calculateScrapGoldPricePerDWT(row.purity as GoldPurity, spot, percentage)
      break
    case "SILVER":
      pricePerDWT = calculateScrapSilverPricePerDWT(row.purity as SilverPurity, spot, percentage)
      break
    case "PLATINUM":
      pricePerDWT = calculateScrapPlatinumPricePerDWT(row.purity as PlatinumPurity, spot, percentage)
      break
    default:
      return 0
  }
  return calculateLineTotal(pricePerDWT, dwt)
}

function getMonthAccentClasses(value: string): string {
  if (!value) return "from-slate-500 via-slate-400 to-slate-300"
  const [, m] = value.split("-").map((p) => parseInt(p, 10))
  switch (m) {
    case 1:
      return "from-sky-500 via-sky-400 to-cyan-400"
    case 2:
      return "from-violet-500 via-fuchsia-500 to-pink-400"
    case 3:
      return "from-emerald-500 via-green-500 to-lime-400"
    case 4:
      return "from-teal-500 via-cyan-500 to-sky-400"
    case 5:
      return "from-amber-500 via-orange-500 to-yellow-400"
    case 6:
      return "from-rose-500 via-red-500 to-orange-400"
    case 7:
      return "from-indigo-500 via-blue-500 to-sky-400"
    case 8:
      return "from-teal-500 via-emerald-500 to-green-400"
    case 9:
      return "from-amber-600 via-amber-500 to-orange-400"
    case 10:
      return "from-rose-600 via-pink-500 to-fuchsia-500"
    case 11:
      return "from-sky-600 via-cyan-500 to-teal-500"
    case 12:
      return "from-purple-600 via-violet-500 to-indigo-500"
    default:
      return "from-slate-500 via-slate-400 to-slate-300"
  }
}

export function StonesTableCard() {
  const { toast } = useToast()
  const [rows, setRows] = useState<Row[]>([
    { id: crypto.randomUUID(), date: todayStr(), metal: "GOLD", purity: "", dwt: "", spotPrice: "", pricePaid: "" },
  ])
  const [saving, setSaving] = useState(false)

  const [spotPrices, setSpotPrices] = useState<{ gold: number; silver: number; platinum: number } | null>(null)
  const [scrapPercentages, setScrapPercentages] = useState<{
    gold: number
    silver: number
    platinum: number
  } | null>(null)

  const dateInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    fetch("/api/prices/current", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setSpotPrices({
          gold: Number(data.gold) || 0,
          silver: Number(data.silver) || 0,
          platinum: Number(data.platinum) || 0,
        })
        setScrapPercentages({
          gold: Number(data.scrapGoldPercentage) || DEFAULT_SCRAP_PERCENTAGE,
          silver: Number(data.scrapSilverPercentage) || DEFAULT_SCRAP_PERCENTAGE,
          platinum: Number(data.scrapPlatinumPercentage) || DEFAULT_SCRAP_PERCENTAGE,
        })
      })
      .catch(() => {
        setSpotPrices(null)
        setScrapPercentages(null)
      })
  }, [])

  useEffect(() => {
    if (!spotPrices) return
    setRows((prev) =>
      prev.map((row) => {
        if (row.spotPrice) return row
        const v =
          row.metal === "GOLD"
            ? spotPrices.gold
            : row.metal === "SILVER"
            ? spotPrices.silver
            : spotPrices.platinum
        return v ? { ...row, spotPrice: String(v) } : row
      }),
    )
  }, [spotPrices])

  function addRow() {
    const defaultMetal = "GOLD"
    const spot =
      spotPrices &&
      (defaultMetal === "GOLD"
        ? spotPrices.gold
        : defaultMetal === "SILVER"
          ? spotPrices.silver
          : spotPrices.platinum)
    setRows((r) => [
      ...r,
      {
        id: crypto.randomUUID(),
        date: todayStr(),
        metal: defaultMetal,
        purity: "",
        dwt: "",
        spotPrice: spot != null && spot > 0 ? String(spot) : "",
        pricePaid: "",
      },
    ])
  }

  function removeRow(id: string) {
    if (rows.length <= 1) return
    setRows((r) => r.filter((x) => x.id !== id))
  }

  function updateRow(id: string, field: keyof Row, value: string) {
    setRows((r) =>
      r.map((x) => {
        if (x.id !== id) return x
        if (field === "metal" && spotPrices) {
          const v =
            value === "GOLD"
              ? spotPrices.gold
              : value === "SILVER"
              ? spotPrices.silver
              : spotPrices.platinum
          return {
            ...x,
            metal: value,
            spotPrice: v ? String(v) : x.spotPrice,
          }
        }
        return { ...x, [field]: value }
      }),
    )
  }

  const totalDwt = rows.reduce((s, r) => s + (parseFloat(r.dwt) || 0), 0)
  const totalPaid = rows.reduce((s, r) => s + calculateRowScrapTotal(r, scrapPercentages), 0)

  function getPurityOptionsForMetal(metal: string): string[] {
    if (metal === "GOLD") return [...GOLD_PURITIES]
    if (metal === "SILVER") return [...SILVER_PURITIES]
    if (metal === "PLATINUM") return [...PLATINUM_PURITIES]
    return []
  }

  async function handleSave() {
    const valid = rows.every(
      (r) =>
        r.date &&
        r.metal &&
        r.purity.trim() !== "" &&
        r.dwt !== "" &&
        r.spotPrice !== "" &&
        !isNaN(parseFloat(r.dwt)) &&
        !isNaN(parseFloat(r.spotPrice)),
    )
    if (!valid) {
      toast({ title: "Fill all fields", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/stones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            rows: rows.map((r) => ({
              date: r.date,
              metal: r.metal,
              purity: r.purity.trim(),
              dwt: parseFloat(r.dwt) || 0,
              pricePaid: calculateRowScrapTotal(r, scrapPercentages),
              spotPrice: parseFloat(r.spotPrice) || 0,
            })),
        }),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: "Saved", description: "Stones table saved successfully." })
      setRows([
        { id: crypto.randomUUID(), date: todayStr(), metal: "GOLD", purity: "", dwt: "", spotPrice: "", pricePaid: "" },
      ])
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="relative overflow-hidden border-0 shadow-lg min-w-0">
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-500/10 flex items-center justify-center">
              <Gem className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Stones Table</CardTitle>
              <p className="text-sm text-muted-foreground">Record stone purchases by metal, purity, DWT and price paid</p>
            </div>
          </div>
          <Link href="/dashboard/stones-analytics">
            <Button variant="outline" size="sm">
              View Analytics / Report
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 space-y-4">
        <div
          className="overflow-x-auto rounded-md border [-webkit-overflow-scrolling:touch]"
          style={{ minHeight: 0 }}
        >
          <table className="w-full min-w-[760px] text-sm font-black table-fixed">
            <thead>
              <tr className="border-b bg-muted/50 text-red-600">
                <th className="w-14 min-w-0 p-2 text-center font-black lg:w-[16%]">Date</th>
                <th className="p-2 text-center font-black" style={{ width: "13%" }}>Metal</th>
                <th className="p-2 text-center font-black" style={{ width: "15%" }}>Purity</th>
                <th className="p-2 text-center font-black" style={{ width: "13%" }}>DWT</th>
                <th className="p-2 text-center font-black" style={{ width: "15%" }}>Spot price</th>
                <th className="p-2 pr-1 text-center font-black" style={{ width: "16%" }}>$ Price paid</th>
                <th className="p-0 text-center font-black w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="w-14 min-w-0 p-2 text-center align-middle overflow-visible lg:w-[16%]">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-10 flex-shrink-0 lg:hidden rounded-lg border border-input bg-background hover:bg-muted/60 text-foreground shadow-sm p-0"
                        onClick={() => {
                          const input = dateInputRefs.current[row.id]
                          if (input) {
                            const inputWithPicker = input as HTMLInputElement & { showPicker?: () => void }
                            if (typeof inputWithPicker.showPicker === "function") inputWithPicker.showPicker()
                            else input.click()
                          }
                        }}
                      >
                        <span className="sr-only">Change date</span>
                        {(() => {
                          const parts = getDateParts(row.date)
                          return (
                            <div className="flex h-7 w-8 flex-col overflow-hidden rounded-md border border-border bg-gradient-to-b from-muted/80 to-background leading-none">
                              <div
                                className={`flex h-[10px] w-full items-center justify-center bg-gradient-to-r ${getMonthAccentClasses(
                                  row.date,
                                )}`}
                              >
                                <span className="text-[8px] font-bold uppercase tracking-tight text-white drop-shadow-sm">
                                  {parts ? parts.month : "TOD"}
                                </span>
                              </div>
                              <div className="flex flex-1 min-h-0 items-center justify-center">
                                <span className="text-sm font-black tabular-nums leading-none">
                                  {parts ? parts.day : "—"}
                                </span>
                              </div>
                            </div>
                          )
                        })()}
                      </Button>
                      <Input
                        ref={(el) => {
                          dateInputRefs.current[row.id] = el
                        }}
                        type="date"
                        value={row.date}
                        onChange={(e) => updateRow(row.id, "date", e.target.value)}
                        className="h-9 text-center font-black w-full min-w-0 box-border text-[length:inherit] hidden lg:block"
                        style={{ minWidth: "9.5rem" }}
                      />
                    </div>
                  </td>
                  <td className="p-2 text-center align-middle">
                    <Select value={row.metal} onValueChange={(v) => updateRow(row.id, "metal", v)}>
                      <SelectTrigger className="h-9 text-center font-black w-full max-w-[100%] mx-auto justify-center box-border shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {METALS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m.charAt(0) + m.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 text-center align-middle">
                    <Select value={row.purity} onValueChange={(v) => updateRow(row.id, "purity", v)}>
                      <SelectTrigger className="h-9 text-center font-black w-full max-w-[100%] mx-auto justify-center box-border shrink-0">
                        <SelectValue placeholder="Purity" />
                      </SelectTrigger>
                      <SelectContent>
                        {getPurityOptionsForMetal(row.metal).map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 text-center align-middle">
                    <Input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={row.dwt}
                      onChange={(e) => updateRow(row.id, "dwt", e.target.value)}
                      className="h-9 text-center font-black w-full min-w-0 box-border"
                    />
                  </td>
                  <td className="p-2 text-center align-middle">
                    <Input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={row.spotPrice}
                      onChange={(e) => updateRow(row.id, "spotPrice", e.target.value)}
                      className="h-9 text-center font-black w-full min-w-0 box-border"
                    />
                  </td>
                  <td className="p-2 pr-1 text-center align-middle">
                    <span className="inline-flex h-9 min-h-9 items-center justify-center rounded-md border border-input bg-muted/50 px-2 font-black tabular-nums text-foreground">
                      ${calculateRowScrapTotal(row, scrapPercentages).toFixed(2)}
                    </span>
                  </td>
                  <td className="p-0 text-center align-middle w-12 shrink-0 overflow-visible">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 mx-auto -translate-x-[10px]"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length <= 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/30 font-black text-red-600">
                <td colSpan={3} className="p-2 text-center">
                  Total
                </td>
                <td className="p-2 text-center">{totalDwt.toFixed(2)}</td>
                <td className="p-2 pr-1 text-center">${totalPaid.toFixed(2)}</td>
                <td className="w-12 p-0" />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            className="border-2 border-cyan-500 text-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)] hover:bg-blue-500 hover:text-white hover:border-blue-500 hover:shadow-[0_0_12px_rgba(59,130,246,0.5)] active:bg-blue-600 active:text-white active:border-blue-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add row
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
