import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateToken, generateShortSlug } from "@/lib/utils"

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

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      )
    }

    await prisma.membershipCard.updateMany({
      where: {
        customerId,
        status: "ACTIVE",
      },
      data: {
        status: "DISABLED",
      },
    })

    const token = generateToken()
    const scanSlug = generateShortSlug(12)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const card = await prisma.membershipCard.create({
      data: {
        token,
        scanSlug,
        customerId,
        status: "ACTIVE",
      },
    })

    return NextResponse.json({
      ...card,
      scanUrl: `${baseUrl}/scan/${scanSlug}`,
    })
  } catch (error) {
    console.error("Error issuing card:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

