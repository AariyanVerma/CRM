import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const userId = request.nextUrl.searchParams.get("userId")
    if (!userId) {
      return NextResponse.json({ message: "Missing userId" }, { status: 400 })
    }
    const cards = await prisma.userCard.findMany({
      where: { userId },
      orderBy: { issuedAt: "desc" },
    })
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const withUrl = cards.map((c) => ({
      ...c,
      scanUrl: c.scanSlug ? `${baseUrl}/login?card=${c.scanSlug}` : `${baseUrl}/login`,
    }))
    return NextResponse.json(withUrl)
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Internal server error" },
      { status: e instanceof Error && e.message === "Unauthorized" ? 401 : 500 }
    )
  }
}
