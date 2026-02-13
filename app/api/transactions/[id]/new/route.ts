import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()

    const { id } = await params
    // Get existing transaction
    const existing = await prisma.transaction.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { message: "Transaction not found" },
        { status: 404 }
      )
    }

    // Get today's prices
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayPrice = await prisma.dailyPrice.findFirst({
      where: {
        date: { lte: today },
      },
      orderBy: { date: "desc" },
    })

    if (!todayPrice) {
      return NextResponse.json(
        { message: "No prices set for today" },
        { status: 400 }
      )
    }

    // Close existing transaction
    await prisma.transaction.update({
      where: { id },
      data: { status: "PRINTED" },
    })

    // Create new transaction
    const newTransaction = await prisma.transaction.create({
      data: {
        customerId: existing.customerId,
        createdByUserId: session.id,
        type: existing.type,
        status: "OPEN",
        goldSpot: todayPrice.gold,
        silverSpot: todayPrice.silver,
        platinumSpot: todayPrice.platinum,
      },
    })

    return NextResponse.json(newTransaction)
  } catch (error) {
    console.error("Error creating new transaction:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

