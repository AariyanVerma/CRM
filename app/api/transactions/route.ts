import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
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
    if (status && ["OPEN", "PRINTED", "VOID"].includes(status)) where.status = status as "OPEN" | "PRINTED" | "VOID"
    if (type && ["SCRAP", "MELT"].includes(type)) where.type = type as "SCRAP" | "MELT"
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

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true, isBusiness: true, businessName: true } },
          lineItems: { select: { id: true, lineTotal: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ])

    const withTotal = transactions.map((t) => ({
      ...t,
      total: t.lineItems.reduce((s, i) => s + i.lineTotal, 0),
    }))

    return NextResponse.json({ transactions: withTotal, total })
  } catch (error) {
    console.error("Error listing transactions:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
