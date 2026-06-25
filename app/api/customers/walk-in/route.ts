import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

function formatWalkInTimestamp() {
  const now = new Date()
  return now.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json().catch(() => ({})) as {
      fullName?: string
      phoneNumber?: string
      skipDetails?: boolean
    }

    const skipDetails = body.skipDetails === true
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : ""
    const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : ""

    if (skipDetails) {
      const customer = await prisma.customer.create({
        data: {
          fullName: `Walk-in ${formatWalkInTimestamp()}`,
          phoneNumber: "—",
          address: "Not provided",
          isWalkIn: true,
          detailsSkipped: true,
        },
      })
      return NextResponse.json({ customer })
    }

    if (!fullName && !phoneNumber) {
      return NextResponse.json(
        { message: "Enter a name or phone number, or use Skip details" },
        { status: 400 }
      )
    }

    const customer = await prisma.customer.create({
      data: {
        fullName: fullName || `Walk-in ${formatWalkInTimestamp()}`,
        phoneNumber: phoneNumber || "—",
        address: "Not provided",
        isWalkIn: true,
        detailsSkipped: !fullName || !phoneNumber,
      },
    })

    return NextResponse.json({ customer })
  } catch (error) {
    console.error("Error creating walk-in customer:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
