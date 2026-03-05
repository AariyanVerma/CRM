import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    let body: { status?: "ACTIVE" | "LOST" | "DISABLED"; locked?: boolean }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ message: "Invalid JSON" }, { status: 400 })
    }
    const card = await prisma.userCard.findUnique({ where: { id } })
    if (!card) {
      return NextResponse.json({ message: "Card not found" }, { status: 404 })
    }
    const data: { status?: "ACTIVE" | "LOST" | "DISABLED"; locked?: boolean; lockedAt?: Date | null } = {}
    if (body.status !== undefined && ["ACTIVE", "LOST", "DISABLED"].includes(body.status)) {
      data.status = body.status
    }
    if (body.locked !== undefined) {
      data.locked = body.locked
      data.lockedAt = body.locked ? new Date() : null
    }
    const updated = await prisma.userCard.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Internal server error" },
      { status: e instanceof Error && e.message === "Unauthorized" ? 401 : 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const card = await prisma.userCard.findUnique({ where: { id } })
    if (!card) {
      return NextResponse.json({ message: "Card not found" }, { status: 404 })
    }
    await prisma.userCard.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Internal server error" },
      { status: e instanceof Error && e.message === "Unauthorized" ? 401 : 500 }
    )
  }
}
