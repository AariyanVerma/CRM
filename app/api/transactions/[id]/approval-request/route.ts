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
    if (session.role !== "STAFF") {
      return NextResponse.json({ message: "Only staff can request approval" }, { status: 403 })
    }
    const { id: transactionId } = await params
    const body = await request.json()
    const { requestedToUserId } = body as { requestedToUserId?: string }
    if (!requestedToUserId) {
      return NextResponse.json({ message: "requestedToUserId required" }, { status: 400 })
    }
    const admin = await prisma.user.findFirst({
      where: { id: requestedToUserId, role: "ADMIN" },
    })
    if (!admin) {
      return NextResponse.json({ message: "Admin not found" }, { status: 404 })
    }
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    })
    if (!transaction) {
      return NextResponse.json({ message: "Transaction not found" }, { status: 404 })
    }
    if (transaction.status !== "PENDING_APPROVAL" && transaction.status !== "OPEN") {
      return NextResponse.json({ message: "Transaction is not available for approval" }, { status: 400 })
    }
    const existing = await prisma.transactionApprovalRequest.findFirst({
      where: { transactionId, requestedByUserId: session.id },
      orderBy: { createdAt: "desc" },
    })
    if (existing?.status === "PENDING") {
      return NextResponse.json({ message: "A request is already pending" }, { status: 400 })
    }
    const approvalRequest = await prisma.transactionApprovalRequest.create({
      data: {
        transactionId,
        requestedByUserId: session.id,
        requestedToUserId: admin.id,
        status: "PENDING",
      },
      include: {
        requestedTo: { select: { firstName: true, lastName: true, email: true } },
        transaction: { select: { id: true, type: true } },
      },
    })
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: "PENDING_APPROVAL" },
    })
    try {
      const io = getIO()
      io.to(`admin:${admin.id}`).emit("approval_request_new", {
        requestId: approvalRequest.id,
        transactionId,
        transactionType: approvalRequest.transaction.type,
        requestedBy: session.id,
      })
    } catch (e) {
      console.error("Error emitting approval request:", e)
    }
    return NextResponse.json(approvalRequest)
  } catch (error) {
    console.error("Error creating approval request:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
