import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"

function parseDayStart(value: string | null): Date | null {
  if (!value) return null
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date
}

function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  const d = String(date.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")
    const all = searchParams.get("all") === "1" || searchParams.get("all") === "true"

    const where: { date?: { gte?: Date; lte?: Date } } = {}

    if (!all) {
      const from = parseDayStart(fromParam)
      const to = parseDayStart(toParam)
      if (fromParam && !from) {
        return NextResponse.json({ message: "Invalid from date" }, { status: 400 })
      }
      if (toParam && !to) {
        return NextResponse.json({ message: "Invalid to date" }, { status: 400 })
      }
      if (from && to && from > to) {
        return NextResponse.json({ message: "from must be on or before to" }, { status: 400 })
      }
      if (from || to) {
        where.date = {}
        if (from) where.date.gte = from
        if (to) where.date.lte = to
      }
    }

    const rows = await prisma.dailyPrice.findMany({
      where,
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        gold: true,
        silver: true,
        platinum: true,
      },
    })

    return NextResponse.json({
      prices: rows.map((row) => ({
        id: row.id,
        date: formatDateOnly(row.date),
        gold: row.gold,
        silver: row.silver,
        platinum: row.platinum,
      })),
    })
  } catch (error) {
    console.error("Error fetching price history:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
