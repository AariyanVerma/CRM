import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getIO } from "@/lib/ioServer"

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()

    const body = await request.json()
    const { 
      gold, 
      silver, 
      platinum, 
      scrapGoldPercentage,
      scrapSilverPercentage,
      scrapPlatinumPercentage,
      meltGoldPercentage,
      meltSilverPercentage,
      meltPlatinumPercentage,
    } = body

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
        scrapGoldPercentage: scrapGoldPercentage !== undefined ? parseFloat(scrapGoldPercentage) : undefined,
        scrapSilverPercentage: scrapSilverPercentage !== undefined ? parseFloat(scrapSilverPercentage) : undefined,
        scrapPlatinumPercentage: scrapPlatinumPercentage !== undefined ? parseFloat(scrapPlatinumPercentage) : undefined,
        meltGoldPercentage: meltGoldPercentage !== undefined ? parseFloat(meltGoldPercentage) : undefined,
        meltSilverPercentage: meltSilverPercentage !== undefined ? parseFloat(meltSilverPercentage) : undefined,
        meltPlatinumPercentage: meltPlatinumPercentage !== undefined ? parseFloat(meltPlatinumPercentage) : undefined,
        createdByUserId: session.id,
      },
      create: {
        date: today,
        gold: parseFloat(gold),
        silver: parseFloat(silver),
        platinum: parseFloat(platinum),
        scrapGoldPercentage: scrapGoldPercentage !== undefined ? parseFloat(scrapGoldPercentage) : 95,
        scrapSilverPercentage: scrapSilverPercentage !== undefined ? parseFloat(scrapSilverPercentage) : 95,
        scrapPlatinumPercentage: scrapPlatinumPercentage !== undefined ? parseFloat(scrapPlatinumPercentage) : 95,
        meltGoldPercentage: meltGoldPercentage !== undefined ? parseFloat(meltGoldPercentage) : 95,
        meltSilverPercentage: meltSilverPercentage !== undefined ? parseFloat(meltSilverPercentage) : 95,
        meltPlatinumPercentage: meltPlatinumPercentage !== undefined ? parseFloat(meltPlatinumPercentage) : 95,
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

    // Emit socket event after successful price update
    try {
      const io = getIO()
      io.to("prices").emit("prices_changed", { 
        updatedAt: price.updatedAt.getTime() 
      })
    } catch (error) {
      console.error("Error emitting socket event:", error)
    }

    return NextResponse.json({
      id: price.id,
      date: price.date,
      gold: price.gold,
      silver: price.silver,
      platinum: price.platinum,
      scrapGoldPercentage: price.scrapGoldPercentage,
      scrapSilverPercentage: price.scrapSilverPercentage,
      scrapPlatinumPercentage: price.scrapPlatinumPercentage,
      meltGoldPercentage: price.meltGoldPercentage,
      meltSilverPercentage: price.meltSilverPercentage,
      meltPlatinumPercentage: price.meltPlatinumPercentage,
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
    const { 
      metalType, 
      price, 
      transactionType,
      scrapGoldPercentage,
      scrapSilverPercentage,
      scrapPlatinumPercentage,
      meltGoldPercentage,
      meltSilverPercentage,
      meltPlatinumPercentage,
    } = body

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

    // Get existing price or use defaults
    const existing = await prisma.dailyPrice.findUnique({
      where: { date: today },
    })

    const updateData: any = {
      createdByUserId: session.id,
    }

    if (metalType.toLowerCase() === "gold") {
      updateData.gold = parseFloat(price)
    } else if (metalType.toLowerCase() === "silver") {
      updateData.silver = parseFloat(price)
    } else if (metalType.toLowerCase() === "platinum") {
      updateData.platinum = parseFloat(price)
    }

    // Handle percentage updates based on transaction type and metal type
    if (transactionType && metalType) {
      const percentageKey = `${transactionType.toLowerCase()}${metalType.charAt(0).toUpperCase() + metalType.slice(1).toLowerCase()}Percentage`
      // Check for percentage in body with the dynamic key first, then fallback to explicit fields
      const percentageValue = body[percentageKey] !== undefined && body[percentageKey] !== null ? body[percentageKey] : 
        (scrapGoldPercentage !== undefined && scrapGoldPercentage !== null ? scrapGoldPercentage :
        scrapSilverPercentage !== undefined && scrapSilverPercentage !== null ? scrapSilverPercentage :
        scrapPlatinumPercentage !== undefined && scrapPlatinumPercentage !== null ? scrapPlatinumPercentage :
        meltGoldPercentage !== undefined && meltGoldPercentage !== null ? meltGoldPercentage :
        meltSilverPercentage !== undefined && meltSilverPercentage !== null ? meltSilverPercentage :
        meltPlatinumPercentage !== undefined && meltPlatinumPercentage !== null ? meltPlatinumPercentage : undefined)
      
      if (percentageValue !== undefined && percentageValue !== null) {
        // Use explicit field names for Prisma (can't use dynamic keys)
        if (percentageKey === "scrapGoldPercentage") {
          updateData.scrapGoldPercentage = parseFloat(percentageValue)
        } else if (percentageKey === "scrapSilverPercentage") {
          updateData.scrapSilverPercentage = parseFloat(percentageValue)
        } else if (percentageKey === "scrapPlatinumPercentage") {
          updateData.scrapPlatinumPercentage = parseFloat(percentageValue)
        } else if (percentageKey === "meltGoldPercentage") {
          updateData.meltGoldPercentage = parseFloat(percentageValue)
        } else if (percentageKey === "meltSilverPercentage") {
          updateData.meltSilverPercentage = parseFloat(percentageValue)
        } else if (percentageKey === "meltPlatinumPercentage") {
          updateData.meltPlatinumPercentage = parseFloat(percentageValue)
        }
      }
    }

    // Ensure we have all required fields for create
    const createData: any = {
      date: today,
      gold: metalType.toLowerCase() === "gold" ? parseFloat(price) : existing?.gold || 2000,
      silver: metalType.toLowerCase() === "silver" ? parseFloat(price) : existing?.silver || 25,
      platinum: metalType.toLowerCase() === "platinum" ? parseFloat(price) : existing?.platinum || 1000,
      scrapGoldPercentage: existing?.scrapGoldPercentage || 95,
      scrapSilverPercentage: existing?.scrapSilverPercentage || 95,
      scrapPlatinumPercentage: existing?.scrapPlatinumPercentage || 95,
      meltGoldPercentage: existing?.meltGoldPercentage || 95,
      meltSilverPercentage: existing?.meltSilverPercentage || 95,
      meltPlatinumPercentage: existing?.meltPlatinumPercentage || 95,
      createdByUserId: session.id,
    }
    
    // If we're updating a percentage, include it in create data too
    if (transactionType && metalType) {
      const percentageKey = `${transactionType.toLowerCase()}${metalType.charAt(0).toUpperCase() + metalType.slice(1).toLowerCase()}Percentage`
      const percentageValue = body[percentageKey] !== undefined && body[percentageKey] !== null ? body[percentageKey] : 
        (scrapGoldPercentage !== undefined && scrapGoldPercentage !== null ? scrapGoldPercentage :
        scrapSilverPercentage !== undefined && scrapSilverPercentage !== null ? scrapSilverPercentage :
        scrapPlatinumPercentage !== undefined && scrapPlatinumPercentage !== null ? scrapPlatinumPercentage :
        meltGoldPercentage !== undefined && meltGoldPercentage !== null ? meltGoldPercentage :
        meltSilverPercentage !== undefined && meltSilverPercentage !== null ? meltSilverPercentage :
        meltPlatinumPercentage !== undefined && meltPlatinumPercentage !== null ? meltPlatinumPercentage : undefined)
      
      if (percentageValue !== undefined && percentageValue !== null) {
        if (percentageKey === "scrapGoldPercentage") {
          createData.scrapGoldPercentage = parseFloat(percentageValue)
        } else if (percentageKey === "scrapSilverPercentage") {
          createData.scrapSilverPercentage = parseFloat(percentageValue)
        } else if (percentageKey === "scrapPlatinumPercentage") {
          createData.scrapPlatinumPercentage = parseFloat(percentageValue)
        } else if (percentageKey === "meltGoldPercentage") {
          createData.meltGoldPercentage = parseFloat(percentageValue)
        } else if (percentageKey === "meltSilverPercentage") {
          createData.meltSilverPercentage = parseFloat(percentageValue)
        } else if (percentageKey === "meltPlatinumPercentage") {
          createData.meltPlatinumPercentage = parseFloat(percentageValue)
        }
      }
    }

    const priceData = await prisma.dailyPrice.upsert({
      where: { date: today },
      update: updateData,
      create: createData,
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

    // Emit socket event after successful price update
    try {
      const io = getIO()
      io.to("prices").emit("prices_changed", { 
        updatedAt: priceData.updatedAt.getTime() 
      })
    } catch (error) {
      console.error("Error emitting socket event:", error)
    }

    return NextResponse.json(priceData)
  } catch (error) {
    console.error("Error updating price:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

