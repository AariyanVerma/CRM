import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id: transactionId } = await params
    const request = await prisma.transactionApprovalRequest.findFirst({
      where: {
        transactionId,
        requestedByUserId: session.id,
      },
      orderBy: { createdAt: "desc" },
      include: {
        requestedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })
    if (!request) {
      return NextResponse.json({ status: null, request: null })
    }
    return NextResponse.json({
      status: request.status,
      request: {
        id: request.id,
        requestedToName: [request.requestedTo.firstName, request.requestedTo.lastName].filter(Boolean).join(" ") || request.requestedTo.email,
        createdAt: request.createdAt,
      },
    })
  } catch (error) {
    console.error("Error fetching approval status:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
