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
    const existing = await prisma.transaction.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { message: "Transaction not found" },
        { status: 404 }
      )
    }
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
    await prisma.transaction.update({
      where: { id },
      data: { 
        status: "PRINTED",
        completedByUserId: session.id,
        completedAt: new Date(),
      },
    })
    const newTransaction = await prisma.transaction.create({
      data: {
        customerId: existing.customerId,
        createdByUserId: session.id,
        type: existing.type,
        status: "OPEN",
        goldSpot: todayPrice.gold,
        silverSpot: todayPrice.silver,
        platinumSpot: todayPrice.platinum,
        scrapGoldPercentage: existing.scrapGoldPercentage ?? todayPrice.scrapGoldPercentage ?? 95,
        scrapSilverPercentage: existing.scrapSilverPercentage ?? todayPrice.scrapSilverPercentage ?? 95,
        scrapPlatinumPercentage: existing.scrapPlatinumPercentage ?? todayPrice.scrapPlatinumPercentage ?? 95,
        meltGoldPercentage: existing.meltGoldPercentage ?? todayPrice.meltGoldPercentage ?? 95,
        meltSilverPercentage: existing.meltSilverPercentage ?? todayPrice.meltSilverPercentage ?? 95,
        meltPlatinumPercentage: existing.meltPlatinumPercentage ?? todayPrice.meltPlatinumPercentage ?? 95,
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

