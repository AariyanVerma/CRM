import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()

    const body = await request.json()
    const { gold, silver, platinum, percentage } = body

    if (!gold || !silver || !platinum) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const price = await prisma.dailyPrice.upsert({
      where: { date: today },
      update: {
        gold: parseFloat(gold),
        silver: parseFloat(silver),
        platinum: parseFloat(platinum),
        percentage: percentage !== undefined ? parseFloat(percentage) : undefined,
        createdByUserId: session.id,
      },
      create: {
        date: today,
        gold: parseFloat(gold),
        silver: parseFloat(silver),
        platinum: parseFloat(platinum),
        percentage: percentage !== undefined ? parseFloat(percentage) : 95,
        createdByUserId: session.id,
      },
    })

    // Update all OPEN transactions to use the new spot prices
    const updatedTransactions = await prisma.transaction.updateMany({
      where: {
        status: "OPEN",
      },
      data: {
        goldSpot: parseFloat(gold),
        silverSpot: parseFloat(silver),
        platinumSpot: parseFloat(platinum),
      },
    })

    return NextResponse.json({
      id: price.id,
      date: price.date,
      gold: price.gold,
      silver: price.silver,
      platinum: price.platinum,
      percentage: price.percentage,
    })
  } catch (error) {
    console.error("Error saving prices:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin()

    const body = await request.json()
    const { metalType, price, percentage } = body

    if (!metalType || price === undefined || price === null) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      )
    }

    if (!["gold", "silver", "platinum"].includes(metalType.toLowerCase())) {
      return NextResponse.json(
        { message: "Invalid metal type" },
        { status: 400 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const updateData: { gold?: number; silver?: number; platinum?: number; percentage?: number; createdByUserId: string } = {
      createdByUserId: session.id,
    }

    if (metalType.toLowerCase() === "gold") {
      updateData.gold = parseFloat(price)
      if (percentage !== undefined && percentage !== null) {
        updateData.percentage = parseFloat(percentage)
      }
    } else if (metalType.toLowerCase() === "silver") {
      updateData.silver = parseFloat(price)
    } else if (metalType.toLowerCase() === "platinum") {
      updateData.platinum = parseFloat(price)
    }

    // Get existing price or use defaults
    const existing = await prisma.dailyPrice.findUnique({
      where: { date: today },
    })

    const priceData = await prisma.dailyPrice.upsert({
      where: { date: today },
      update: updateData,
      create: {
        date: today,
        gold: metalType.toLowerCase() === "gold" ? parseFloat(price) : existing?.gold || 2000,
        silver: metalType.toLowerCase() === "silver" ? parseFloat(price) : existing?.silver || 25,
        platinum: metalType.toLowerCase() === "platinum" ? parseFloat(price) : existing?.platinum || 1000,
        percentage: existing?.percentage || 95,
        createdByUserId: session.id,
      },
    })

    // Update all OPEN transactions to use the new spot prices
    const updateTransactionData: { goldSpot?: number; silverSpot?: number; platinumSpot?: number } = {}
    if (metalType.toLowerCase() === "gold") {
      updateTransactionData.goldSpot = parseFloat(price)
    } else if (metalType.toLowerCase() === "silver") {
      updateTransactionData.silverSpot = parseFloat(price)
    } else if (metalType.toLowerCase() === "platinum") {
      updateTransactionData.platinumSpot = parseFloat(price)
    }

    await prisma.transaction.updateMany({
      where: {
        status: "OPEN",
      },
      data: updateTransactionData,
    })

    return NextResponse.json(priceData)
  } catch (error) {
    console.error("Error updating price:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

