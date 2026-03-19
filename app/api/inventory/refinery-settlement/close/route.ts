import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body.batchId !== "string") {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
    }

    const batchId = body.batchId as string
    const rows = await prisma.inventoryAdjustment.findMany({
      where: { refineryBatchId: batchId },
      select: { id: true, refinerReceivedAmount: true },
    })

    if (rows.length === 0) {
      return NextResponse.json({ message: "Batch not found" }, { status: 404 })
    }

    const missing = rows.filter((r) => r.refinerReceivedAmount == null)
    if (missing.length > 0) {
      return NextResponse.json(
        { message: `Cannot close: ${missing.length} row(s) missing received amount.` },
        { status: 400 },
      )
    }

    await prisma.inventoryAdjustment.updateMany({
      where: { refineryBatchId: batchId },
      data: { refinerySettlementStatus: "CLOSED", refineryClosedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error closing refinery settlement:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

