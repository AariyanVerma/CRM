import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth()

    const body = await request.json()
    const { profileImageUrl } = body

    // Staff can only update their own profile picture
    const user = await prisma.user.update({
      where: { id: session.id },
      data: {
        profileImageUrl: profileImageUrl || null,
      },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      profileImageUrl: user.profileImageUrl,
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

