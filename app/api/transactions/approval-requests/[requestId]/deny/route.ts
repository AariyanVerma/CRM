import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getIO } from "@/lib/ioServer"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await requireAuth()
    if (session.role !== "ADMIN") {
      return NextResponse.json({ message: "Only admin can deny" }, { status: 403 })
    }
    const { requestId } = await params
    const approvalRequest = await prisma.transactionApprovalRequest.findUnique({
      where: { id: requestId },
      include: { requestedBy: { select: { id: true } } },
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
    await prisma.transaction.update({
      where: { id: approvalRequest.transactionId },
      data: { status: "VOID" },
    })
    const updated = await prisma.transactionApprovalRequest.update({
      where: { id: requestId },
      data: { status: "DENIED", respondedAt: new Date() },
    })
    try {
      const io = getIO()
      io.to(`tx:${approvalRequest.transactionId}`).emit("approval_status", {
        transactionId: approvalRequest.transactionId,
        status: "DENIED",
      })
      io.to(`staff:${approvalRequest.requestedByUserId}`).emit("approval_status", {
        transactionId: approvalRequest.transactionId,
        status: "DENIED",
      })
    } catch (e) {
      console.error("Error emitting denial:", e)
    }
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error denying request:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
