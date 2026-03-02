import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateToken } from "@/lib/utils"

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session.role !== "ADMIN" && session.canIssueCard !== true) {
      return NextResponse.json(
        { message: "You do not have permission to issue cards" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { customerId } = body

    if (!customerId) {
      return NextResponse.json(
        { message: "Missing customerId" },
        { status: 400 }
      )
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      )
    }

    // Disable existing active cards
    await prisma.membershipCard.updateMany({
      where: {
        customerId,
        status: "ACTIVE",
      },
      data: {
        status: "DISABLED",
      },
    })

    // Generate new token and create card
    const token = generateToken()
    const card = await prisma.membershipCard.create({
      data: {
        token,
        customerId,
        status: "ACTIVE",
      },
    })

    return NextResponse.json({
      ...card,
      scanUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/scan/${token}`,
    })
  } catch (error) {
    console.error("Error issuing card:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

