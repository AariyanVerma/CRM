import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getIO } from "@/lib/ioServer"
import {
  calculateScrapGoldPricePerDWT,
  calculateScrapSilverPricePerDWT,
  calculateScrapPlatinumPricePerDWT,
  calculateMeltGoldPricePerDWT,
  calculateMeltSilverPricePerDWT,
  calculateMeltPlatinumPricePerDWT,
  calculateLineTotal,
} from "@/lib/pricing"

// GET endpoint to fetch line items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    // Get transaction with line items
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        lineItems: {
          orderBy: [
            { metalType: 'asc' },
            { purityLabel: 'asc' },
          ],
        },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { message: "Transaction not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      lineItems: transaction.lineItems,
      updatedAt: transaction.updatedAt,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error("Error fetching line items:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST endpoint to create/update line items
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()

    const { id } = await params
    const body = await request.json()
    const { metalType, purityLabel, dwt, purityPercentage } = body

    if (!metalType || !purityLabel || dwt === undefined) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      )
    }

    // Get transaction with price snapshots
    const transaction = await prisma.transaction.findUnique({
      where: { id },
    })

    if (!transaction) {
      return NextResponse.json(
        { message: "Transaction not found" },
        { status: 404 }
      )
    }

    // Get today's DailyPrice for percentages
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayPrice = await prisma.dailyPrice.findFirst({
      where: {
        date: { lte: today },
      },
      orderBy: { date: "desc" },
    })

    const parsedDwt = parseFloat(dwt) || 0

    // Calculate price per DWT based on transaction type and metal type
    let pricePerDWT = 0
    
    if (transaction.type === "SCRAP") {
      // Use SCRAP formulas - get percentage from DailyPrice
      const percentageKey = `scrap${metalType.charAt(0) + metalType.slice(1).toLowerCase()}Percentage` as keyof typeof todayPrice
      const percentage = todayPrice ? (todayPrice[percentageKey] as number) ?? 95 : 95
      
      if (metalType === "GOLD") {
        pricePerDWT = calculateScrapGoldPricePerDWT(
          purityLabel as any,
          transaction.goldSpot,
          percentage
        )
      } else if (metalType === "SILVER") {
        pricePerDWT = calculateScrapSilverPricePerDWT(
          purityLabel as any,
          transaction.silverSpot,
          percentage
        )
      } else if (metalType === "PLATINUM") {
        pricePerDWT = calculateScrapPlatinumPricePerDWT(
          purityLabel as any,
          transaction.platinumSpot,
          percentage
        )
      }
    } else {
      // Use MELT formulas - get percentage from DailyPrice
      const purityPct = parseFloat(purityPercentage) || 0
      const percentageKey = `melt${metalType.charAt(0) + metalType.slice(1).toLowerCase()}Percentage` as keyof typeof todayPrice
      const percentage = todayPrice ? (todayPrice[percentageKey] as number) ?? 95 : 95
      
      if (metalType === "GOLD") {
        pricePerDWT = calculateMeltGoldPricePerDWT(
          transaction.goldSpot,
          purityPct,
          parsedDwt,
          percentage
        )
      } else if (metalType === "SILVER") {
        pricePerDWT = calculateMeltSilverPricePerDWT(
          transaction.silverSpot,
          purityPct,
          parsedDwt,
          percentage
        )
      } else if (metalType === "PLATINUM") {
        pricePerDWT = calculateMeltPlatinumPricePerDWT(
          transaction.platinumSpot,
          purityPct,
          parsedDwt,
          percentage
        )
      }
    }

    // For MELT transactions: lineTotal = pricePerDWT (no multiplication by dwt)
    // For SCRAP transactions: lineTotal = pricePerDWT × dwt
    const lineTotal = transaction.type === "MELT" 
      ? pricePerDWT 
      : calculateLineTotal(pricePerDWT, parsedDwt)

    // Upsert line item
    const existingItem = await prisma.lineItem.findFirst({
      where: {
        transactionId: id,
        metalType,
        purityLabel,
      },
    })

    if (existingItem) {
      // For MELT transactions, allow saving purity percentage even if DWT is 0
      // For SCRAP transactions, delete line item if DWT is 0
      if (transaction.type === "SCRAP" && (dwt === 0 || dwt === "")) {
        // Delete if DWT is 0 for SCRAP transactions
        await prisma.lineItem.delete({
          where: { id: existingItem.id },
        })
        
        // Emit socket event after successful deletion
        try {
          const io = getIO()
          io.to(`tx:${id}`).emit("line_items_changed", { transactionId: id })
        } catch (error) {
          console.error("Error emitting socket event:", error)
        }
        
        return NextResponse.json({ deleted: true })
      } else {
        // Update existing
        const updateData: any = {
          dwt: parsedDwt,
          pricePerOz: pricePerDWT,
          lineTotal,
        }
        
        // Include purity percentage for MELT transactions (always include, even if 0)
        if (transaction.type === "MELT") {
          // Always save purityPercentage, defaulting to 0 if not provided
          const purityPct = purityPercentage !== undefined && purityPercentage !== null 
            ? parseFloat(purityPercentage.toString()) 
            : 0
          updateData.purityPercentage = purityPct
        }
        
        const updated = await prisma.lineItem.update({
          where: { id: existingItem.id },
          data: updateData,
        })
        
        // Emit socket event after successful update
        try {
          const io = getIO()
          io.to(`tx:${id}`).emit("line_items_changed", { transactionId: id })
        } catch (error) {
          console.error("Error emitting socket event:", error)
        }
        
        return NextResponse.json(updated)
      }
    } else {
      // For MELT transactions, allow creating line item even if DWT is 0 (to save purity percentage)
      // For SCRAP transactions, skip if DWT is 0
      if (transaction.type === "SCRAP" && (dwt === 0 || dwt === "")) {
        return NextResponse.json({ skipped: true })
      }
      // Create new
      const createData: any = {
        transactionId: id,
        metalType,
        purityLabel,
        dwt: parsedDwt,
        pricePerOz: pricePerDWT,
        lineTotal,
      }
      
      // Include purity percentage for MELT transactions (always include, even if 0)
      if (transaction.type === "MELT") {
        // Always save purityPercentage, defaulting to 0 if not provided
        const purityPct = purityPercentage !== undefined && purityPercentage !== null 
          ? parseFloat(purityPercentage.toString()) 
          : 0
        createData.purityPercentage = purityPct
      }
      
      const created = await prisma.lineItem.create({
        data: createData,
      })
      
      // Emit socket event after successful creation
      try {
        const io = getIO()
        io.to(`tx:${id}`).emit("line_items_changed", { transactionId: id })
      } catch (error) {
        console.error("Error emitting socket event:", error)
      }
      
      return NextResponse.json(created)
    }
  } catch (error) {
    console.error("Error saving line item:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
