import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter")

    if (session.role === "ADMIN") {
      const where: { requestedToUserId: string; status?: "PENDING" } = {
        requestedToUserId: session.id,
      }
      if (filter === "pending") where.status = "PENDING"
      const requests = await prisma.transactionApprovalRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          transaction: {
            include: {
              customer: { select: { id: true, fullName: true, businessName: true, isBusiness: true } },
              lineItems: true,
            },
          },
          requestedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      })
      return NextResponse.json(requests)
    }

    const where: { requestedByUserId: string; status?: "PENDING" } = {
      requestedByUserId: session.id,
    }
    if (filter === "pending") where.status = "PENDING"
    const requests = await prisma.transactionApprovalRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        transaction: { select: { id: true, type: true } },
        requestedTo: { select: { firstName: true, lastName: true, email: true } },
      },
    })
    return NextResponse.json(requests)
  } catch (error) {
    console.error("Error listing approval requests:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
