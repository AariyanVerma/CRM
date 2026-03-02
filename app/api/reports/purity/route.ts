import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"

function matchesPurityFilter(
  metalType: string,
  purityLabel: string,
  purityPercentage: number | null,
  purityPercent: number | undefined,
  purityMin: number | undefined,
  purityMax: number | undefined
): boolean {
  if (purityPercent != null && !Number.isNaN(purityPercent)) {
    if (purityPercentage != null) return Math.abs(purityPercentage - purityPercent) < 0.01
    const labelToPercent: Record<string, Record<string, number>> = {
      GOLD: { "24K": 100, "22K": 91.67, "21K": 87.5, "18K": 75, "16K": 66.67, "14K": 58.33, "13K": 54.17, "12K": 50, "11K": 45.83, "10K": 41.67, "9K": 37.5 },
      SILVER: { "925": 92.5, "900": 90, "800": 80 },
      PLATINUM: { "950": 95, "900": 90 },
    }
    const expected = labelToPercent[metalType]?.[purityLabel]
    return expected != null && Math.abs(expected - purityPercent) < 0.01
  }
  if ((purityMin != null && !Number.isNaN(purityMin)) || (purityMax != null && !Number.isNaN(purityMax))) {
    const pct = purityPercentage ?? (() => {
      const labelToPercent: Record<string, Record<string, number>> = {
        GOLD: { "24K": 100, "22K": 91.67, "21K": 87.5, "18K": 75, "16K": 66.67, "14K": 58.33, "13K": 54.17, "12K": 50, "11K": 45.83, "10K": 41.67, "9K": 37.5 },
        SILVER: { "925": 92.5, "900": 90, "800": 80 },
        PLATINUM: { "950": 95, "900": 90 },
      }
      return labelToPercent[metalType]?.[purityLabel] ?? null
    })()
    if (pct === null) return false
    if (purityMin != null && !Number.isNaN(purityMin) && pct < purityMin) return false
    if (purityMax != null && !Number.isNaN(purityMax) && pct > purityMax) return false
    return true
  }
  return true
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "week"
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const typeFilter = searchParams.get("type") || "SCRAP"
    const metalFilter = searchParams.get("metal") || undefined
    const customerId = searchParams.get("customerId") || undefined
    const purityPercent = searchParams.get("purityPercent") ? Number(searchParams.get("purityPercent")) : undefined
    const purityMin = searchParams.get("purityMin") ? Number(searchParams.get("purityMin")) : undefined
    const purityMax = searchParams.get("purityMax") ? Number(searchParams.get("purityMax")) : undefined

    const fromDate = from ? new Date(from) : (() => {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      if (period === "day") return d
      if (period === "week") d.setDate(d.getDate() - 7)
      else if (period === "month") d.setMonth(d.getMonth() - 1)
      else if (period === "year") d.setFullYear(d.getFullYear() - 1)
      d.setHours(0, 0, 0, 0)
      return d
    })()
    const toDate = to ? new Date(to) : new Date()
    toDate.setHours(23, 59, 59, 999)

    const lineItemsFilter =
      metalFilter && ["GOLD", "SILVER", "PLATINUM"].includes(metalFilter)
        ? { some: { metalType: metalFilter as any } }
        : undefined

    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
        type: typeFilter === "MELT" ? "MELT" : "SCRAP",
        ...(customerId ? { customerId } : {}),
        ...(lineItemsFilter ? { lineItems: lineItemsFilter } : {}),
      },
      include: {
        customer: { select: { id: true, fullName: true, isBusiness: true, businessName: true } },
        lineItems: true,
      },
      orderBy: { createdAt: "desc" },
    })

    type LineItemRow = {
      id: string
      metalType: string
      purityLabel: string
      purityPercentage: number | null
      dwt: number
      lineTotal: number
      transactionId: string
      createdAt: string
      customer: { id: string; fullName: string; isBusiness?: boolean; businessName?: string | null }
    }

    const allItems: LineItemRow[] = []
    transactions.forEach((t) => {
      t.lineItems.forEach((item) => {
        if (metalFilter && item.metalType !== metalFilter) return
        const include = matchesPurityFilter(
          item.metalType,
          item.purityLabel,
          item.purityPercentage,
          purityPercent,
          purityMin,
          purityMax
        )
        if (include) {
          allItems.push({
            id: item.id,
            metalType: item.metalType,
            purityLabel: item.purityLabel,
            purityPercentage: item.purityPercentage,
            dwt: item.dwt,
            lineTotal: item.lineTotal,
            transactionId: t.id,
            createdAt: t.createdAt.toISOString(),
            customer: t.customer,
          })
        }
      })
    })

    const breakdownMap = new Map<string, { metalType: string; purityLabel: string; purityPercentage: number | null; lineItemCount: number; totalDwt: number; totalValue: number }>()
    allItems.forEach((item) => {
      const key = `${item.metalType}|${item.purityLabel}|${item.purityPercentage ?? "n/a"}`
      const existing = breakdownMap.get(key)
      const pct = item.purityPercentage ?? null
      if (existing) {
        existing.lineItemCount += 1
        existing.totalDwt += item.dwt
        existing.totalValue += item.lineTotal
      } else {
        breakdownMap.set(key, {
          metalType: item.metalType,
          purityLabel: item.purityLabel,
          purityPercentage: pct,
          lineItemCount: 1,
          totalDwt: item.dwt,
          totalValue: item.lineTotal,
        })
      }
    })

    const breakdown = Array.from(breakdownMap.values()).sort(
      (a, b) => a.metalType.localeCompare(b.metalType) || a.purityLabel.localeCompare(b.purityLabel)
    )

    const totalDwt = allItems.reduce((sum, i) => sum + i.dwt, 0)
    const totalValue = allItems.reduce((sum, i) => sum + i.lineTotal, 0)

    return NextResponse.json({
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      period,
      type: typeFilter,
      metal: metalFilter ?? null,
      customerId: customerId ?? null,
      purityPercent: purityPercent ?? null,
      purityMin: purityMin ?? null,
      purityMax: purityMax ?? null,
      breakdown,
      lineItems: allItems,
      totalDwt,
      totalValue,
    })
  } catch (error) {
    console.error("Error fetching purity report:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
