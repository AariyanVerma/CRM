"use client"

import { useState, useEffect, Fragment } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, TableIcon, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react"
import { GOLD_PURITIES, SILVER_PURITIES, PLATINUM_PURITIES } from "@/lib/pricing"

type StonesSave = { id: string; createdAt: string; rows: { id: string; date: string; metal: string; purity: string; dwt: number; pricePaid: number }[] }
type StonesRow = { id: string; date: string; metal: string; purity: string; dwt: number; pricePaid: number; stonesSave: { id: string; createdAt: string } }
type RowSnapshot = { date: string; metal: string; purity: string; dwt: number; pricePaid: number }
type StonesReport = { id: string; createdAt: string; periodType: string; periodStart: string; periodEnd: string; totalPaid: number; grandTotal: number; profit: number; selectedRowIds?: string | null; selectedRowsData?: RowSnapshot[] | null }

const PERIODS = [
  { value: "DAY", label: "Today" },
  { value: "WEEK", label: "Last 7 days" },
  { value: "MONTH", label: "This month" },
  { value: "SIX_MONTHS", label: "Last 6 months" },
  { value: "YEAR", label: "This year" },
  { value: "ALL_TIME", label: "All time" },
] as const

function getRange(period: string): { from: Date; to: Date } {
  const to = new Date()
  to.setHours(23, 59, 59, 999)
  const from = new Date()
  if (period === "ALL_TIME") {
    from.setFullYear(2000, 0, 1)
    from.setHours(0, 0, 0, 0)
    return { from, to }
  }
  if (period === "DAY") {
    from.setHours(0, 0, 0, 0)
    return { from, to }
  }
  if (period === "WEEK") {
    from.setDate(from.getDate() - 6)
    from.setHours(0, 0, 0, 0)
    return { from, to }
  }
  if (period === "MONTH") {
    from.setDate(1)
    from.setHours(0, 0, 0, 0)
    return { from, to }
  }
  if (period === "SIX_MONTHS") {
    from.setMonth(from.getMonth() - 5)
    from.setDate(1)
    from.setHours(0, 0, 0, 0)
    return { from, to }
  }
  if (period === "YEAR") {
    from.setMonth(0, 1)
    from.setHours(0, 0, 0, 0)
    return { from, to }
  }
  from.setHours(0, 0, 0, 0)
  return { from, to }
}

function getPurityOptionsForMetal(metal: string): string[] {
  if (metal === "GOLD") return [...GOLD_PURITIES]
  if (metal === "SILVER") return [...SILVER_PURITIES]
  if (metal === "PLATINUM") return [...PLATINUM_PURITIES]
  return []
}

