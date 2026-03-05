import { NextRequest, NextResponse } from "next/server"
import { createSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const slug = typeof body?.slug === "string" ? body.slug.trim() : ""
    if (!slug) {
      return NextResponse.json({ message: "Missing slug" }, { status: 400 })
    }
    const card = await prisma.userCard.findFirst({
      where: { scanSlug: slug, status: "ACTIVE" },
      include: { user: { select: { id: true } } },
    })
    if (!card || card.locked) {
      return NextResponse.json({ message: "Invalid or locked card" }, { status: 401 })
    }
    await createSession(card.userId)
    const redirectUrl = typeof body?.redirect === "string" ? body.redirect : "/dashboard"
    return NextResponse.json({ redirect: redirectUrl })
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Login failed" },
      { status: 500 }
    )
  }
}
