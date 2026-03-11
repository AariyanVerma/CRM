"use client"

import { useState } from "react"
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
import { Gem, Plus, Trash2, ArrowRight } from "lucide-react"

const METALS = ["GOLD", "SILVER", "PLATINUM"] as const

type Row = {
  id: string
  date: string
  metal: string
  purity: string
  dwt: string
  pricePaid: string
}

function todayStr() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export function StonesTableCard() {
  const { toast } = useToast()
  const [rows, setRows] = useState<Row[]>([
    { id: crypto.randomUUID(), date: todayStr(), metal: "GOLD", purity: "", dwt: "", pricePaid: "" },
  ])
  const [saving, setSaving] = useState(false)

  function addRow() {
    setRows((r) => [...r, { id: crypto.randomUUID(), date: todayStr(), metal: "GOLD", purity: "", dwt: "", pricePaid: "" }])
  }

  function removeRow(id: string) {
    if (rows.length <= 1) return
    setRows((r) => r.filter((x) => x.id !== id))
  }

  function updateRow(id: string, field: keyof Row, value: string) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, [field]: value } : x)))
  }

  const totalDwt = rows.reduce((s, r) => s + (parseFloat(r.dwt) || 0), 0)
  const totalPaid = rows.reduce((s, r) => s + (parseFloat(r.pricePaid) || 0), 0)

  async function handleSave() {
    const valid = rows.every((r) => r.date && r.metal && r.purity.trim() !== "" && r.dwt !== "" && r.pricePaid !== "")
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
            pricePaid: parseFloat(r.pricePaid) || 0,
          })),
        }),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: "Saved", description: "Stones table saved successfully." })
      setRows([{ id: crypto.randomUUID(), date: todayStr(), metal: "GOLD", purity: "", dwt: "", pricePaid: "" }])
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
                <th className="p-2 text-center font-black" style={{ width: "22%" }}>Date</th>
                <th className="p-2 text-center font-black" style={{ width: "15%" }}>Metal</th>
                <th className="p-2 text-center font-black" style={{ width: "15%" }}>Purity</th>
                <th className="p-2 text-center font-black" style={{ width: "14%" }}>DWT</th>
                <th className="p-2 pr-1 text-center font-black" style={{ width: "22%" }}>$ Price paid</th>
                <th className="p-0 text-center font-black w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="p-2 text-center align-middle overflow-visible">
                    <Input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRow(row.id, "date", e.target.value)}
                      className="h-9 text-center font-black w-full min-w-0 box-border text-[length:inherit]"
                      style={{ minWidth: "9.5rem" }}
                    />
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
                    <Input
                      placeholder="Purity"
                      value={row.purity}
                      onChange={(e) => updateRow(row.id, "purity", e.target.value)}
                      className="h-9 text-center font-black w-full min-w-0 box-border"
                    />
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
                  <td className="p-2 pr-1 text-center align-middle">
                    <Input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={row.pricePaid}
                      onChange={(e) => updateRow(row.id, "pricePaid", e.target.value)}
                      className="h-9 text-center font-black w-full min-w-0 box-border"
                    />
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
