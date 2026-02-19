import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getIO } from "@/lib/ioServer"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()

    const { id } = await params
    const transaction = await prisma.transaction.update({
      where: { id },
      data: { 
        status: "PRINTED",
        completedByUserId: session.id,
        completedAt: new Date(),
      },
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
    console.error("Error marking transaction as printed:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

