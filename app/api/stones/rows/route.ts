import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const fromStr = searchParams.get("from")
    const toStr = searchParams.get("to")
    const from = fromStr ? new Date(fromStr) : undefined
    const to = toStr ? new Date(toStr) : undefined
    const metal = searchParams.get("metal")
    const purity = searchParams.get("purity")
    const where: { date?: { gte?: Date; lte?: Date }; metal?: string; purity?: { contains: string; mode?: "insensitive" } } = {}
    if (from) where.date = { ...where.date, gte: from }
    if (to) where.date = { ...where.date, lte: to }
    if (metal && metal !== "ALL") where.metal = metal
    if (purity != null && purity !== "") where.purity = { contains: purity, mode: "insensitive" }
    const rows = await prisma.stonesSaveRow.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [{ date: "desc" }, { id: "asc" }],
      include: { stonesSave: { select: { id: true, createdAt: true } } },
    })
    return NextResponse.json(rows)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
}
