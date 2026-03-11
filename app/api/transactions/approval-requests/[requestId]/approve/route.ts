import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getIO } from "@/lib/ioServer"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await requireAuth()
    if (session.role !== "ADMIN") {
      return NextResponse.json({ message: "Only admin can approve" }, { status: 403 })
    }
    const { requestId } = await params
    const body = await request.json().catch(() => ({})) as { edited?: boolean }
    const edited = body?.edited === true

    const approvalRequest = await prisma.transactionApprovalRequest.findUnique({
      where: { id: requestId },
      include: { transaction: true, requestedBy: { select: { id: true } } },
    })
    if (!approvalRequest) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 })
    }
    if (approvalRequest.requestedToUserId !== session.id) {
      return NextResponse.json({ message: "Not your request" }, { status: 403 })
    }
    if (approvalRequest.status !== "PENDING") {
      return NextResponse.json({ message: "Request already responded" }, { status: 400 })
    }
    const updated = await prisma.transactionApprovalRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        respondedAt: new Date(),
        adminEditedAt: edited ? new Date() : null,
      },
    })
    await prisma.transaction.update({
      where: { id: approvalRequest.transactionId },
      data: { status: "APPROVED" },
    })
    try {
      const io = getIO()
      const payload = {
        transactionId: approvalRequest.transactionId,
        status: "APPROVED",
        edited: !!updated.adminEditedAt,
      }
      io.to(`tx:${approvalRequest.transactionId}`).emit("approval_status", payload)
      io.to(`staff:${approvalRequest.requestedByUserId}`).emit("approval_status", payload)
      io.to(`tx:${approvalRequest.transactionId}`).emit("transaction_changed", { transactionId: approvalRequest.transactionId })
      io.emit("transaction_changed", { transactionId: approvalRequest.transactionId })
    } catch (e) {
      console.error("Error emitting approval:", e)
    }
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error approving request:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
