import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params
    const save = await prisma.stonesSave.findUnique({
      where: { id },
      include: { rows: true },
    })
    if (!save) return NextResponse.json(null, { status: 404 })
    return NextResponse.json(save)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
}
