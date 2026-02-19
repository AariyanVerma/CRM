import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // TEMPORARY: Log to identify runaway requests
  const referer = request.headers.get('referer') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  console.log(`[API] GET /api/prices/current - Referer: ${referer.substring(0, 100)}`)
  
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Get the latest daily price with updatedAt timestamp
    const latestPrice = await prisma.dailyPrice.findFirst({
      orderBy: { date: 'desc' },
      select: {
        gold: true,
        silver: true,
        platinum: true,
        scrapGoldPercentage: true,
        scrapSilverPercentage: true,
        scrapPlatinumPercentage: true,
        meltGoldPercentage: true,
        meltSilverPercentage: true,
        meltPlatinumPercentage: true,
        updatedAt: true,
      },
    })

    if (!latestPrice) {
      return NextResponse.json({
        gold: 2000,
        silver: 25,
        platinum: 1000,
        scrapGoldPercentage: 95,
        scrapSilverPercentage: 95,
        scrapPlatinumPercentage: 95,
        meltGoldPercentage: 95,
        meltSilverPercentage: 95,
        meltPlatinumPercentage: 95,
        timestamp: Date.now(),
      })
    }

    // Add cache headers to prevent browser caching, but allow very short server-side caching
    return NextResponse.json({
      gold: latestPrice.gold,
      silver: latestPrice.silver,
      platinum: latestPrice.platinum,
      scrapGoldPercentage: latestPrice.scrapGoldPercentage,
      scrapSilverPercentage: latestPrice.scrapSilverPercentage,
      scrapPlatinumPercentage: latestPrice.scrapPlatinumPercentage,
      meltGoldPercentage: latestPrice.meltGoldPercentage,
      meltSilverPercentage: latestPrice.meltSilverPercentage,
      meltPlatinumPercentage: latestPrice.meltPlatinumPercentage,
      timestamp: latestPrice.updatedAt.getTime(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error("Error fetching current prices:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

