import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await requireAuth()
    const rows = await prisma.$queryRaw<Array<{ id: string; email: string; profileImageUrl: string | null }>>`
      SELECT id, email, "profileImageUrl" FROM "User" WHERE id = ${session.id} LIMIT 1
    `
    const user = rows[0]
    if (!user) return NextResponse.json({ message: "Not found" }, { status: 404 })
    let inactivityTimeoutMinutes: number | null = null
    try {
      const timeoutRows = await prisma.$queryRaw<Array<{ inactivityTimeoutMinutes: number | null }>>`
        SELECT "inactivityTimeoutMinutes" FROM "User" WHERE id = ${session.id} LIMIT 1
      `
      inactivityTimeoutMinutes = timeoutRows[0]?.inactivityTimeoutMinutes ?? null
    } catch {
      inactivityTimeoutMinutes = null
    }
    return NextResponse.json({ ...user, inactivityTimeoutMinutes })
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
}

const ALLOWED_TIMEOUTS = [5, 10, 20, 30, 60, 120] as const

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { profileImageUrl, inactivityTimeoutMinutes } = body
    const data: { profileImageUrl?: string | null; inactivityTimeoutMinutes?: number | null } = {}
    if (profileImageUrl !== undefined) data.profileImageUrl = profileImageUrl || null
    if (inactivityTimeoutMinutes !== undefined) {
      const n = Number(inactivityTimeoutMinutes)
      data.inactivityTimeoutMinutes =
        inactivityTimeoutMinutes === null || inactivityTimeoutMinutes === "never"
          ? null
          : (ALLOWED_TIMEOUTS as readonly number[]).includes(n)
            ? n
            : undefined
    }
    if (Object.keys(data).length === 0) {
      const rows = await prisma.$queryRaw<Array<{ id: string; email: string; profileImageUrl: string | null }>>`
        SELECT id, email, "profileImageUrl" FROM "User" WHERE id = ${session.id} LIMIT 1
      `
      const u = rows[0]
      if (!u) return NextResponse.json({ message: "Not found" }, { status: 404 })
      let inactivityTimeoutMinutes: number | null = null
      try {
        const tr = await prisma.$queryRaw<Array<{ inactivityTimeoutMinutes: number | null }>>`
          SELECT "inactivityTimeoutMinutes" FROM "User" WHERE id = ${session.id} LIMIT 1
        `
        inactivityTimeoutMinutes = tr[0]?.inactivityTimeoutMinutes ?? null
      } catch {
        inactivityTimeoutMinutes = null
      }
      return NextResponse.json({ ...u, inactivityTimeoutMinutes })
    }
    try {
      const user = await prisma.user.update({
        where: { id: session.id },
        data,
      })
      return NextResponse.json({
        id: user.id,
        email: user.email,
        profileImageUrl: user.profileImageUrl,
        inactivityTimeoutMinutes: user.inactivityTimeoutMinutes,
      })
    } catch (updateErr) {
      if (data.inactivityTimeoutMinutes !== undefined) {
        const msg = String(updateErr instanceof Error ? updateErr.message : updateErr)
        if (msg.includes("inactivityTimeoutMinutes") || msg.includes("column")) {
          return NextResponse.json({
            id: session.id,
            email: session.email,
            profileImageUrl: data.profileImageUrl ?? undefined,
            inactivityTimeoutMinutes: null,
          })
        }
      }
      throw updateErr
    }
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}




