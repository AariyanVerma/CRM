import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { MetalType } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const saves = await prisma.stonesSave.findMany({
      orderBy: { createdAt: "desc" },
      include: { rows: true },
    })
    return NextResponse.json(saves)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const body = await request.json()
    const rows = body.rows as Array<{ date: string; metal: string; purity: string; dwt: number; pricePaid: number; spotPrice?: number }>
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ message: "At least one row required" }, { status: 400 })
    }
    const save = await prisma.stonesSave.create({
      data: {
        rows: {
          create: rows.map((r) => ({
            date: new Date(r.date),
            metal: r.metal as MetalType,
            purity: String(r.purity),
            dwt: Number(r.dwt) || 0,
            pricePaid: Number(r.pricePaid) || 0,
            spotPrice: r.spotPrice != null ? Number(r.spotPrice) || 0 : null,
          })),
        },
      },
      include: { rows: true },
    })
    return NextResponse.json(save)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ message: "Failed to save" }, { status: 500 })
  }
}
