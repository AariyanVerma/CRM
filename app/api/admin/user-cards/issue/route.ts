import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateToken, generateShortSlug } from "@/lib/utils"

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const userId = body?.userId
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ message: "Missing userId" }, { status: 400 })
    }
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }
    await prisma.userCard.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "DISABLED" },
    })
    const token = generateToken()
    const scanSlug = generateShortSlug(12)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const card = await prisma.userCard.create({
      data: { userId, token, scanSlug, status: "ACTIVE" },
    })
    return NextResponse.json({
      ...card,
      scanUrl: `${baseUrl}/login?card=${scanSlug}`,
    })
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Internal server error" },
      { status: e instanceof Error && e.message === "Unauthorized" ? 401 : 500 }
    )
  }
}
