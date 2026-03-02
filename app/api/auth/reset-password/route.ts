import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, newPassword } = body

    if (!token || !newPassword) {
      return NextResponse.json(
        { message: "Token and new password are required" },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!resetToken) {
      return NextResponse.json(
        { message: "Invalid or expired reset token" },
        { status: 400 }
      )
    }
    if (resetToken.used) {
      return NextResponse.json(
        { message: "This reset token has already been used" },
        { status: 400 }
      )
    }
    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json(
        { message: "This reset token has expired" },
        { status: 400 }
      )
    }
    const passwordHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    })
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    })

    return NextResponse.json({
      message: "Password has been reset successfully. You can now log in with your new password.",
    })
  } catch (error) {
    console.error("Error resetting password:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}




