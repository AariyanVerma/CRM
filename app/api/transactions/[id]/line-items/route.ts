import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getIO } from "@/lib/ioServer"
import {
  calculateGoldPricePerOz,
  calculateSilverPricePerOz,
  calculatePlatinumPricePerOz,
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
    const { metalType, purityLabel, dwt } = body

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

    // Get latest percentage from DailyPrice for gold calculations
    let percentage = 95
    if (metalType === "GOLD") {
      const latestPrice = await prisma.dailyPrice.findFirst({
        orderBy: { date: 'desc' },
        select: { percentage: true },
      })
      percentage = latestPrice?.percentage || 95
    }

    // Calculate price per oz based on metal type
    let pricePerOz = 0
    if (metalType === "GOLD") {
      pricePerOz = calculateGoldPricePerOz(
        purityLabel as any,
        transaction.goldSpot,
        percentage
      )
    } else if (metalType === "SILVER") {
      pricePerOz = calculateSilverPricePerOz(
        purityLabel as any,
        transaction.silverSpot
      )
    } else if (metalType === "PLATINUM") {
      pricePerOz = calculatePlatinumPricePerOz(
        purityLabel as any,
        transaction.platinumSpot,
        parseFloat(dwt) || 0
      )
    }

    const lineTotal = calculateLineTotal(pricePerOz, parseFloat(dwt) || 0)

    // Upsert line item
    const existingItem = await prisma.lineItem.findFirst({
      where: {
        transactionId: id,
        metalType,
        purityLabel,
      },
    })

    if (existingItem) {
      if (dwt === 0 || dwt === "") {
        // Delete if DWT is 0
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
        const updated = await prisma.lineItem.update({
          where: { id: existingItem.id },
          data: {
            dwt: parseFloat(dwt),
            pricePerOz,
            lineTotal,
          },
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
      if (dwt === 0 || dwt === "") {
        return NextResponse.json({ skipped: true })
      }
      // Create new
      const created = await prisma.lineItem.create({
        data: {
          transactionId: id,
          metalType,
          purityLabel,
          dwt: parseFloat(dwt),
          pricePerOz,
          lineTotal,
        },
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
