"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileDown, ChevronLeft, ChevronRight } from "lucide-react"
import { formatCurrency, formatDate } from "./utils"
import type { ReportTransaction } from "./types"
import { getCustomerDisplayName } from "@/lib/utils"

const PAGE_SIZE = 10

function getStatusBadgeClassName(status: string) {
  return status === "PRINTED"
    ? "bg-green-500 text-white border-green-600"
    : status === "VOID"
      ? "bg-red-500 text-white border-red-600"
      : "bg-yellow-500 text-white border-yellow-600"
}

type DataTableProps = {
  transactions: ReportTransaction[]
  from: string
  to: string
}

export function DataTable({ transactions, from, to }: DataTableProps) {
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE))
  const start = page * PAGE_SIZE
  const slice = transactions.slice(start, start + PAGE_SIZE)

  const exportCsv = () => {
    if (!transactions.length) return
    const headers = ["Date", "ID", "Type", "Status", "Customer", "Total"]
    const rows = transactions.map((t) => [
      formatDate(t.createdAt),
      t.id,
      t.type,
      t.status,
      getCustomerDisplayName(t.customer),
      t.total.toFixed(2),
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `transactions-${from}-to-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="border shadow-sm overflow-hidden">
      <CardHeader className="py-3 px-4 border-b bg-muted/30 flex flex-row flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="text-sm font-semibold">Transaction list</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDate(from)} – {formatDate(to)} · {transactions.length} rows
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!transactions.length} className="gap-2">
          <FileDown className="h-4 w-4" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed text-center">
            <colgroup>
              <col className="w-1/5" />
              <col className="w-1/5" />
              <col className="w-1/5" />
              <col className="w-1/5" />
              <col className="w-1/5" />
            </colgroup>
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="font-medium p-3 align-middle text-center">Date</th>
                <th className="font-medium p-3 align-middle text-center">Type</th>
                <th className="font-medium p-3 align-middle text-center">Status</th>
                <th className="font-medium p-3 align-middle text-center">Customer</th>
                <th className="font-medium p-3 align-middle text-center whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground align-middle">
                    No transactions in this range.
                  </td>
                </tr>
              ) : (
                slice.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 tabular-nums align-middle text-center">
                      {formatDate(t.createdAt)}
                    </td>
                    <td className="p-3 align-middle">
                      <div className="flex justify-center">
                        <Badge
                          variant={t.type === "SCRAP" ? "default" : "destructive"}
                          className="text-xs inline-flex"
                        >
                          {t.type}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-3 align-middle">
                      <div className="flex justify-center">
                        <Badge
                          variant="outline"
                          className={`text-xs inline-flex ${getStatusBadgeClassName(t.status)}`}
                        >
                          {t.status}
                        </Badge>
                      </div>
                    </td>
                    <td
                      className="p-3 align-middle text-center truncate"
                      title={getCustomerDisplayName(t.customer)}
                    >
                      {getCustomerDisplayName(t.customer)}
                    </td>
                    <td className="p-3 font-medium tabular-nums align-middle whitespace-nowrap text-center">
                      {formatCurrency(t.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t">
            <p className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
