import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const card = await prisma.membershipCard.findUnique({
    where: { id },
    include: { customer: { select: { id: true, fullName: true, isBusiness: true, businessName: true } } },
  })
  if (!card) {
    return NextResponse.json({ message: "Card not found" }, { status: 404 })
  }
  return NextResponse.json(card)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json(
      { message: "Only administrators can edit or lock cards" },
      { status: 403 }
    )
  }
  const { id } = await params
  let body: { status?: "ACTIVE" | "LOST" | "DISABLED"; locked?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 })
  }
  const { status, locked } = body

  const card = await prisma.membershipCard.findUnique({ where: { id } })
  if (!card) {
    return NextResponse.json({ message: "Card not found" }, { status: 404 })
  }

  const data: { status?: "ACTIVE" | "LOST" | "DISABLED"; locked?: boolean; lockedAt?: Date | null } = {}
  if (status !== undefined && ["ACTIVE", "LOST", "DISABLED"].includes(status)) {
    data.status = status
  }
  if (locked !== undefined) {
    data.locked = locked
    data.lockedAt = locked ? new Date() : null
  }

  try {
    const updated = await prisma.membershipCard.update({
      where: { id },
      data,
      include: { customer: { select: { id: true, fullName: true } } },
    })
    return NextResponse.json(updated)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed"
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}
