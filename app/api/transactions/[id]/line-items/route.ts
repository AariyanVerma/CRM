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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const referer = request.headers.get('referer') || 'unknown'
  console.log(`[API] GET /api/transactions/${id}/line-items - Referer: ${referer.substring(0, 100)}`)
  
  try {
    const session = await requireAuth()
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
    const transaction = await prisma.transaction.findUnique({
      where: { id },
    })

    if (!transaction) {
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

    const parsedDwt = parseFloat(dwt) || 0
    let pricePerDWT = 0
    
    if (transaction.type === "SCRAP") {
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
    const lineTotal = transaction.type === "MELT" 
      ? pricePerDWT 
      : calculateLineTotal(pricePerDWT, parsedDwt)
    const existingItem = await prisma.lineItem.findFirst({
      where: {
        transactionId: id,
        metalType,
        purityLabel,
      },
    })

    if (existingItem) {
      if (transaction.type === "SCRAP" && (dwt === 0 || dwt === "")) {
        await prisma.lineItem.delete({
          where: { id: existingItem.id },
        })
        try {
          const io = getIO()
          io.to(`tx:${id}`).emit("line_items_changed", { transactionId: id })
        } catch (error) {
          console.error("Error emitting socket event:", error)
        }
        
        return NextResponse.json({ deleted: true })
      } else {
        const updateData: any = {
          dwt: parsedDwt,
          pricePerOz: pricePerDWT,
          lineTotal,
        }
        if (transaction.type === "MELT") {
          const purityPct = purityPercentage !== undefined && purityPercentage !== null 
            ? parseFloat(purityPercentage.toString()) 
            : 0
          updateData.purityPercentage = purityPct
        }
        
        const updated = await prisma.lineItem.update({
          where: { id: existingItem.id },
          data: updateData,
        })
        try {
          const io = getIO()
          io.to(`tx:${id}`).emit("line_items_changed", { transactionId: id })
        } catch (error) {
          console.error("Error emitting socket event:", error)
        }
        
        return NextResponse.json(updated)
      }
    } else {
      if (transaction.type === "SCRAP" && (dwt === 0 || dwt === "")) {
        return NextResponse.json({ skipped: true })
      }
      const createData: any = {
        transactionId: id,
        metalType,
        purityLabel,
        dwt: parsedDwt,
        pricePerOz: pricePerDWT,
        lineTotal,
      }
      if (transaction.type === "MELT") {
        const purityPct = purityPercentage !== undefined && purityPercentage !== null 
          ? parseFloat(purityPercentage.toString()) 
          : 0
        createData.purityPercentage = purityPct
      }
      
      const created = await prisma.lineItem.create({
        data: createData,
      })
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


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    if (session.role !== "ADMIN") {
      return NextResponse.json({ message: "Only admin can replace line items" }, { status: 403 })
    }
    const { id } = await params
    const transaction = await prisma.transaction.findUnique({ where: { id } })
    if (!transaction) {
      return NextResponse.json({ message: "Transaction not found" }, { status: 404 })
    }
    if (transaction.status !== "PENDING_APPROVAL") {
      return NextResponse.json(
        { message: "Transaction must be pending approval to replace line items" },
        { status: 400 }
      )
    }
    const body = await request.json().catch(() => ({})) as { lineItems?: Array<{ metalType: string; purityLabel: string; dwt: number; pricePerOz: number; lineTotal: number; purityPercentage?: number | null }> }
    const lineItems = Array.isArray(body.lineItems) ? body.lineItems : []
    await prisma.lineItem.deleteMany({ where: { transactionId: id } })
    const created = []
    for (const item of lineItems) {
      const metalType = String(item.metalType).toUpperCase() as "GOLD" | "SILVER" | "PLATINUM"
      if (!["GOLD", "SILVER", "PLATINUM"].includes(metalType)) continue
      const dwt = Number(item.dwt) || 0
      if (transaction.type === "SCRAP" && dwt <= 0) continue
      const createData: {
        transactionId: string
        metalType: "GOLD" | "SILVER" | "PLATINUM"
        purityLabel: string
        dwt: number
        pricePerOz: number
        lineTotal: number
        purityPercentage?: number
      } = {
        transactionId: id,
        metalType,
        purityLabel: String(item.purityLabel),
        dwt,
        pricePerOz: Number(item.pricePerOz) || 0,
        lineTotal: Number(item.lineTotal) || 0,
      }
      if (transaction.type === "MELT" && item.purityPercentage != null) {
        createData.purityPercentage = Number(item.purityPercentage) || 0
      }
      const c = await prisma.lineItem.create({ data: createData })
      created.push(c)
    }
    try {
      const io = getIO()
      io.to(`tx:${id}`).emit("line_items_changed", { transactionId: id })
      io.to(`tx:${id}`).emit("transaction_changed", { transactionId: id })
    } catch (e) {
      console.error("Error emitting socket event:", e)
    }
    return NextResponse.json({ lineItems: created })
  } catch (error) {
    console.error("Error replacing line items:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
