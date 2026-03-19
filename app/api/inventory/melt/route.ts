import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(_request: NextRequest) {
  try {
    const grouped = await prisma.lineItem.groupBy({
      by: ["metalType", "purityLabel"],
      where: {
        transaction: {
          type: "MELT",
          status: "PRINTED",
        },
      },
      _sum: {
        dwt: true,
        lineTotal: true,
      },
      _max: {
        createdAt: true,
      },
    })

    const summaryByMetal: Record<string, { totalDwt: number; totalPaid: number }> = {}

    const rows = grouped.map((g) => {
      const metal = g.metalType
      const totalDwt = g._sum.dwt ?? 0
      const totalPaid = g._sum.lineTotal ?? 0
      const avgPricePerDwt = totalDwt > 0 ? totalPaid / totalDwt : 0

      if (!summaryByMetal[metal]) {
        summaryByMetal[metal] = { totalDwt: 0, totalPaid: 0 }
      }
      summaryByMetal[metal].totalDwt += totalDwt
      summaryByMetal[metal].totalPaid += totalPaid

      return {
        metal,
        purityLabel: g.purityLabel,
        totalDwt,
        totalPaid,
        avgPricePerDwt,
        lastUpdatedAt: g._max.createdAt,
      }
    })

    
    const adjustments = await prisma.inventoryAdjustment.groupBy({
      by: ["metalType"],
      where: {
        type: "MELT",
      },
      _sum: {
        dwt: true,
        totalPaid: true,
      },
    })

    for (const adj of adjustments) {
      const metal = adj.metalType
      const adjDwt = adj._sum.dwt ?? 0
      const adjPaid = adj._sum.totalPaid ?? 0
      if (!summaryByMetal[metal]) {
        summaryByMetal[metal] = { totalDwt: 0, totalPaid: 0 }
      }
      summaryByMetal[metal].totalDwt -= adjDwt
      summaryByMetal[metal].totalPaid -= adjPaid
    }

    rows.sort((a, b) => {
      if (a.metal === b.metal) return a.purityLabel.localeCompare(b.purityLabel)
      return a.metal.localeCompare(b.metal)
    })

    return NextResponse.json({
      type: "MELT",
      summaryByMetal,
      rows,
    })
  } catch (error) {
    console.error("Error fetching melt inventory:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || !Array.isArray(body.rows)) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
    }

    const batchId = typeof body.batchId === "string" && body.batchId.trim().length > 0 ? body.batchId.trim() : undefined

    const rows = body.rows as Array<{
      metal: "GOLD" | "SILVER" | "PLATINUM"
      weight: number
      pricePaid: number
    }>

    const validRows = rows.filter(
      (r) => r.weight && r.weight > 0 && Number.isFinite(r.weight) && r.pricePaid && r.pricePaid > 0,
    )

    if (validRows.length === 0) {
      return NextResponse.json({ message: "No valid rows to create adjustment" }, { status: 400 })
    }

    await prisma.inventoryAdjustment.createMany({
      data: validRows.map((r) => ({
        type: "MELT",
        metalType: r.metal,
        purityLabel: null,
        ...(batchId ? { refineryBatchId: batchId } : {}),
        dwt: r.weight,
        totalPaid: r.pricePaid,
      })),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error creating melt inventory adjustment:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

