import { NextRequest, NextResponse } from "next/server"
import { Prisma, type TransactionStatus, type TransactionType } from "@prisma/client"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "day"
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const customerId = searchParams.get("customerId") || undefined
    const customerIdsParam = searchParams.get("customerIds") || undefined
    const typeFilter = searchParams.get("type") || undefined
    const statusFilter = searchParams.get("status") || undefined
    const includeApprovedImpact = searchParams.get("includeApprovedImpact") === "true"
    const metalFilter = searchParams.get("metal") || undefined
    const minTotal = searchParams.get("minTotal") ? Number(searchParams.get("minTotal")) : undefined
    const maxTotal = searchParams.get("maxTotal") ? Number(searchParams.get("maxTotal")) : undefined

    
    
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/
    const fromDate = from ? (dateOnly.test(from)
      ? new Date(from + "T00:00:00.000Z")
      : (() => {
          const d = new Date(from)
          d.setHours(0, 0, 0, 0)
          return d
        })()
    ) : (() => {
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
    const toDate = to ? (dateOnly.test(to)
      ? new Date(to + "T23:59:59.999Z")
      : (() => {
          const d = new Date(to)
          d.setHours(23, 59, 59, 999)
          return d
        })()
    ) : (() => {
      const d = new Date()
      d.setHours(23, 59, 59, 999)
      return d
    })()

    const customerIds = customerIdsParam ? customerIdsParam.split(",").filter(Boolean) : []

    const baseWhere: Prisma.TransactionWhereInput = {
      createdAt: { gte: fromDate, lte: toDate },
    }
    if (customerIds.length > 0) baseWhere.customerId = { in: customerIds }
    else if (customerId) baseWhere.customerId = customerId
    if (typeFilter === "SCRAP" || typeFilter === "MELT") baseWhere.type = typeFilter as TransactionType
    if (metalFilter === "GOLD" || metalFilter === "SILVER" || metalFilter === "PLATINUM") {
      baseWhere.lineItems = { some: { metalType: metalFilter } }
    }

    
    
    
    if (statusFilter === "OPEN") {
      
      baseWhere.status = { in: ["OPEN", "APPROVED"] as TransactionStatus[] }
    } else if (
      statusFilter === "PENDING_APPROVAL" ||
      statusFilter === "APPROVED" ||
      statusFilter === "PRINTED" ||
      statusFilter === "VOID"
    ) {
      baseWhere.status = statusFilter as TransactionStatus
    } else {
      baseWhere.status = "PRINTED"
    }

    const transactions = await prisma.transaction.findMany({
      where: baseWhere,
      include: {
        customer: { select: { id: true, fullName: true, isBusiness: true, businessName: true } },
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
    const byStatus: Record<TransactionStatus, { count: number; total: number }> = {
      OPEN: { count: 0, total: 0 },
      PENDING_APPROVAL: { count: 0, total: 0 },
      APPROVED: { count: 0, total: 0 },
      PRINTED: { count: 0, total: 0 },
      VOID: { count: 0, total: 0 },
    }
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

    let approvedWithTotal: typeof withTotal | null = null
    let approvedSummary:
      | {
          transactionCount: number
          grandTotal: number
          avgTransaction: number
          minTotal: number
          maxTotal: number
          byType: typeof byType
          byStatus: typeof byStatus
          byMetal: typeof byMetal
        }
      | null = null

    if (includeApprovedImpact) {
      const approvedTransactions = await prisma.transaction.findMany({
        where: {
          ...baseWhere,
          status: { in: ["OPEN", "APPROVED"] as TransactionStatus[] },
        },
        include: {
          customer: { select: { id: true, fullName: true, isBusiness: true, businessName: true } },
          lineItems: true,
        },
        orderBy: { createdAt: "desc" },
      })

      approvedWithTotal = approvedTransactions.map((t) => ({
        ...t,
        total: t.lineItems.reduce((s, i) => s + i.lineTotal, 0),
      }))

      const approvedByType = { SCRAP: { count: 0, total: 0 }, MELT: { count: 0, total: 0 } }
      const approvedByStatus: Record<TransactionStatus, { count: number; total: number }> = {
        OPEN: { count: 0, total: 0 },
        PENDING_APPROVAL: { count: 0, total: 0 },
        APPROVED: { count: 0, total: 0 },
        PRINTED: { count: 0, total: 0 },
        VOID: { count: 0, total: 0 },
      }
      const approvedByMetal = { GOLD: 0, SILVER: 0, PLATINUM: 0 }

      approvedWithTotal.forEach((t) => {
        approvedByType[t.type].count += 1
        approvedByType[t.type].total += t.total
        approvedByStatus[t.status].count += 1
        approvedByStatus[t.status].total += t.total
        t.lineItems.forEach((i) => {
          approvedByMetal[i.metalType] = (approvedByMetal[i.metalType] || 0) + i.lineTotal
        })
      })

      const approvedGrandTotal = approvedWithTotal.reduce((s, t) => s + t.total, 0)
      const approvedCount = approvedWithTotal.length

      approvedSummary = {
        transactionCount: approvedCount,
        grandTotal: approvedGrandTotal,
        avgTransaction: approvedCount > 0 ? approvedGrandTotal / approvedCount : 0,
        minTotal: approvedCount > 0 ? Math.min(...approvedWithTotal.map((t) => t.total)) : 0,
        maxTotal: approvedCount > 0 ? Math.max(...approvedWithTotal.map((t) => t.total)) : 0,
        byType: approvedByType,
        byStatus: approvedByStatus,
        byMetal: approvedByMetal,
      }
    }

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
      approvedSummary,
      approvedTransactions: approvedWithTotal,
    })
  } catch (error) {
    console.error("Error fetching report:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
