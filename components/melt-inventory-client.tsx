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
import { Loader2, Scale, Coins, Droplets, Gem, CircleDollarSign } from "lucide-react"
import { getSocket } from "@/lib/socketClient"
import { sortPuritiesAsc } from "@/lib/purity"

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

type MetalKey = "GOLD" | "SILVER" | "PLATINUM"

const METALS: MetalKey[] = ["GOLD", "SILVER", "PLATINUM"]

const metalIcon: Record<string, JSX.Element> = {
  GOLD: <CircleDollarSign className="h-5 w-5 text-amber-400" />,
  SILVER: <Droplets className="h-5 w-5 text-sky-300" />,
  PLATINUM: <Gem className="h-5 w-5 text-violet-300" />,
}

export function MeltInventoryClient() {
  const [data, setData] = useState<InventoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [weightByMetal, setWeightByMetal] = useState<Record<MetalKey, string>>({
    GOLD: "",
    SILVER: "",
    PLATINUM: "",
  })

  const loadInventory = useCallback(
    (opts?: { showSpinner?: boolean }) => {
      if (opts?.showSpinner) {
        setLoading(true)
      }
      fetch("/api/inventory/melt", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed"))))
        .then((d) => setData(d))
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
    return sortPuritiesAsc(labels)
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

  const grandTotalWeight = METALS.reduce((sum, metalKey) => {
    const rawWeight = weightByMetal[metalKey]?.trim()
    const weight = rawWeight ? Number(rawWeight) : 0
    if (!weight || Number.isNaN(weight)) return sum
    const maxAvailable = getMaxAvailableDwt(metalKey, "ALL")
    const isOver = maxAvailable > 0 && weight > maxAvailable
    if (isOver) return sum
    return sum + weight
  }, 0)

  const grandTotalPaid = METALS.reduce((sum, metalKey) => {
    const rawWeight = weightByMetal[metalKey]?.trim()
    const weight = rawWeight ? Number(rawWeight) : 0
    if (!weight || Number.isNaN(weight)) return sum
    const maxAvailable = getMaxAvailableDwt(metalKey, "ALL")
    const isOver = maxAvailable > 0 && weight > maxAvailable
    if (isOver) return sum
    const avg = getAveragePricePerDwt(metalKey, "ALL")
    if (!avg) return sum
    return sum + weight * avg
  }, 0)

  const metalsWithValidWeight = METALS.filter((metalKey) => {
    const rawWeight = weightByMetal[metalKey]?.trim()
    const weight = rawWeight ? Number(rawWeight) : 0
    if (!weight || Number.isNaN(weight)) return false
    const maxAvailable = getMaxAvailableDwt(metalKey, "ALL")
    const isOver = maxAvailable > 0 && weight > maxAvailable
    return !isOver
  })

  let grandTotalMetalsLabel = "All metals"
  if (metalsWithValidWeight.length === 1) {
    grandTotalMetalsLabel = metalsWithValidWeight[0]
  } else if (metalsWithValidWeight.length === 2) {
    grandTotalMetalsLabel = `${metalsWithValidWeight[0]} & ${metalsWithValidWeight[1]}`
  } else if (metalsWithValidWeight.length === 0) {
    grandTotalMetalsLabel = "No metals"
  }

  const handleCreateInventoryAdjustment = async () => {
    if (!data) return
    const batchId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `batch-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const rows = METALS.flatMap((metalKey) => {
      const rawWeight = weightByMetal[metalKey]?.trim()
      const weight = rawWeight ? Number(rawWeight) : 0
      if (!weight || Number.isNaN(weight)) return []
      const maxAvailable = getMaxAvailableDwt(metalKey, "ALL")
      if (maxAvailable > 0 && weight > maxAvailable) return []
      const avg = getAveragePricePerDwt(metalKey, "ALL")
      if (!avg) return []
      return [{ metal: metalKey, weight, pricePaid: weight * avg }]
    })
    if (rows.length === 0) return
    try {
      setCreating(true)
      const res = await fetch("/api/inventory/melt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, rows }),
        credentials: "include",
      })
      if (!res.ok) return
      setWeightByMetal({ GOLD: "", SILVER: "", PLATINUM: "" })
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
            Melt inventory
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
              No printed MELT transactions yet. Once you complete and print melt tickets, they will appear here.
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
                      <span className="font-semibold tabular-nums text-sky-300">
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
              Quick melt payout calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {}
            <div className="sm:hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
              <div className="space-y-3">
                {METALS.map((metalKey) => {
                  const purityOptions = getPurityOptionsForMetal(metalKey)
                  const puritySelection: "ALL" = "ALL"
                  const rawWeight = weightByMetal[metalKey]?.trim()
                  const weight = rawWeight ? Number(rawWeight) : 0
                  const maxAvailable = getMaxAvailableDwt(metalKey, puritySelection)
                  const isOver = maxAvailable > 0 && !!weight && !Number.isNaN(weight) && weight > maxAvailable
                  const avgForSelection = getAveragePricePerDwt(metalKey, puritySelection)
                  const pricePaid =
                    !isOver && !!weight && !Number.isNaN(weight) && avgForSelection > 0 ? weight * avgForSelection : 0
                  const hasData = purityOptions.length > 0

                  return (
                    <div key={metalKey} className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-slate-100 font-semibold">
                          {metalIcon[metalKey] ?? <Scale className="h-4 w-4" />}
                          <span className="text-sm">{metalKey}</span>
                        </div>
                        <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-300">
                          Price paid
                        </div>
                      </div>

                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div className="flex flex-col items-center gap-1 font-extrabold min-w-0">
                          <Label className="sr-only">Weight</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={weightByMetal[metalKey] ?? ""}
                            onChange={(e) =>
                              setWeightByMetal((prev) => ({
                                ...prev,
                                [metalKey]: e.target.value,
                              }))
                            }
                            className={`w-full max-w-[7.2rem] h-9 rounded-xl bg-slate-900 text-center text-sm text-slate-100 placeholder:text-slate-500 border ${
                              isOver ? "border-red-500" : "border-slate-700"
                            }`}
                            disabled={!hasData}
                          />
                          {isOver && (
                            <p className="text-[11px] text-red-400 max-w-[10rem] text-right">
                              Exceeds available {maxAvailable.toFixed(2)} dwt in inventory.
                            </p>
                          )}
                        </div>

                        <div className="text-sm font-extrabold tabular-nums text-amber-300 text-right min-w-0">
                          {pricePaid > 0 ? formatCurrency(pricePaid) : "—"}
                        </div>
                      </div>
                    </div>
                  )
                })}

                <div className="pt-3 border-t border-slate-700">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-300">
                    Grand total
                  </div>
                  <div className="text-slate-400 text-xs mt-1">
                    {grandTotalMetalsLabel !== "No metals" ? grandTotalMetalsLabel : ""}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm font-semibold tabular-nums text-sky-300">
                      {grandTotalWeight > 0 ? `${grandTotalWeight.toFixed(2)} dwt` : "—"}
                    </div>
                    <div className="text-base font-black tabular-nums text-amber-200">
                      {grandTotalPaid > 0 ? formatCurrency(grandTotalPaid) : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80">
              <table className="w-full table-fixed text-sm text-slate-100 text-center">
                <thead className="bg-slate-900/95">
                  <tr className="border-b border-slate-800 text-slate-200">
                    <th className="py-3 px-2 text-[11px] font-extrabold uppercase tracking-[0.16em]">Metal</th>
                    <th className="py-3 px-2 text-[11px] font-extrabold uppercase tracking-[0.16em]">Weight (dwt)</th>
                    <th className="py-3 px-2 text-[11px] font-extrabold uppercase tracking-[0.16em]">Price paid</th>
                  </tr>
                </thead>
                <tbody>
                  {METALS.map((metalKey) => {
                    const purityOptions = getPurityOptionsForMetal(metalKey)
                    const puritySelection: "ALL" = "ALL"
                    const rawWeight = weightByMetal[metalKey]?.trim()
                    const weight = rawWeight ? Number(rawWeight) : 0
                    const maxAvailable = getMaxAvailableDwt(metalKey, puritySelection)
                    const isOver = maxAvailable > 0 && !!weight && !Number.isNaN(weight) && weight > maxAvailable
                    const avgForSelection = getAveragePricePerDwt(metalKey, puritySelection)
                    const pricePaid =
                      !isOver && !!weight && !Number.isNaN(weight) && avgForSelection > 0 ? weight * avgForSelection : 0
                    const hasData = purityOptions.length > 0

                    return (
                      <tr key={metalKey} className="border-t border-slate-800/80">
                        <td className="py-3 px-2 align-middle min-w-0">
                          <div className="flex items-center justify-center gap-2 text-slate-100 font-semibold">
                            {metalIcon[metalKey] ?? <Scale className="h-4 w-4" />}
                            <span>{metalKey}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 align-middle min-w-0">
                          <div className="inline-flex flex-col items-center gap-1 font-extrabold min-w-0">
                            <Label className="sr-only">Weight</Label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              value={weightByMetal[metalKey] ?? ""}
                              onChange={(e) =>
                                setWeightByMetal((prev) => ({
                                  ...prev,
                                  [metalKey]: e.target.value,
                                }))
                              }
                              className={`w-full max-w-[7.2rem] h-9 rounded-xl bg-slate-900 text-center text-sm text-slate-100 placeholder:text-slate-500 border ${
                                isOver ? "border-red-500" : "border-slate-700"
                              }`}
                              disabled={!hasData}
                            />
                            {isOver && (
                              <p className="text-[11px] text-red-400 max-w-[10rem] text-right">
                                Exceeds available {maxAvailable.toFixed(2)} dwt in inventory.
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 align-middle min-w-0">
                          <div className="text-sm font-extrabold tabular-nums text-amber-300">
                            {pricePaid > 0 ? formatCurrency(pricePaid) : "—"}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="border-t border-slate-700 bg-slate-900/80">
                    <td className="py-3 px-2 align-middle">
                      <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-300">
                        Grand total
                      </div>
                      <div className="text-slate-400 text-xs mt-1">
                        {grandTotalMetalsLabel !== "No metals" ? grandTotalMetalsLabel : ""}
                      </div>
                    </td>
                    <td className="py-3 px-2 align-middle">
                      <div className="text-sm font-semibold tabular-nums text-sky-300">
                        {grandTotalWeight > 0 ? `${grandTotalWeight.toFixed(2)} dwt` : "—"}
                      </div>
                    </td>
                    <td className="py-3 px-2 align-middle">
                      <div className="text-base font-black tabular-nums text-amber-200">
                        {grandTotalPaid > 0 ? formatCurrency(grandTotalPaid) : "—"}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                size="lg"
                disabled={creating || metalsWithValidWeight.length === 0}
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
                        {metalKey} melt inventory
                      </span>
                    </CardTitle>
                  </div>
                  <div className="text-right text-xs space-y-1">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 border border-sky-500/70 shadow-sm">
                      <span className="text-sky-300 text-[11px] uppercase tracking-wide">Total DWT</span>
                      <span className="font-extrabold tabular-nums text-2xl text-sky-200">
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
                        className="group rounded-2xl border border-slate-800 bg-slate-950 hover:border-sky-400 hover:shadow-xl transition-all duration-200 overflow-hidden"
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
                            <span className="tabular-nums text-2xl font-extrabold text-sky-300">
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

