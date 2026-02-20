import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

// TEMPORARY PASSWORD RESET ENDPOINT
// DELETE THIS FILE AFTER RESETTING YOUR PASSWORD!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, newPassword, secretKey } = body

    // Simple security check - change this secret key
    if (secretKey !== "RESET_ADMIN_2024") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!email || !newPassword) {
      return NextResponse.json(
        { message: "Email and new password are required" },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    return NextResponse.json({
      message: "Password reset successfully",
      email: user.email,
      warning: "DELETE THIS API ENDPOINT AFTER USE!",
    })
  } catch (error) {
    console.error("Error resetting password:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}


