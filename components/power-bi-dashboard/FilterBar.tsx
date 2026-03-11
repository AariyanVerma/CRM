"use client"

import { useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, Calendar, Users, Layers, FileCheck, Search, Loader2 } from "lucide-react"
import type { FilterState } from "./types"

export interface FilterBarProps {
  period: "day" | "week" | "month"
  setPeriod: (p: "day" | "week" | "month") => void
  from: string
  setFrom: (s: string) => void
  to: string
  setTo: (s: string) => void
  customerId: string
  setCustomerId: (s: string) => void
  customerSearch: string
  setCustomerSearch: (s: string) => void
  customers: Array<{ id: string; fullName: string }>
  customersLoading: boolean
  filters: FilterState
  setFilters: (f: FilterState) => void
  onApply: () => void
  loading: boolean
}

export function FilterBar(p: FilterBarProps) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <Card className="border bg-card shadow-sm sticky top-0 z-20">
      <CardHeader className="py-3 px-4 border-b bg-muted/30">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <Filter className="h-4 w-4" /> Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Period</Label>
            <Select value={p.period} onValueChange={(v) => p.setPeriod(v as "day" | "week" | "month")}>
              <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> From</Label>
            <Input type="date" value={p.from} onChange={(e) => p.setFrom(e.target.value)} className="w-[140px] h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> To</Label>
            <Input type="date" value={p.to} onChange={(e) => p.setTo(e.target.value)} className="w-[140px] h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Customer
            </Label>
            <Select value={p.customerId || "all"} onValueChange={(v) => p.setCustomerId(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[220px] h-11 rounded-xl border-primary/20 bg-background/80 shadow-sm">
                <SelectValue placeholder="All customers" />
              </SelectTrigger>
              <SelectContent className="rounded-xl min-w-[220px]">
                <div
                  className="p-1.5 pb-2 border-b border-border sticky top-0 bg-popover z-10"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      ref={ref}
                      placeholder="Search by name or phone..."
                      value={p.customerSearch}
                      onChange={(e) => p.setCustomerSearch(e.target.value)}
                      onPointerDown={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="h-9 pl-8 pr-3 text-sm rounded-lg border-input bg-background"
                    />
                  </div>
                </div>
                <SelectItem value="all">All customers</SelectItem>
                {p.customersLoading && (
                  <SelectItem value="_loading" disabled className="pointer-events-none">
                    Searching...
                  </SelectItem>
                )}
                {!p.customersLoading && p.customerSearch && p.customers.length === 0 && (
                  <SelectItem value="_empty" disabled className="pointer-events-none">
                    No customers found
                  </SelectItem>
                )}
                {!p.customersLoading &&
                  p.customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> Type</Label>
            <Select value={p.filters.typeFilter} onValueChange={(v) => p.setFilters({ ...p.filters, typeFilter: v as FilterState["typeFilter"] })}>
              <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="SCRAP">SCRAP</SelectItem>
                <SelectItem value="MELT">MELT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><FileCheck className="h-3.5 w-3.5" /> Status</Label>
            <Select value={p.filters.statusFilter} onValueChange={(v) => p.setFilters({ ...p.filters, statusFilter: v as FilterState["statusFilter"] })}>
              <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="OPEN">Approved</SelectItem>
                <SelectItem value="PRINTED">PRINTED</SelectItem>
                <SelectItem value="VOID">VOID</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={p.onApply} disabled={p.loading} size="sm" className="h-9 px-4">
            {p.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
