import { NextRequest, NextResponse } from "next/server"
import { Prisma, type TransactionStatus, type TransactionType } from "@prisma/client"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "day" // day | week | month | quarter | ytd
    const from = searchParams.get("from") // YYYY-MM-DD
    const to = searchParams.get("to")
    const customerId = searchParams.get("customerId") || undefined
    const customerIdsParam = searchParams.get("customerIds") || undefined // comma-separated
    const typeFilter = searchParams.get("type") || undefined // SCRAP | MELT
    const statusFilter = searchParams.get("status") || undefined // OPEN | PRINTED | VOID
    const metalFilter = searchParams.get("metal") || undefined // GOLD | SILVER | PLATINUM
    const minTotal = searchParams.get("minTotal") ? Number(searchParams.get("minTotal")) : undefined
    const maxTotal = searchParams.get("maxTotal") ? Number(searchParams.get("maxTotal")) : undefined

    const fromDate = from ? new Date(from) : (() => {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      if (period === "week") d.setDate(d.getDate() - 7)
      else if (period === "month") d.setMonth(d.getMonth() - 1)
      else if (period === "quarter") {
        const q = Math.floor(d.getMonth() / 3) + 1
        d.setMonth((q - 1) * 3)
        d.setDate(1)
      } else if (period === "ytd") {
        d.setMonth(0)
        d.setDate(1)
      }
      return d
    })()
    const toDate = to ? new Date(to) : new Date()
    toDate.setHours(23, 59, 59, 999)

    const customerIds = customerIdsParam ? customerIdsParam.split(",").filter(Boolean) : []
    const where: Prisma.TransactionWhereInput = {
      createdAt: { gte: fromDate, lte: toDate },
    }
    if (customerIds.length > 0) where.customerId = { in: customerIds }
    else if (customerId) where.customerId = customerId
    if (typeFilter === "SCRAP" || typeFilter === "MELT") where.type = typeFilter as TransactionType
    if (statusFilter === "OPEN" || statusFilter === "PRINTED" || statusFilter === "VOID") where.status = statusFilter as TransactionStatus
    if (metalFilter === "GOLD" || metalFilter === "SILVER" || metalFilter === "PLATINUM") {
      where.lineItems = { some: { metalType: metalFilter } }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true } },
        lineItems: true,
      },
      orderBy: { createdAt: "desc" },
    })

    let withTotal = transactions.map((t) => ({
      ...t,
      total: t.lineItems.reduce((s, i) => s + i.lineTotal, 0),
    }))

    if (typeof minTotal === "number" && !Number.isNaN(minTotal)) {
      withTotal = withTotal.filter((t) => t.total >= minTotal)
    }
    if (typeof maxTotal === "number" && !Number.isNaN(maxTotal)) {
      withTotal = withTotal.filter((t) => t.total <= maxTotal)
    }

    const byType = { SCRAP: { count: 0, total: 0 }, MELT: { count: 0, total: 0 } }
    const byStatus = { OPEN: { count: 0, total: 0 }, PRINTED: { count: 0, total: 0 }, VOID: { count: 0, total: 0 } }
    const byMetal = { GOLD: 0, SILVER: 0, PLATINUM: 0 }
    withTotal.forEach((t) => {
      byType[t.type].count += 1
      byType[t.type].total += t.total
      byStatus[t.status].count += 1
      byStatus[t.status].total += t.total
      t.lineItems.forEach((i) => {
        byMetal[i.metalType] = (byMetal[i.metalType] || 0) + i.lineTotal
      })
    })

    const grandTotal = withTotal.reduce((s, t) => s + t.total, 0)
    const count = withTotal.length

    return NextResponse.json({
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      period,
      summary: {
        transactionCount: count,
        grandTotal,
        avgTransaction: count > 0 ? grandTotal / count : 0,
        minTotal: count > 0 ? Math.min(...withTotal.map((t) => t.total)) : 0,
        maxTotal: count > 0 ? Math.max(...withTotal.map((t) => t.total)) : 0,
        byType,
        byStatus,
        byMetal,
      },
      transactions: withTotal,
    })
  } catch (error) {
    console.error("Error fetching report:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
