import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getIO } from "@/lib/ioServer"

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
    const body = await request.json()
    const { status } = body

    // Build update data object
    const updateData: any = {}
    
    if (status && ["OPEN", "PRINTED", "VOID"].includes(status)) {
      updateData.status = status
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "No valid fields to update" },
        { status: 400 }
      )
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
    })

    // Emit socket event after successful status update
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

    // Delete transaction (line items will be deleted via cascade)
    await prisma.transaction.delete({
      where: { id },
    })

    // Emit socket event after successful deletion
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




