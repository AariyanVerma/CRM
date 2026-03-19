import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Only admin can set customer-specific percentage overrides" },
        { status: 403 }
      )
    }

    const { id: customerId } = await params
    const body = await request.json().catch(() => ({})) as {
      scrapGoldPercentage?: number
      scrapSilverPercentage?: number
      scrapPlatinumPercentage?: number
      meltGoldPercentage?: number
      meltSilverPercentage?: number
      meltPlatinumPercentage?: number
    }

    const updateData: Record<string, number | null> = {}
    const keys = [
      "scrapGoldPercentageOverride",
      "scrapSilverPercentageOverride",
      "scrapPlatinumPercentageOverride",
      "meltGoldPercentageOverride",
      "meltSilverPercentageOverride",
      "meltPlatinumPercentageOverride",
    ] as const
    const bodyKeys = [
      "scrapGoldPercentage",
      "scrapSilverPercentage",
      "scrapPlatinumPercentage",
      "meltGoldPercentage",
      "meltSilverPercentage",
      "meltPlatinumPercentage",
    ] as const
    for (let i = 0; i < keys.length; i++) {
      const v = body[bodyKeys[i]]
      if (v !== undefined && typeof v === "number" && !Number.isNaN(v) && v >= 0 && v <= 100) {
        updateData[keys[i]] = v
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "No valid percentage override provided" },
        { status: 400 }
      )
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: updateData,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error saving percentage override:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
