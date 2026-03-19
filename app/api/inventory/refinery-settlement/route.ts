import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import type { MetalType, RefinerySettlementStatus, TransactionType } from "@prisma/client"

type AdjustmentRow = {
  id: string
  createdAt: string
  type: TransactionType
  metalType: MetalType
  purityLabel: string | null
  dwt: number
  totalPaid: number
  refinerReceivedAmount: number | null
  status: RefinerySettlementStatus
  
  refineryBatchId: string | null
}

type RefineryBatch = {
  batchId: string
  createdAt: string
  status: RefinerySettlementStatus
  rows: AdjustmentRow[]
}

export async function GET(_request: NextRequest) {
  try {
    const adjustments = await prisma.inventoryAdjustment.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        metalType: true,
        purityLabel: true,
        dwt: true,
        totalPaid: true,
        createdAt: true,
        refinerReceivedAmount: true,
        refinerySettlementStatus: true,
        refineryBatchId: true,
      },
    })

    const summaryByType = {
      SCRAP: { count: 0, totalDwt: 0, totalPaid: 0 },
      MELT: { count: 0, totalDwt: 0, totalPaid: 0 },
    } as Record<string, { count: number; totalDwt: number; totalPaid: number }>

    const rows: AdjustmentRow[] = adjustments.map((a) => {
      const status: RefinerySettlementStatus =
        a.refinerySettlementStatus ??
        (a.refinerReceivedAmount == null ? "OPENED" : "CLOSED")

      return {
        id: a.id,
        createdAt: a.createdAt.toISOString(),
        type: a.type,
        metalType: a.metalType,
        purityLabel: a.purityLabel ?? null,
        dwt: a.dwt,
        totalPaid: a.totalPaid,
        refinerReceivedAmount: a.refinerReceivedAmount ?? null,
        status,
        refineryBatchId: a.refineryBatchId ?? null,
      }
    })

    for (const r of rows) {
      summaryByType[r.type].count += 1
      summaryByType[r.type].totalDwt += r.dwt
      summaryByType[r.type].totalPaid += r.totalPaid
    }

    
    
    
    
    const byBatchId = new Map<string, AdjustmentRow[]>()
    for (const r of rows) {
      const effectiveBatchId = r.refineryBatchId ?? `legacy-${r.id}`
      const existing = byBatchId.get(effectiveBatchId)
      if (existing) existing.push(r)
      else byBatchId.set(effectiveBatchId, [r])
    }

    const batches: RefineryBatch[] = Array.from(byBatchId.entries()).map(([batchId, batchRows]) => {
      
      const createdAt = batchRows
        .map((r) => r.createdAt)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      
      const status: RefinerySettlementStatus = batchRows.some((x) => x.status === "OPENED") ? "OPENED" : "CLOSED"
      
      const sortedRows = batchRows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return { batchId, createdAt, status, rows: sortedRows }
    })

    
    batches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ batches, summaryByType })
  } catch (error) {
    console.error("Error fetching refinery settlement:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

