"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Scale, Coins, Sparkles } from "lucide-react"
import { getSocket } from "@/lib/socketClient"

type AdjustmentRow = {
  id: string
  createdAt: string
  type: "SCRAP" | "MELT"
  metalType: "GOLD" | "SILVER" | "PLATINUM"
  purityLabel: string | null
  dwt: number
  totalPaid: number
  refinerReceivedAmount: number | null
  status: "OPENED" | "CLOSED"
  refineryBatchId: string | null
}

type RefinerySettlementResponse = {
  batches: {
    batchId: string
    createdAt: string
    status: "OPENED" | "CLOSED"
    rows: AdjustmentRow[]
  }[]
  summaryByType: {
    SCRAP: { count: number; totalDwt: number; totalPaid: number }
    MELT: { count: number; totalDwt: number; totalPaid: number }
  }
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

export function RefinerySettlementClient() {
  const [data, setData] = useState<RefinerySettlementResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [receivedDraft, setReceivedDraft] = useState<Record<string, string>>({})
  const [receivedTouched, setReceivedTouched] = useState<Record<string, boolean>>({})

  const loadSettlement = useCallback(
    (opts?: { showSpinner?: boolean }) => {
      if (opts?.showSpinner) setLoading(true)
      fetch("/api/inventory/refinery-settlement", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed"))))
        .then((d) => setData(d))
        .catch(() => setData(null))
        .finally(() => {
          if (opts?.showSpinner) setLoading(false)
        })
    },
    [],
  )

  useEffect(() => {
    loadSettlement({ showSpinner: true })
  }, [loadSettlement])

  useEffect(() => {
    
    const socket = getSocket()
    const onAnyPrint = () => loadSettlement({ showSpinner: false })
    socket.on("transaction_printed", onAnyPrint)
    return () => socket.off("transaction_printed", onAnyPrint)
  }, [loadSettlement])

  useEffect(() => {
    const interval = setInterval(() => loadSettlement({ showSpinner: false }), 10000)
    return () => clearInterval(interval)
  }, [loadSettlement])

  const summary = data?.summaryByType
  const batches = data?.batches ?? []
  const rows = batches.flatMap((b) => b.rows)

  const scrapTotalDwt = summary?.SCRAP.totalDwt ?? 0
  const meltTotalDwt = summary?.MELT.totalDwt ?? 0
  const scrapTotalPaid = summary?.SCRAP.totalPaid ?? 0
  const meltTotalPaid = summary?.MELT.totalPaid ?? 0

  const totalDwt = scrapTotalDwt + meltTotalDwt
  const totalPaid = scrapTotalPaid + meltTotalPaid

  useEffect(() => {
    
    setReceivedDraft((prev) => {
      let changed = false
      const next = { ...prev }
      for (const r of rows) {
        if (next[r.id] != null) continue
        changed = true
        next[r.id] = r.refinerReceivedAmount == null ? "" : String(r.refinerReceivedAmount)
      }
      
      return changed ? next : prev
    })
  }, [rows])

  const parseReceived = (rowId: string) => {
    const raw = receivedDraft[rowId]
    if (raw == null || raw.trim() === "") return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Card className="border border-border/70 shadow-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <CardHeader className="border-b bg-slate-900/80">
          <CardTitle className="text-2xl font-extrabold tracking-wide text-slate-50 flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-emerald-300" />
            Refinery Settlement
          </CardTitle>
          <CardDescription className="text-slate-300">
            Shows all inventory adjustments created from the Quick payout calculators (Scrap + Melt).
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Total DWT</div>
                <div className="text-3xl font-black tabular-nums text-emerald-300 mt-2">{totalDwt.toFixed(2)} dwt</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Total Paid</div>
                <div className="text-2xl font-black tabular-nums text-amber-200 mt-2">{formatCurrency(totalPaid)}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <Scale className="h-4 w-4 text-emerald-300" /> Scrap
                </div>
                <div className="text-xl font-black tabular-nums text-emerald-300 mt-2">{summary?.SCRAP.count ?? 0} rows</div>
                <div className="text-sm text-slate-300 mt-1 tabular-nums">{scrapTotalDwt.toFixed(2)} dwt</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <Coins className="h-4 w-4 text-amber-300" /> Melt
                </div>
                <div className="text-xl font-black tabular-nums text-sky-300 mt-2">{summary?.MELT.count ?? 0} rows</div>
                <div className="text-sm text-slate-300 mt-1 tabular-nums">{meltTotalDwt.toFixed(2)} dwt</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-slate-800 shadow-2xl bg-transparent rounded-3xl overflow-hidden">
        <CardHeader className="border-b bg-slate-950/90 text-center">
          <CardTitle className="text-xl sm:text-2xl font-extrabold tracking-wide text-slate-50">Refinery transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {batches.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No refinery settlement rows yet.</div>
          ) : (
            <div className="space-y-6 p-4 bg-transparent">
              {batches.map((batch) => {
                const batchTypes = Array.from(new Set(batch.rows.map((x) => x.type)))
                const batchTypeLabel = batchTypes.length === 1 ? batchTypes[0] : "MIXED"

                return (
                <div
                  key={batch.batchId}
                  className={`rounded-3xl border bg-slate-950/85 p-4 ${
                    batch.status === "OPENED"
                      ? "border-yellow-400/80 shadow-[0_0_18px_rgba(250,204,21,0.55)]"
                      : "border-emerald-400/80 shadow-[0_0_18px_rgba(52,211,153,0.50)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-extrabold tracking-wide text-slate-50">
                        {batchTypeLabel}
                      </CardTitle>
                      <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        {formatDateTime(batch.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {batch.status === "OPENED" ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-[0.16em] bg-yellow-500/15 border border-yellow-500/50 text-yellow-200">
                          Opened
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-[0.16em] bg-emerald-500/15 border border-emerald-500/50 text-emerald-200">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-5">
                    {batch.rows.map((r) => {
                const received = parseReceived(r.id)
                
                
                const showProfitRow =
                  received != null && ((receivedTouched[r.id] ?? false) || r.status === "CLOSED")
                const profit = received == null ? null : received - r.totalPaid
                const profitText =
                  profit == null ? "—" : profit >= 0 ? `PROFIT ${formatCurrency(profit)}` : `LOSS ${formatCurrency(Math.abs(profit))}`
                const profitClass =
                  profit == null
                    ? "text-slate-300"
                    : profit >= 0
                      ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.55)]"
                      : "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.55)]"
                const profitBorderClass =
                  profit == null
                    ? "border-slate-700/60"
                    : profit >= 0
                      ? "border-emerald-500/65"
                      : "border-rose-500/65"
                const profitGradientClass =
                  profit == null
                    ? "bg-slate-950/35"
                    : profit >= 0
                      ? "bg-gradient-to-r from-emerald-500/35 via-slate-950/25 to-cyan-500/25"
                      : "bg-gradient-to-r from-rose-500/35 via-slate-950/25 to-red-500/25"
                const profitGlowClass =
                  profit == null
                    ? "shadow-none"
                    : profit >= 0
                      ? "shadow-[0_0_60px_rgba(16,185,129,0.4),0_0_30px_rgba(16,185,129,0.24)]"
                      : "shadow-[0_0_60px_rgba(244,63,94,0.4),0_0_30px_rgba(244,63,94,0.24)]"

                const profitDotClass =
                  profit == null
                    ? "bg-slate-400/60"
                    : profit >= 0
                      ? "bg-emerald-200 shadow-[0_0_28px_rgba(52,211,153,0.95)]"
                      : "bg-rose-200 shadow-[0_0_28px_rgba(251,113,133,0.95)]"

                return (
                  <div
                    key={r.id}
                    className={`rounded-3xl border bg-slate-950/70 overflow-hidden shadow-lg ${
                      r.status === "OPENED"
                        ? "border-yellow-400/80"
                        : "border-emerald-400/80"
                    }`}
                  >
                  <div className="p-4 bg-slate-900/70 flex items-start justify-between gap-3 flex-wrap w-full">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base font-black tracking-wide text-slate-50">
                            Transaction
                          </CardTitle>
                          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                            {formatDateTime(r.createdAt)}
                          </span>
                        </div>
                      </div>
                    <div className="flex items-center gap-2">
                      {r.status === "OPENED" ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-[0.16em] bg-yellow-500/15 border border-yellow-500/50 text-yellow-200">
                          Opened
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-[0.16em] bg-emerald-500/15 border border-emerald-500/50 text-emerald-200">
                          Completed
                        </span>
                      )}
                    </div>
                    </div>

                    <div className="hidden sm:block px-4 pb-4 border-t border-slate-800/60">
                      <table className="w-full table-fixed text-sm text-slate-100 text-center">
                        <colgroup>
                          <col style={{ width: "22%" }} />
                          <col style={{ width: "20%" }} />
                          <col style={{ width: "18%" }} />
                          <col style={{ width: "20%" }} />
                          <col style={{ width: "20%" }} />
                        </colgroup>
                        <thead className="bg-slate-900/95 text-slate-200">
                          <tr className="border-b border-slate-800">
                            <th className="py-3 px-1 text-[11px] font-black uppercase tracking-[0.16em]">Metal</th>
                            <th className="py-3 px-1 text-[11px] font-black uppercase tracking-[0.16em]">Purity</th>
                            <th className="py-3 px-1 text-[11px] font-black uppercase tracking-[0.16em]">Weight</th>
                            <th className="py-3 px-1 text-[11px] font-black uppercase tracking-[0.16em]">Paid</th>
                            <th className="py-3 px-1 text-[11px] font-black uppercase tracking-[0.16em]">Received</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-800/70 hover:bg-slate-900/30">
                            <td className="py-3 px-1 font-black min-w-0">{r.metalType}</td>
                            <td className="py-3 px-1 min-w-0">{r.purityLabel ?? "—"}</td>
                            <td className="py-3 px-1 tabular-nums min-w-0 font-black">{r.dwt.toFixed(2)}</td>
                            <td className="py-3 px-1 tabular-nums min-w-0 font-black">{formatCurrency(r.totalPaid)}</td>
                            <td className="py-3 px-1 min-w-0">
                              <div className="flex flex-col items-center gap-1 min-w-0">
                                <input
                                  className="w-full max-w-[5.4rem] h-9 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-100 text-center text-sm font-black [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:m-0"
                                  type="number"
                                  step="0.01"
                                  value={receivedDraft[r.id] ?? ""}
                                  disabled={r.status === "CLOSED"}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    setReceivedTouched((prev) => ({ ...prev, [r.id]: true }))
                                    setReceivedDraft((prev) => ({ ...prev, [r.id]: v }))
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {}
                    <div className="sm:hidden px-4 pb-4 border-t border-slate-800/60">
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
                        <div className="text-slate-400 font-black uppercase tracking-[0.14em] text-[11px]">Metal</div>
                        <div className="font-black text-slate-100">{r.metalType}</div>

                        <div className="text-slate-400 font-black uppercase tracking-[0.14em] text-[11px]">Purity</div>
                        <div className="font-black text-slate-100">{r.purityLabel ?? "—"}</div>

                        <div className="text-slate-400 font-black uppercase tracking-[0.14em] text-[11px]">Weight</div>
                        <div className="font-black tabular-nums text-slate-100">{r.dwt.toFixed(2)} dwt</div>

                        <div className="text-slate-400 font-black uppercase tracking-[0.14em] text-[11px]">Paid</div>
                        <div className="font-black tabular-nums text-slate-100">{formatCurrency(r.totalPaid)}</div>
                      </div>

                      <div className="mt-4">
                        <div className="text-slate-400 font-black uppercase tracking-[0.14em] text-[11px] text-center mb-2">
                          Received
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <input
                            className="w-full max-w-[14rem] h-9 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-100 text-center text-sm font-black [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:m-0"
                            type="number"
                            step="0.01"
                            value={receivedDraft[r.id] ?? ""}
                            disabled={r.status === "CLOSED"}
                            onChange={(e) => {
                              const v = e.target.value
                              setReceivedTouched((prev) => ({ ...prev, [r.id]: true }))
                              setReceivedDraft((prev) => ({ ...prev, [r.id]: v }))
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {}
                    <div
                      className={`transition-all duration-300 ease-out overflow-hidden ${
                        showProfitRow
                          ? "max-h-52 opacity-100 translate-y-0 blur-0 scale-100"
                          : "max-h-0 opacity-0 -translate-y-3 blur-[6px] scale-95 pointer-events-none"
                      }`}
                    >
                      <div className="px-4 pb-3 sm:px-6 sm:pb-4 border-t border-slate-800/60">
                        <div className="mt-3 flex items-center w-full gap-3">
                          <div className="flex-1 flex justify-center">
                            <div
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${profitBorderClass} ${profitGradientClass} ${profitGlowClass} backdrop-blur ring-1 ring-inset ring-white/5`}
                            >
                              <span className={`h-2.5 w-2.5 rounded-full ${profitDotClass} ${showProfitRow ? "animate-pulse" : ""}`} />
                              <span
                                className={`text-[12px] font-black uppercase tracking-[0.14em] break-words ${profitClass} text-center`}
                              >
                                {profitText}
                              </span>
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            {r.status === "OPENED" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-4 text-[11px] rounded-xl bg-white text-slate-900 font-black border-slate-400/70 transition-all duration-200 hover:scale-[1.02] hover:bg-white hover:text-blue-800 hover:border-blue-500 hover:shadow-[0_0_0_2px_rgba(59,130,246,0.35),0_0_18px_rgba(59,130,246,0.22)] dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600/80 dark:hover:bg-cyan-400/20 dark:hover:border-cyan-300/90 dark:hover:text-cyan-100 dark:hover:shadow-[0_0_24px_rgba(34,211,238,0.75)]"
                                onClick={async () => {
                                  const received = parseReceived(r.id)
                                  const res = await fetch("/api/inventory/refinery-settlement/update", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      updates: [{ id: r.id, refinerReceivedAmount: received }],
                                    }),
                                    credentials: "include",
                                  })
                                  if (!res.ok) {
                                    const j = await res.json().catch(() => null)
                                    window.alert(j?.message || "Failed to save received amount.")
                                    return
                                  }
                                  await loadSettlement({ showSpinner: false })
                                }}
                              >
                                Save
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
                  </div>

                  {}
                  <div
                    className={`transition-all duration-300 ease-out overflow-hidden ${
                      batch.rows.some((x) => x.status === "CLOSED")
                        ? "max-h-24 opacity-100 translate-y-0"
                        : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
                    }`}
                  >
                    {(() => {
                      const completed = batch.rows.filter((x) => x.status === "CLOSED")
                      if (completed.length === 0) return null

                      const batchPaid = completed.reduce((acc, x) => acc + x.totalPaid, 0)
                      const batchReceived = completed.reduce((acc, x) => acc + (x.refinerReceivedAmount ?? 0), 0)
                      const profit = batchReceived - batchPaid

                      const profitText =
                        profit >= 0 ? `PROFIT ${formatCurrency(profit)}` : `LOSS ${formatCurrency(Math.abs(profit))}`
                      const profitClass = profit >= 0 ? "text-emerald-400" : "text-red-500"

                      return (
                        <div
                          className={`mt-4 mx-2 rounded-2xl border bg-slate-950/25 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                            profit >= 0
                              ? "border-emerald-400/90"
                              : "border-rose-400/90"
                          }`}
                        >
                          <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                            Batch totals
                            <div className="mt-1 text-[13px] font-black tracking-[0.06em] text-slate-100 flex gap-4 flex-wrap">
                              <span className="text-amber-300">
                                Paid:{" "}
                                <span className="text-amber-300">{formatCurrency(batchPaid)}</span>
                              </span>
                              <span
                                className={
                                  batchReceived > batchPaid
                                    ? "text-emerald-300"
                                    : "text-red-500"
                                }
                              >
                                Received:{" "}
                                <span
                                  className={batchReceived > batchPaid ? "text-emerald-300" : "text-red-500"}
                                >
                                  {formatCurrency(batchReceived)}
                                </span>
                              </span>
                            </div>
                          </div>

                          <div className={`text-[16px] sm:text-[18px] leading-[1.3] font-black uppercase tracking-[0.14em] ${profitClass}`}>
                            {profitText}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )})}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

