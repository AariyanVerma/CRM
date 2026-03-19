import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

type LineItemInput = {
  metalType: "GOLD" | "SILVER" | "PLATINUM"
  purityLabel: string
  dwt: number
  pricePerOz: number
  lineTotal: number
  purityPercentage?: number | null
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session.role !== "ADMIN") {
      return NextResponse.json({ message: "Only admin can create transactions from draft" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({})) as {
      customerId?: string
      type?: "SCRAP" | "MELT"
      lineItems?: LineItemInput[]
      percentages?: {
        scrapGoldPercentage?: number
        scrapSilverPercentage?: number
        scrapPlatinumPercentage?: number
        meltGoldPercentage?: number
        meltSilverPercentage?: number
        meltPlatinumPercentage?: number
      }
    }
    const { customerId, type, lineItems, percentages: bodyPercentages } = body

    if (!customerId || !type || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { message: "customerId, type, and non-empty lineItems array are required" },
        { status: 400 },
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayPrice = await prisma.dailyPrice.findFirst({
      where: { date: { lte: today } },
      orderBy: { date: "desc" },
    })
    if (!todayPrice) {
      return NextResponse.json({ message: "No prices set for today" }, { status: 400 })
    }

    let customer: { scrapGoldPercentageOverride?: number | null; scrapSilverPercentageOverride?: number | null; scrapPlatinumPercentageOverride?: number | null; meltGoldPercentageOverride?: number | null; meltSilverPercentageOverride?: number | null; meltPlatinumPercentageOverride?: number | null } | null = null
    try {
      customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          scrapGoldPercentageOverride: true,
          scrapSilverPercentageOverride: true,
          scrapPlatinumPercentageOverride: true,
          meltGoldPercentageOverride: true,
          meltSilverPercentageOverride: true,
          meltPlatinumPercentageOverride: true,
        },
      })
    } catch (e) {
      console.error("[create-from-draft] Failed to fetch customer overrides (run migration?):", e)
    }

    
    const scrapGoldPct =
      customer?.scrapGoldPercentageOverride ??
      bodyPercentages?.scrapGoldPercentage ??
      todayPrice.scrapGoldPercentage ??
      95
    const scrapSilverPct =
      customer?.scrapSilverPercentageOverride ??
      bodyPercentages?.scrapSilverPercentage ??
      todayPrice.scrapSilverPercentage ??
      95
    const scrapPlatinumPct =
      customer?.scrapPlatinumPercentageOverride ??
      bodyPercentages?.scrapPlatinumPercentage ??
      todayPrice.scrapPlatinumPercentage ??
      95
    const meltGoldPct =
      customer?.meltGoldPercentageOverride ??
      bodyPercentages?.meltGoldPercentage ??
      todayPrice.meltGoldPercentage ??
      95
    const meltSilverPct =
      customer?.meltSilverPercentageOverride ??
      bodyPercentages?.meltSilverPercentage ??
      todayPrice.meltSilverPercentage ??
      95
    const meltPlatinumPct =
      customer?.meltPlatinumPercentageOverride ??
      bodyPercentages?.meltPlatinumPercentage ??
      todayPrice.meltPlatinumPercentage ??
      95

    const transaction = await prisma.transaction.create({
      data: {
        customerId,
        createdByUserId: session.id,
        type,
        status: "OPEN",
        goldSpot: todayPrice.gold,
        silverSpot: todayPrice.silver,
        platinumSpot: todayPrice.platinum,
        scrapGoldPercentage: scrapGoldPct,
        scrapSilverPercentage: scrapSilverPct,
        scrapPlatinumPercentage: scrapPlatinumPct,
        meltGoldPercentage: meltGoldPct,
        meltSilverPercentage: meltSilverPct,
        meltPlatinumPercentage: meltPlatinumPct,
      },
    })

    const createdItems = await Promise.all(
      lineItems.map(async (item) => {
        const dwt = Number(item.dwt) || 0
        if (type === "SCRAP" && dwt <= 0) {
          return null
        }
        return prisma.lineItem.create({
          data: {
            transactionId: transaction.id,
            metalType: item.metalType,
            purityLabel: item.purityLabel,
            dwt,
            pricePerOz: Number(item.pricePerOz) || 0,
            lineTotal: Number(item.lineTotal) || 0,
            purityPercentage:
              type === "MELT" && item.purityPercentage != null
                ? Number(item.purityPercentage) || 0
                : null,
          },
        })
      }),
    )

    const filtered = createdItems.filter((i): i is NonNullable<typeof i> => !!i)

    return NextResponse.json({
      transaction: {
        ...transaction,
        lineItems: filtered,
      },
    })
  } catch (error) {
    console.error("Error creating transaction from draft:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

