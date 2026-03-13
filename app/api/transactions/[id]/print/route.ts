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
    const existing = await prisma.transaction.findUnique({
      where: { id },
    })
    if (!existing) {
      return NextResponse.json({ message: "Transaction not found" }, { status: 404 })
    }
    if (existing.status !== "PENDING_APPROVAL" && existing.status !== "OPEN" && existing.status !== "APPROVED") {
      return NextResponse.json({ message: "Transaction is not available to print" }, { status: 400 })
    }

    if (session.role === "STAFF") {
      const approved = await prisma.transactionApprovalRequest.findFirst({
        where: {
          transactionId: id,
          requestedByUserId: session.id,
          status: "APPROVED",
        },
      })
      if (!approved) {
        return NextResponse.json(
          { message: "This transaction requires admin approval before printing" },
          { status: 403 }
        )
      }
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: { 
        status: "PRINTED",
        completedByUserId: session.id,
        completedAt: new Date(),
      },
      include: {
        completedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    })
    try {
      const io = getIO()
      const printedByName =
        [transaction.completedBy?.firstName, transaction.completedBy?.lastName]
          .filter(Boolean)
          .join(" ") || transaction.completedBy?.email || "Admin"

      
      io.to(`tx:${id}`).emit("transaction_changed", { transactionId: id })
      io.to(`tx:${id}`).emit("transaction_printed", {
        transactionId: id,
        printedByName,
      })

      
      try {
        const approval = await prisma.transactionApprovalRequest.findFirst({
          where: { transactionId: id, status: "APPROVED" },
          orderBy: { respondedAt: "desc" },
          include: { requestedBy: { select: { id: true } } },
        })
        if (approval?.requestedBy?.id) {
          io.to(`staff:${approval.requestedBy.id}`).emit("transaction_printed", {
            transactionId: id,
            printedByName,
          })
        }
      } catch (innerError) {
        console.error("Error emitting transaction_printed event:", innerError)
      }
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

