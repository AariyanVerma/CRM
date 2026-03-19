import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || !Array.isArray(body.updates)) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
    }

    const updates = body.updates as Array<{ id: string; refinerReceivedAmount: number | null }>

    const sanitized = updates
      .filter((u) => typeof u?.id === "string" && u.id.trim().length > 0)
      .map((u) => ({
        id: u.id.trim(),
        refinerReceivedAmount:
          u.refinerReceivedAmount == null
            ? null
            : typeof u.refinerReceivedAmount === "number" && Number.isFinite(u.refinerReceivedAmount)
              ? u.refinerReceivedAmount
              : null,
      }))

    if (sanitized.length === 0) {
      return NextResponse.json({ message: "No valid updates" }, { status: 400 })
    }

    await prisma.$transaction(
      sanitized.map((u) =>
        prisma.inventoryAdjustment.updateMany({
          where: { id: u.id },
          data: {
            refinerReceivedAmount: u.refinerReceivedAmount,
            refinerySettlementStatus: u.refinerReceivedAmount == null ? "OPENED" : "CLOSED",
            refineryClosedAt: u.refinerReceivedAmount == null ? null : new Date(),
          },
        }),
      ),
    )

    
    
    
    
    const ids = sanitized.map((u) => u.id)
    const affected = await prisma.inventoryAdjustment.findMany({
      where: { id: { in: ids } },
      select: { refineryBatchId: true },
    })

    const batchIds = Array.from(
      new Set(
        affected
          .map((a) => a.refineryBatchId)
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0),
      ),
    )

    for (const batchId of batchIds) {
      const missing = await prisma.inventoryAdjustment.count({
        where: { refineryBatchId: batchId, refinerReceivedAmount: null },
      })

      if (missing === 0) {
        await prisma.inventoryAdjustment.updateMany({
          where: { refineryBatchId: batchId },
          data: { refinerySettlementStatus: "CLOSED", refineryClosedAt: new Date() },
        })
      } else {
        await prisma.inventoryAdjustment.updateMany({
          where: { refineryBatchId: batchId },
          data: { refinerySettlementStatus: "OPENED" },
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error updating refinery settlement:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

