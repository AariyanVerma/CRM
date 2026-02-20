import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { randomBytes } from "crypto"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // Don't reveal if user exists (security best practice)
    if (!user) {
      // Still return success to prevent email enumeration
      return NextResponse.json({
        message: "If an account with that email exists, a password reset link has been sent.",
      })
    }

    // Generate secure reset token
    const token = randomBytes(32).toString("hex")
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // Token valid for 1 hour

    // Invalidate any existing tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        used: false,
      },
      data: {
        used: true,
      },
    })

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    // In a real app, you would send an email here with the reset link
    // For now, we'll return the token (only for development/testing)
    // In production, remove the token from the response and send it via email

    return NextResponse.json({
      message: "Password reset token generated successfully",
      // TODO: Remove this in production - send token via email instead
      resetToken: token,
      resetUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`,
      warning: "In production, this token should be sent via email, not returned in the response",
    })
  } catch (error) {
    console.error("Error generating password reset token:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}


