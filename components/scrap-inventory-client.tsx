"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { Loader2, Scale, Coins, Droplets, Gem, CircleDollarSign, Plus, Trash2 } from "lucide-react"
import { getSocket } from "@/lib/socketClient"

type InventoryRow = {
  metal: string
  purityLabel: string
  totalDwt: number
  totalPaid: number
  avgPricePerDwt: number
  lastUpdatedAt: string | null
}

type InventoryResponse = {
  type: "SCRAP" | "MELT"
  summaryByMetal: Record<string, { totalDwt: number; totalPaid: number }>
  rows: InventoryRow[]
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function formatDate(d: string | null) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" })
}

type MetalKey = "GOLD" | "SILVER" | "PLATINUM"

const METALS: MetalKey[] = ["GOLD", "SILVER", "PLATINUM"]

type CalculatorRowInput = {
  id: string
  purity: string
  weight: string
}

function makeRowId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `row-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createEmptyCalculatorRow(): CalculatorRowInput {
  return { id: makeRowId(), purity: "ALL", weight: "" }
}

const metalIcon: Record<string, JSX.Element> = {
  GOLD: <CircleDollarSign className="h-5 w-5 text-amber-500" />,
  SILVER: <Droplets className="h-5 w-5 text-slate-400" />,
  PLATINUM: <Gem className="h-5 w-5 text-slate-300" />,
}

export function ScrapInventoryClient() {
  const [data, setData] = useState<InventoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null)
  const [calculatorRowsByMetal, setCalculatorRowsByMetal] = useState<Record<MetalKey, CalculatorRowInput[]>>({
    GOLD: [createEmptyCalculatorRow()],
    SILVER: [createEmptyCalculatorRow()],
    PLATINUM: [createEmptyCalculatorRow()],
  })

  const loadInventory = useCallback(
    (opts?: { showSpinner?: boolean }) => {
      if (opts?.showSpinner) {
        setLoading(true)
      }
      fetch("/api/inventory/scrap", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed"))))
        .then((d) => {
          setData(d)
          setLastRefreshAt(new Date())
        })
        .catch(() => setData(null))
        .finally(() => {
          if (opts?.showSpinner) {
            setLoading(false)
          }
        })
    },
    [],
  )

  
  useEffect(() => {
    loadInventory({ showSpinner: true })
  }, [loadInventory])

  
  useEffect(() => {
    const socket = getSocket()
    const onPrinted = () => {
      loadInventory({ showSpinner: false })
    }
    socket.on("transaction_printed", onPrinted)
    return () => {
      socket.off("transaction_printed", onPrinted)
    }
  }, [loadInventory])

  
  useEffect(() => {
    const interval = setInterval(() => {
      loadInventory({ showSpinner: false })
    }, 8000) 
    return () => clearInterval(interval)
  }, [loadInventory])

  const metals = data ? Object.entries(data.summaryByMetal) : []

  const getPurityOptionsForMetal = (metalKey: MetalKey) => {
    if (!data) return []
    const labels = Array.from(
      new Set(
        data.rows.filter((r) => r.metal === metalKey).map((r) => r.purityLabel),
      ),
    )
    return labels.sort()
  }

  const getAveragePricePerDwt = (metalKey: MetalKey, purityLabel: string | "ALL") => {
    if (!data) return 0
    const rows = data.rows.filter(
      (r) => r.metal === metalKey && (purityLabel === "ALL" || r.purityLabel === purityLabel),
    )
    if (!rows.length) return 0
    const totalDwt = rows.reduce((sum, r) => sum + r.totalDwt, 0)
    const totalPaid = rows.reduce((sum, r) => sum + r.totalPaid, 0)
    if (!totalDwt) return 0
    return totalPaid / totalDwt
  }

  const getMaxAvailableDwt = (metalKey: MetalKey, purityLabel: string | "ALL") => {
    if (!data) return 0
    if (purityLabel === "ALL") {
      return data.summaryByMetal[metalKey]?.totalDwt ?? 0
    }
    const rows = data.rows.filter((r) => r.metal === metalKey && r.purityLabel === purityLabel)
    if (!rows.length) return 0
    return rows.reduce((sum, r) => sum + r.totalDwt, 0)
  }

  const updateCalculatorRow = useCallback(
    (metalKey: MetalKey, rowId: string, patch: Partial<CalculatorRowInput>) => {
      setCalculatorRowsByMetal((prev) => ({
        ...prev,
        [metalKey]: (prev[metalKey] ?? []).map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
      }))
    },
    [],
  )

  const addCalculatorRow = useCallback((metalKey: MetalKey) => {
    setCalculatorRowsByMetal((prev) => ({
      ...prev,
      [metalKey]: [...(prev[metalKey] ?? []), createEmptyCalculatorRow()],
    }))
  }, [])

  const removeCalculatorRow = useCallback((metalKey: MetalKey, rowId: string) => {
    setCalculatorRowsByMetal((prev) => {
      const kept = (prev[metalKey] ?? []).filter((row) => row.id !== rowId)
      return {
        ...prev,
        [metalKey]: kept.length > 0 ? kept : [createEmptyCalculatorRow()],
      }
    })
  }, [])

  const calculatorRows = METALS.flatMap((metalKey) => {
    const rows = calculatorRowsByMetal[metalKey] ?? []
    return rows.map((row) => {
      const purity = (row.purity || "ALL") as string | "ALL"
      const rawWeight = row.weight.trim()
      const weight = rawWeight ? Number(rawWeight) : 0
      const hasNumericWeight = !!weight && !Number.isNaN(weight)
      const maxAvailable = getMaxAvailableDwt(metalKey, purity)
      const hasData = getPurityOptionsForMetal(metalKey).length > 0
      const isOver = maxAvailable > 0 && hasNumericWeight && weight > maxAvailable
      const avgForSelection = getAveragePricePerDwt(metalKey, purity)
      const pricePaid = !isOver && hasNumericWeight && avgForSelection > 0 ? weight * avgForSelection : 0
      const isCreatable = hasData && purity !== "ALL" && hasNumericWeight && !isOver && avgForSelection > 0
      return {
        metalKey,
        row,
        purity,
        weight,
        hasNumericWeight,
        maxAvailable,
        hasData,
        isOver,
        avgForSelection,
        pricePaid,
        isCreatable,
      }
    })
  })

  const grandTotalWeight = calculatorRows.reduce((sum, row) => {
    if (!row.isCreatable) return sum
    return sum + row.weight
  }, 0)

  const grandTotalPaid = calculatorRows.reduce((sum, row) => {
    if (!row.isCreatable) return sum
    return sum + row.pricePaid
  }, 0)

  const metalsWithValidWeight = Array.from(
    new Set(calculatorRows.filter((row) => row.isCreatable).map((row) => row.metalKey)),
  )

  let grandTotalMetalsLabel = "All metals"
  if (metalsWithValidWeight.length === 1) {
    grandTotalMetalsLabel = metalsWithValidWeight[0]
  } else if (metalsWithValidWeight.length === 2) {
    grandTotalMetalsLabel = `${metalsWithValidWeight[0]} & ${metalsWithValidWeight[1]}`
  } else if (metalsWithValidWeight.length === 0) {
    grandTotalMetalsLabel = "No metals"
  }

  const scrapCreatableCount = calculatorRows.filter((row) => row.isCreatable).length

  const handleCreateInventoryAdjustment = async () => {
    if (!data) return
    const batchId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `batch-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const rows = calculatorRows
      .filter((row) => row.isCreatable)
      .map((row) => ({
        metal: row.metalKey,
        purityLabel: row.purity,
        weight: row.weight,
        pricePaid: row.pricePaid,
      }))
    if (rows.length === 0) return
    try {
      setCreating(true)
      const res = await fetch("/api/inventory/scrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, rows }),
        credentials: "include",
      })
      if (!res.ok) return
      setCalculatorRowsByMetal({
        GOLD: [createEmptyCalculatorRow()],
        SILVER: [createEmptyCalculatorRow()],
        PLATINUM: [createEmptyCalculatorRow()],
      })
      loadInventory({ showSpinner: true })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Card className="border border-border/70 shadow-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <CardHeader className="border-b bg-slate-900/80">
          <CardTitle className="text-2xl font-extrabold tracking-wide text-slate-50">
            Scrap inventory
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && data && metals.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No printed SCRAP transactions yet. Once you complete and print scrap tickets, they will appear here.
            </p>
          )}
          {!loading && data && metals.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              {metals.map(([metal, s]) => (
                <Card
                  key={metal}
                  className="border border-slate-700 shadow-md bg-slate-900/80 rounded-2xl overflow-hidden"
                >
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {metalIcon[metal] ?? <Scale className="h-5 w-5" />}
                        <span className="font-semibold text-slate-50">{metal}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Scale className="h-4 w-4" /> Total weight
                      </span>
                      <span className="font-semibold tabular-nums text-emerald-300">
                        {s.totalDwt.toFixed(2)} dwt
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Coins className="h-4 w-4" /> Price paid
                      </span>
                      <span className="font-semibold tabular-nums text-amber-300">
                        {formatCurrency(s.totalPaid)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && data && (
        <Card className="border border-slate-800 shadow-2xl bg-slate-950/90 rounded-3xl overflow-hidden">
          <CardHeader className="border-b bg-slate-950/90">
            <CardTitle className="text-lg font-extrabold tracking-wide text-slate-50">
              Quick scrap payout calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80">
              <table className="w-full table-fixed text-sm text-slate-100 text-center">
                <thead className="bg-slate-900/95">
                  <tr className="border-b border-slate-800 text-slate-200">
                    <th className="w-[22.5%] py-3 px-4 text-[11px] font-extrabold uppercase tracking-[0.16em]">
                      Metal
                    </th>
                    <th className="w-[22.5%] py-3 px-4 text-[11px] font-extrabold uppercase tracking-[0.16em]">
                      Purity
                    </th>
                    <th className="w-[22.5%] py-3 px-4 text-[11px] font-extrabold uppercase tracking-[0.16em]">
                      Weight (dwt)
                    </th>
                    <th className="w-[22.5%] py-3 px-4 text-[11px] font-extrabold uppercase tracking-[0.16em]">
                      Price paid
                    </th>
                    <th className="w-[10%] py-3 px-4 text-[11px] font-extrabold uppercase tracking-[0.16em]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {METALS.map((metalKey) => {
                    const purityOptions = getPurityOptionsForMetal(metalKey)
                    const hasData = purityOptions.length > 0
                    const rowsForMetal = calculatorRowsByMetal[metalKey] ?? [createEmptyCalculatorRow()]
                    return (
                      rowsForMetal.map((row, index) => {
                        const puritySelection = (row.purity || "ALL") as string | "ALL"
                        const rawWeight = row.weight.trim()
                        const weight = rawWeight ? Number(rawWeight) : 0
                        const maxAvailable = getMaxAvailableDwt(metalKey, puritySelection)
                        const isOver =
                          maxAvailable > 0 && !!weight && !Number.isNaN(weight) && weight > maxAvailable
                        const avgForSelection = getAveragePricePerDwt(metalKey, puritySelection)
                        const pricePaid =
                          !isOver && !!weight && !Number.isNaN(weight) && avgForSelection > 0
                            ? weight * avgForSelection
                            : 0

                        return (
                          <tr key={row.id} className="border-t border-slate-800/80">
                            <td className="py-3 px-4 align-middle">
                              <div className="flex items-center justify-center gap-2 text-slate-100 font-semibold">
                                {metalIcon[metalKey] ?? <Scale className="h-4 w-4" />}
                                <span>{metalKey}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 align-middle">
                              {hasData ? (
                                <div className="space-y-1 font-extrabold flex justify-center">
                                  <Label className="sr-only">Purity</Label>
                                  <Select
                                    value={row.purity || "ALL"}
                                    onValueChange={(value) =>
                                      updateCalculatorRow(metalKey, row.id, {
                                        purity: value,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="w-[160px] h-9 rounded-xl border-slate-700 bg-slate-900 text-xs text-slate-100 font-extrabold justify-center text-center">
                                      <SelectValue placeholder="Select purity" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl bg-slate-900 border-slate-700 text-slate-100 font-extrabold">
                                      <SelectItem
                                        value="ALL"
                                        className="text-slate-100 data-[highlighted]:bg-slate-700 data-[highlighted]:text-slate-100 data-[state=checked]:bg-slate-700 data-[state=checked]:text-slate-100"
                                      >
                                        All purities
                                      </SelectItem>
                                      {purityOptions.map((label) => (
                                        <SelectItem
                                          key={label}
                                          value={label}
                                          className="text-slate-100 data-[highlighted]:bg-slate-700 data-[highlighted]:text-slate-100 data-[state=checked]:bg-slate-700 data-[state=checked]:text-slate-100"
                                        >
                                          {label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500">No scrap data yet</p>
                              )}
                            </td>
                            <td className="py-3 px-4 align-middle">
                              <div className="inline-flex flex-col items-center gap-1 font-extrabold">
                                <Label className="sr-only">Weight</Label>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.01"
                                  min="0"
                                  value={row.weight}
                                  onChange={(e) =>
                                    updateCalculatorRow(metalKey, row.id, {
                                      weight: e.target.value,
                                    })
                                  }
                                  className={`w-28 h-9 rounded-xl bg-slate-900 text-center text-sm text-slate-100 placeholder:text-slate-500 border ${
                                    isOver ? "border-red-500" : "border-slate-700"
                                  }`}
                                  disabled={!hasData}
                                />
                                {isOver && (
                                  <p className="text-[11px] text-red-400 max-w-[10rem] text-center">
                                    Exceeds available {maxAvailable.toFixed(2)} dwt in inventory.
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 align-middle">
                              <div className="text-sm font-extrabold tabular-nums text-emerald-300">
                                {pricePaid > 0 ? formatCurrency(pricePaid) : "—"}
                              </div>
                            </td>
                            <td className="py-3 px-4 align-middle">
                              <div className="flex items-center justify-center gap-2">
                                {index === 0 ? (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 rounded-lg border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800"
                                    onClick={() => addCalculatorRow(metalKey)}
                                    disabled={!hasData}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span className="sr-only">Add row</span>
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 rounded-lg border-red-500/60 bg-red-950/30 text-red-300 hover:bg-red-900/50"
                                    onClick={() => removeCalculatorRow(metalKey, row.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span className="sr-only">Delete row</span>
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )
                  })}
                  <tr className="border-t border-slate-700 bg-slate-900/80">
                    <td className="py-3 px-4 align-middle" colSpan={3}>
                      <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-300">
                        Grand total
                      </div>
                      <div className="text-slate-400 text-xs mt-1">
                        {grandTotalMetalsLabel !== "No metals" ? grandTotalMetalsLabel : ""}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="text-sm font-semibold tabular-nums text-emerald-300 text-center">
                        {grandTotalWeight > 0 ? `${grandTotalWeight.toFixed(2)} dwt` : "—"}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="text-base font-black tabular-nums text-amber-200 text-center">
                        {grandTotalPaid > 0 ? formatCurrency(grandTotalPaid) : "—"}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle text-slate-500 text-xs">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                size="lg"
                disabled={creating || scrapCreatableCount === 0}
                onClick={handleCreateInventoryAdjustment}
              >
                {creating ? "Creating…" : "Create transaction"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && data && (
        <div className="space-y-6">
          {(["GOLD", "SILVER", "PLATINUM"] as const).map((metalKey) => {
            const metalRows = data.rows.filter((r) => r.metal === metalKey)
            if (metalRows.length === 0) return null
            const headerIcon = metalIcon[metalKey] ?? <Scale className="h-6 w-6" />
            const accent =
              metalKey === "GOLD"
                ? "from-amber-500/30 via-amber-600/40"
                : metalKey === "SILVER"
                  ? "from-sky-500/25 via-sky-600/40"
                  : "from-violet-500/25 via-violet-600/40"

            return (
              <Card
                key={metalKey}
                className={`border border-slate-800 shadow-2xl bg-gradient-to-br ${accent} to-slate-950 rounded-3xl overflow-hidden`}
              >
                <CardHeader className="border-b bg-slate-950/80 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-extrabold flex items-center gap-3 tracking-wide text-slate-50">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 shadow-md">
                        {headerIcon}
                      </span>
                      <span className="tracking-wide uppercase text-sm">
                        {metalKey} inventory
                      </span>
                    </CardTitle>
                  </div>
                  <div className="text-right text-xs space-y-1">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 border border-emerald-500/70 shadow-sm">
                      <span className="text-emerald-300 text-[11px] uppercase tracking-wide">Total DWT</span>
                      <span className="font-extrabold tabular-nums text-2xl text-emerald-200">
                        {(data.summaryByMetal[metalKey]?.totalDwt ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 border border-amber-500/70 shadow-sm">
                      <span className="text-amber-300 text-[11px] uppercase tracking-wide">Total paid</span>
                      <span className="font-extrabold tabular-nums text-xl text-amber-200">
                        {formatCurrency(data.summaryByMetal[metalKey]?.totalPaid ?? 0)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {metalRows.map((row) => (
                      <div
                        key={`${row.metal}-${row.purityLabel}`}
                        className="group rounded-2xl border border-slate-800 bg-slate-950 hover:border-primary hover:shadow-xl transition-all duration-200 overflow-hidden"
                      >
                        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3 flex items-center justify-between">
                          <span className="text-sm font-extrabold tracking-wide uppercase text-slate-50">
                            {row.purityLabel}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 tracking-wide uppercase">
                            Purity
                          </span>
                        </div>
                        <div className="px-4 py-3 space-y-3 bg-slate-950">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="uppercase tracking-wide">Total weight</span>
                            <span className="tabular-nums text-2xl font-extrabold text-emerald-300">
                              {row.totalDwt.toFixed(2)} dwt
                            </span>
                          </div>
                          <div className="h-px bg-border/60" />
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="uppercase tracking-wide">Price paid</span>
                            <span className="tabular-nums text-xl font-extrabold text-amber-300">
                              {formatCurrency(row.totalPaid)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

