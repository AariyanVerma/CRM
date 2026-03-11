import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    await requireAuth()
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { email: "asc" }],
    })
    return NextResponse.json(admins)
  } catch (error) {
    console.error("Error listing admins:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
