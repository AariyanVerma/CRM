import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { summarizeTransactions, summarizeTransactionsByDay } from "@/lib/transaction-totals"
import type { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q") || ""
    const status = searchParams.get("status") || ""
    const type = searchParams.get("type") || ""
    const customerId = searchParams.get("customerId") || ""
    const from = searchParams.get("from") || ""
    const to = searchParams.get("to") || ""
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100)
    const offset = Number(searchParams.get("offset")) || 0

    const where: Prisma.TransactionWhereInput = {}

    if (customerId) where.customerId = customerId
    if (status && ["OPEN", "PRINTED", "VOID", "PENDING_APPROVAL", "APPROVED"].includes(status)) where.status = status as "OPEN" | "PRINTED" | "VOID" | "PENDING_APPROVAL" | "APPROVED"
    if (type && ["SCRAP", "MELT", "SALE"].includes(type)) where.type = type as "SCRAP" | "MELT" | "SALE"
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) {
        const end = new Date(to)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }
    if (q.trim().length >= 2) {
      const term = q.trim()
      where.OR = [
        { id: { contains: term, mode: "insensitive" } },
        { customer: { fullName: { contains: term, mode: "insensitive" } } },
      ]
    }

    const summaryWhere: Prisma.TransactionWhereInput = {
      ...where,
      status: where.status ?? { not: "VOID" },
    }

    const grandTotalWhere: Prisma.TransactionWhereInput = {
      status: { not: "VOID" },
      ...(customerId ? { customerId } : {}),
    }

    const summarySelect = {
      type: true,
      createdAt: true,
      lineItems: { select: { lineTotal: true, metalType: true } },
    } as const

    const [transactions, total, summaryTransactions, grandTotalTransactions] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true, isBusiness: true, businessName: true } },
          lineItems: { select: { id: true, lineTotal: true } },
          approvalRequests: {
            where: { status: "PENDING" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where: summaryWhere,
        select: summarySelect,
        orderBy: { createdAt: "desc" },
      }),
      prisma.transaction.findMany({
        where: grandTotalWhere,
        select: summarySelect,
      }),
    ])

    const withTotal = transactions.map((t) => {
      const { approvalRequests, ...rest } = t
      return {
        ...rest,
        total: t.lineItems.reduce((s, i) => s + i.lineTotal, 0),
        pendingApprovalRequestId: approvalRequests?.[0]?.id ?? null,
      }
    })

    return NextResponse.json({
      transactions: withTotal,
      total,
      summary: {
        dailyTotals: summarizeTransactionsByDay(summaryTransactions),
        filteredTotals: summarizeTransactions(summaryTransactions),
        grandTotalAllTime: summarizeTransactions(grandTotalTransactions),
      },
    })
  } catch (error) {
    console.error("Error listing transactions:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
