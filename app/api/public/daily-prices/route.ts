import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  calculateScrapGoldPricePerDWT,
  calculateScrapSilverPricePerDWT,
  type GoldPurity,
  type SilverPurity,
} from "@/lib/pricing"
import { GRAMS_PER_DWT } from "@/lib/weight-units"

export const dynamic = "force-dynamic"

const PUBLIC_GOLD_PURITIES: GoldPurity[] = ["10K", "14K", "18K", "22K", "24K"]
const PUBLIC_SILVER_PURITIES: SilverPurity[] = ["800", "900", "925"]

function corsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get("origin") || ""
  const allowed = (process.env.PUBLIC_PRICES_ORIGINS || "http://localhost:3001,https://prices.newyorkgoldmarket.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  const allowOrigin = allowed.includes("*")
    ? "*"
    : allowed.includes(origin)
      ? origin
      : allowed[0] || "*"

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Vary: "Origin",
  }
}

function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  const d = String(date.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function pricePerGram(pricePerDwt: number): number {
  if (!Number.isFinite(pricePerDwt) || GRAMS_PER_DWT <= 0) return 0
  return pricePerDwt / GRAMS_PER_DWT
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}

export async function GET(request: NextRequest) {
  try {
    const latest = await prisma.dailyPrice.findFirst({
      orderBy: { date: "desc" },
      select: {
        date: true,
        gold: true,
        silver: true,
        platinum: true,
        scrapGoldPercentage: true,
        scrapSilverPercentage: true,
        updatedAt: true,
      },
    })

    const gold = latest?.gold ?? 0
    const silver = latest?.silver ?? 0
    const platinum = latest?.platinum ?? 0
    const scrapGoldPct = latest?.scrapGoldPercentage ?? 95
    const scrapSilverPct = latest?.scrapSilverPercentage ?? 95
    const date = latest ? formatDateOnly(latest.date) : formatDateOnly(new Date())
    const updatedAt = latest?.updatedAt.getTime() ?? Date.now()

    const onStone = PUBLIC_GOLD_PURITIES.map((purity) => {
      const dwt = calculateScrapGoldPricePerDWT(purity, gold, scrapGoldPct)
      return {
        purity,
        dwt: Math.round(dwt * 100) / 100,
        gram: Math.round(pricePerGram(dwt) * 100) / 100,
      }
    })

    const silverRows = PUBLIC_SILVER_PURITIES.map((purity) => {
      const dwt = calculateScrapSilverPricePerDWT(purity, silver, scrapSilverPct)
      return {
        purity,
        dwt: Math.round(dwt * 100) / 100,
        gram: Math.round(pricePerGram(dwt) * 100) / 100,
      }
    })

    return NextResponse.json(
      {
        date,
        updatedAt,
        spots: {
          gold: Math.round(gold * 100) / 100,
          silver: Math.round(silver * 100) / 100,
          platinum: Math.round(platinum * 100) / 100,
        },
        onStone,
        silver: silverRows,
      },
      { headers: corsHeaders(request) }
    )
  } catch (error) {
    console.error("Error fetching public daily prices:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: corsHeaders(request) }
    )
  }
}