export function StonesAnalyticsClient() {
  const { toast } = useToast()
  const [saves, setSaves] = useState<StonesSave[]>([])
  const [reports, setReports] = useState<StonesReport[]>([])
  const [period, setPeriod] = useState<string>("MONTH")
  const [metalFilter, setMetalFilter] = useState<string>("ALL")
  const [purityFilter, setPurityFilter] = useState("")
  const [purityDebounced, setPurityDebounced] = useState("")
  const [rows, setRows] = useState<StonesRow[]>([])
  const [loadingRows, setLoadingRows] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [grandTotal, setGrandTotal] = useState("")
  const [savingReport, setSavingReport] = useState(false)
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)
  const [reportPeriodFilter, setReportPeriodFilter] = useState<string>("ALL")
  const [reportDateFrom, setReportDateFrom] = useState("")
  const [reportDateTo, setReportDateTo] = useState("")
  const [reportMetalFilter, setReportMetalFilter] = useState<string>("ALL")
  const [reportPurityFilter, setReportPurityFilter] = useState("")

  useEffect(() => {
    const t = setTimeout(() => setPurityDebounced(purityFilter), 400)
    return () => clearTimeout(t)
  }, [purityFilter])

  useEffect(() => {
    setPurityFilter("")
  }, [metalFilter])

  useEffect(() => {
    setReportPurityFilter("")
  }, [reportMetalFilter])

  useEffect(() => {
    fetch("/api/stones", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then(setSaves)
      .catch(() => setSaves([]))
  }, [])

  useEffect(() => {
    fetch("/api/stones/reports", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then(setReports)
      .catch(() => setReports([]))
  }, [])

  useEffect(() => {
    const { from, to } = getRange(period)
    setLoadingRows(true)
    const fromStr = from.toISOString().slice(0, 10)
    const toStr = to.toISOString().slice(0, 10)
    const params = new URLSearchParams({ from: fromStr, to: toStr })
    if (metalFilter && metalFilter !== "ALL") params.set("metal", metalFilter)
    if (purityDebounced.trim()) params.set("purity", purityDebounced.trim())
    fetch(`/api/stones/rows?${params}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        setRows(data)
        setSelectedIds(new Set())
        setGrandTotal("")
      })
      .catch(() => setRows([]))
      .finally(() => setLoadingRows(false))
  }, [period, metalFilter, purityDebounced])

  const usedRowIds = new Set<string>(
    reports.flatMap((r) => {
      const ids = r.selectedRowIds
      if (typeof ids === "string") {
        try {
          const arr = JSON.parse(ids) as string[]
          return Array.isArray(arr) ? arr : []
        } catch {
          return []
        }
      }
      return []
    })
  )
  const filteredReports = reports.filter((r) => {
    if (reportPeriodFilter !== "ALL" && r.periodType !== reportPeriodFilter) return false
    if (reportDateFrom) {
      const d = new Date(r.createdAt)
      const from = new Date(reportDateFrom)
      from.setHours(0, 0, 0, 0)
      if (d < from) return false
    }
    if (reportDateTo) {
      const d = new Date(r.createdAt)
      const to = new Date(reportDateTo)
      to.setHours(23, 59, 59, 999)
      if (d > to) return false
    }
    if (reportMetalFilter !== "ALL") {
      const rowsData = (r.selectedRowsData || []) as RowSnapshot[]
      const hasMetal = rowsData.some((row) => (row.metal || "").toUpperCase() === reportMetalFilter)
      if (!hasMetal) return false
    }
    if (reportPurityFilter.trim()) {
      const rowsData = (r.selectedRowsData || []) as RowSnapshot[]
      const hasPurity = rowsData.some(
        (row) => (row.purity || "").toLowerCase().includes(reportPurityFilter.trim().toLowerCase())
      )
      if (!hasPurity) return false
    }
    return true
  })
  const selectableRows = rows.filter((r) => !usedRowIds.has(r.id))
  useEffect(() => {
    const used = new Set<string>(
      reports.flatMap((r) => {
        const ids = r.selectedRowIds
        if (typeof ids === "string") {
          try {
            const arr = JSON.parse(ids) as string[]
            return Array.isArray(arr) ? arr : []
          } catch {
            return []
          }
        }
        return []
      })
    )
    setSelectedIds((prev) => {
      const next = new Set(prev)
      let changed = false
      next.forEach((id) => {
        if (used.has(id)) {
          next.delete(id)
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [reports])
  const totalPaid = rows
    .filter((r) => selectedIds.has(r.id))
    .reduce((s, r) => s + r.pricePaid, 0)
  const grandNum = parseFloat(grandTotal) || 0
  const profit = grandNum - totalPaid

  function toggleRow(id: string) {
    if (usedRowIds.has(id)) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === selectableRows.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(selectableRows.map((r) => r.id)))
  }

  async function saveReport() {
    if (selectedIds.size === 0) {
      toast({ title: "Select at least one row", variant: "destructive" })
      return
    }
    const { from, to } = getRange(period)
    setSavingReport(true)
    try {
      const res = await fetch("/api/stones/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodType: period,
          periodStart: from.toISOString().slice(0, 10),
          periodEnd: to.toISOString().slice(0, 10),
          totalPaid,
          grandTotal: grandNum,
          selectedRowIds: Array.from(selectedIds),
          selectedRowsData: rows.filter((r) => selectedIds.has(r.id)).map((r) => ({ date: r.date, metal: r.metal, purity: r.purity, dwt: r.dwt, pricePaid: r.pricePaid })),
        }),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed")
      const report = await res.json()
      setReports((prev) => [report, ...prev])
      toast({ title: "Report saved" })
    } catch {
      toast({ title: "Failed to save report", variant: "destructive" })
    } finally {
      setSavingReport(false)
    }
  }

  return (
    <Tabs defaultValue="tables" className="space-y-6">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="tables" className="flex items-center gap-2">
          <TableIcon className="h-4 w-4" />
          Saved Tables
        </TabsTrigger>
        <TabsTrigger value="analytics" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Analytics & Reports
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tables" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Saved Stones Tables</CardTitle>
            <p className="text-sm text-muted-foreground">View and browse all saved stone purchase entries.</p>
          </CardHeader>
          <CardContent>
            {saves.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">No saved tables yet. Save from the Stones Table on the dashboard.</p>
            ) : (
              <div className="space-y-4">
                {saves.map((save) => (
                  <Card key={save.id} className="overflow-hidden">
                    <CardHeader className="py-3">
                      <CardTitle className="text-base font-black">
                        Saved {new Date(save.createdAt).toLocaleString()}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table className="font-black">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-black text-red-600">Date</TableHead>
                            <TableHead className="font-black text-red-600">Metal</TableHead>
                            <TableHead className="font-black text-red-600">Purity</TableHead>
                            <TableHead className="text-right font-black text-red-600">DWT</TableHead>
                            <TableHead className="text-right font-black text-red-600">$ Paid</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {save.rows.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="font-black">{new Date(row.date).toLocaleDateString()}</TableCell>
                              <TableCell className="font-black">{row.metal}</TableCell>
                              <TableCell className="font-black">{row.purity}</TableCell>
                              <TableCell className="text-right font-black">{row.dwt.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-black">${row.pricePaid.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <tfoot>
                          <TableRow className="font-black text-red-600">
                            <TableCell colSpan={3} className="font-black text-red-600">Total</TableCell>
                            <TableCell className="text-right font-black text-red-600">
                              {save.rows.reduce((s, r) => s + r.dwt, 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-black text-red-600">
                              ${save.rows.reduce((s, r) => s + r.pricePaid, 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        </tfoot>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="analytics" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales by period</CardTitle>
            <p className="text-sm text-muted-foreground">Select a period, choose rows, enter total received to see profit and save the report.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {PERIODS.map((p) => (
                <Button
                  key={p.value}
                  variant={period === p.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPeriod(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2 border-t">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Filter by metal</Label>
                <Select value={metalFilter} onValueChange={setMetalFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All metals</SelectItem>
                    <SelectItem value="GOLD">Gold</SelectItem>
                    <SelectItem value="SILVER">Silver</SelectItem>
                    <SelectItem value="PLATINUM">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Filter by purity</Label>
                {metalFilter === "ALL" ? (
                  <Input
                    placeholder="e.g. 24 or 950"
                    value={purityFilter}
                    onChange={(e) => setPurityFilter(e.target.value)}
                    className="w-[120px]"
                  />
                ) : (
                  <Select value={purityFilter} onValueChange={setPurityFilter}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Select purity" />
                    </SelectTrigger>
                    <SelectContent>
                      {getPurityOptionsForMetal(metalFilter).map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {loadingRows ? (
              <p className="text-muted-foreground py-4">Loading rows…</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border">
                  <Table className="font-black">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 font-black text-red-600">
                          {selectableRows.length > 0 && (
                            <Checkbox
                              checked={selectableRows.length > 0 && selectedIds.size === selectableRows.length}
                              onCheckedChange={() => toggleAll()}
                            />
                          )}
                        </TableHead>
                        <TableHead className="font-black text-red-600">Date</TableHead>
                        <TableHead className="font-black text-red-600">Metal</TableHead>
                        <TableHead className="font-black text-red-600">Purity</TableHead>
                        <TableHead className="text-right font-black text-red-600">DWT</TableHead>
                        <TableHead className="text-right font-black text-red-600">$ Paid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-black">
                            {usedRowIds.has(row.id) ? (
                              <CheckCircle2 className="h-5 w-5 text-muted-foreground" title="Used in report" />
                            ) : (
                              <Checkbox
                                checked={selectedIds.has(row.id)}
                                onCheckedChange={() => toggleRow(row.id)}
                              />
                            )}
                          </TableCell>
                          <TableCell className="font-black">{new Date(row.date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-black">{row.metal}</TableCell>
                          <TableCell className="font-black">{row.purity}</TableCell>
                          <TableCell className="text-right font-black">{row.dwt.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-black">${row.pricePaid.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    {rows.length > 0 && (
                      <TableFooter>
                        <TableRow>
                          <TableCell className="font-black text-red-600" />
                          <TableCell className="font-black text-red-600">Total</TableCell>
                          <TableCell className="font-black text-red-600" />
                          <TableCell className="font-black text-red-600" />
                          <TableCell className="text-right font-black text-red-600">{rows.reduce((s, r) => s + r.dwt, 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-black text-red-600">${rows.reduce((s, r) => s + r.pricePaid, 0).toFixed(2)}</TableCell>
                        </TableRow>
                      </TableFooter>
                    )}
                  </Table>
                </div>

                {rows.length === 0 ? (
                  <p className="text-muted-foreground py-4">No rows in this period.</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 p-4 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm text-muted-foreground">Total paid (selected)</p>
                      <p className="text-xl font-semibold">${totalPaid.toFixed(2)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Total received</label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={grandTotal}
                        onChange={(e) => setGrandTotal(e.target.value)}
                        className="mt-1 text-lg font-semibold"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Profit</p>
                      <p className={`text-xl font-semibold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        ${profit.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={saveReport} disabled={savingReport || selectedIds.size === 0}>
                        {savingReport ? "Saving…" : "Save report"}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saved reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reports.length > 0 && (
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Period type</Label>
                  <Select value={reportPeriodFilter} onValueChange={setReportPeriodFilter}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All periods</SelectItem>
                      {PERIODS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Saved from</Label>
                  <Input
                    type="date"
                    value={reportDateFrom}
                    onChange={(e) => setReportDateFrom(e.target.value)}
                    className="h-9 w-[140px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Saved to</Label>
                  <Input
                    type="date"
                    value={reportDateTo}
                    onChange={(e) => setReportDateTo(e.target.value)}
                    className="h-9 w-[140px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Filter by metal</Label>
                  <Select value={reportMetalFilter} onValueChange={setReportMetalFilter}>
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All metals</SelectItem>
                      <SelectItem value="GOLD">Gold</SelectItem>
                      <SelectItem value="SILVER">Silver</SelectItem>
                      <SelectItem value="PLATINUM">Platinum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Filter by purity</Label>
                  {reportMetalFilter === "ALL" ? (
                    <Input
                      placeholder="e.g. 24 or 950"
                      value={reportPurityFilter}
                      onChange={(e) => setReportPurityFilter(e.target.value)}
                      className="h-9 w-[120px]"
                    />
                  ) : (
                    <Select value={reportPurityFilter} onValueChange={setReportPurityFilter}>
                      <SelectTrigger className="w-[120px] h-9">
                        <SelectValue placeholder="Select purity" />
                      </SelectTrigger>
                      <SelectContent>
                        {getPurityOptionsForMetal(reportMetalFilter).map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    setReportPeriodFilter("ALL")
                    setReportDateFrom("")
                    setReportDateTo("")
                    setReportMetalFilter("ALL")
                    setReportPurityFilter("")
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
            {reports.length === 0 ? (
              <p className="text-muted-foreground py-4">No reports yet.</p>
            ) : (
              <Table className="font-black">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 font-black text-red-600" />
                    <TableHead className="font-black text-red-600">Period</TableHead>
                    <TableHead className="font-black text-red-600">Saved</TableHead>
                    <TableHead className="font-black text-red-600">Rows used</TableHead>
                    <TableHead className="text-right font-black text-red-600">Total paid</TableHead>
                    <TableHead className="text-right font-black text-red-600">Total received</TableHead>
                    <TableHead className="text-right font-black text-red-600">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((r) => {
                    const rowsData = (r.selectedRowsData || []) as RowSnapshot[]
                    const hasRows = rowsData.length > 0
                    const isExpanded = expandedReportId === r.id
                    return (
                      <Fragment key={r.id}>
                        <TableRow>
                          <TableCell className="w-8 p-1">
                            {hasRows ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setExpandedReportId(isExpanded ? null : r.id)}
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            ) : null}
                          </TableCell>
                          <TableCell className="font-black">{PERIODS.find((p) => p.value === r.periodType)?.label ?? r.periodType}</TableCell>
                          <TableCell className="font-black">{new Date(r.createdAt).toLocaleString()}</TableCell>
                          <TableCell className="font-black">{hasRows ? `${rowsData.length} row(s)` : "—"}</TableCell>
                          <TableCell className="text-right font-black">${r.totalPaid.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-black">${r.grandTotal.toFixed(2)}</TableCell>
                          <TableCell className={`text-right font-black ${r.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            ${r.profit.toFixed(2)}
                          </TableCell>
                        </TableRow>
                        {isExpanded && hasRows && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-muted/30 p-0">
                              <Table className="border-0 font-black">
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="pl-6 font-black text-red-600">Date</TableHead>
                                    <TableHead className="font-black text-red-600">Metal</TableHead>
                                    <TableHead className="font-black text-red-600">Purity</TableHead>
                                    <TableHead className="text-right font-black text-red-600">DWT</TableHead>
                                    <TableHead className="text-right font-black text-red-600">$ Paid</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {rowsData.map((row, i) => (
                                    <TableRow key={i}>
                                      <TableCell className="pl-6 font-black">{new Date(row.date).toLocaleDateString()}</TableCell>
                                      <TableCell className="font-black">{row.metal}</TableCell>
                                      <TableCell className="font-black">{row.purity}</TableCell>
                                      <TableCell className="text-right font-black">{row.dwt.toFixed(2)}</TableCell>
                                      <TableCell className="text-right font-black">${row.pricePaid.toFixed(2)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="font-black text-red-600">
                      Grand total
                    </TableCell>
                    <TableCell className="text-right font-black text-red-600">
                      ${filteredReports.reduce((s, r) => s + r.totalPaid, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-black text-red-600">
                      ${filteredReports.reduce((s, r) => s + r.grandTotal, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right font-black ${filteredReports.reduce((s, r) => s + r.profit, 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      ${filteredReports.reduce((s, r) => s + r.profit, 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
