import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getIO } from "@/lib/ioServer"
import { logTransactionAudit } from "@/lib/audit"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        lineItems: {
          orderBy: [
            { metalType: 'asc' },
            { purityLabel: 'asc' },
          ],
        },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { message: "Transaction not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(transaction, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error("Error fetching transaction:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin()
    const { id } = await params
    const body = await request.json().catch(() => ({})) as {
      status?: string
      percentages?: {
        scrapGoldPercentage?: number
        scrapSilverPercentage?: number
        scrapPlatinumPercentage?: number
        meltGoldPercentage?: number
        meltSilverPercentage?: number
        meltPlatinumPercentage?: number
      }
    }
    const { status, percentages: bodyPercentages } = body
    const updateData: Record<string, unknown> = {}

    if (status && ["OPEN", "PRINTED", "VOID", "APPROVED"].includes(status)) {
      updateData.status = status
    }

    if (bodyPercentages && typeof bodyPercentages === "object") {
      const n = (v: number | undefined) => (typeof v === "number" && !Number.isNaN(v) && v >= 0 && v <= 100 ? v : undefined)
      if (n(bodyPercentages.scrapGoldPercentage) !== undefined) updateData.scrapGoldPercentage = n(bodyPercentages.scrapGoldPercentage)
      if (n(bodyPercentages.scrapSilverPercentage) !== undefined) updateData.scrapSilverPercentage = n(bodyPercentages.scrapSilverPercentage)
      if (n(bodyPercentages.scrapPlatinumPercentage) !== undefined) updateData.scrapPlatinumPercentage = n(bodyPercentages.scrapPlatinumPercentage)
      if (n(bodyPercentages.meltGoldPercentage) !== undefined) updateData.meltGoldPercentage = n(bodyPercentages.meltGoldPercentage)
      if (n(bodyPercentages.meltSilverPercentage) !== undefined) updateData.meltSilverPercentage = n(bodyPercentages.meltSilverPercentage)
      if (n(bodyPercentages.meltPlatinumPercentage) !== undefined) updateData.meltPlatinumPercentage = n(bodyPercentages.meltPlatinumPercentage)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "No valid fields to update" },
        { status: 400 }
      )
    }

    const before = await prisma.transaction.findUnique({ where: { id }, select: { status: true } })
    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
    })
    if (updateData.status) {
      await logTransactionAudit(id, session.id, "STATUS_CHANGE", { status: before?.status }, { status: transaction.status })
    }
    try {
      const io = getIO()
      io.to(`tx:${id}`).emit("transaction_changed", { transactionId: id })
    } catch (error) {
      console.error("Error emitting socket event:", error)
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error("Error updating transaction:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin()
    const { id } = await params

    const before = await prisma.transaction.findUnique({
      where: { id },
      include: { customer: { select: { fullName: true } }, lineItems: { select: { id: true, metalType: true, lineTotal: true } } },
    })
    await prisma.transaction.delete({
      where: { id },
    })
    if (before) {
      await logTransactionAudit(id, session.id, "DELETE", {
        customerName: before.customer.fullName,
        lineItemsCount: before.lineItems.length,
        status: before.status,
      }, undefined)
    }
    try {
      const io = getIO()
      io.to(`tx:${id}`).emit("transaction_changed", { transactionId: id })
    } catch (error) {
      console.error("Error emitting socket event:", error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}




