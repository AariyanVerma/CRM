import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendOTPEmail } from "@/lib/email"

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

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

    const normalizedEmail = email.toLowerCase().trim()

    const users = await prisma.$queryRaw<Array<{
      id: string
      email: string
      passwordHash: string
      role: string
      firstName: string | null
      lastName: string | null
      address: string | null
      phoneNumber: string | null
      profileImageUrl: string | null
      createdAt: Date
      updatedAt: Date
    }>>`
      SELECT * FROM "User" WHERE LOWER(email) = LOWER(${normalizedEmail}) LIMIT 1
    `
    const user = users[0] || null

    if (!user) {
      return NextResponse.json({
        message: "If an account exists, an OTP has been sent to your email.",
      })
    }

    await prisma.passwordResetOTP.updateMany({
      where: {
        userId: user.id,
        verified: false,
      },
      data: {
        verified: true,
      },
    })

    const otp = generateOTP()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    await prisma.passwordResetOTP.create({
      data: {
        userId: user.id,
        otp,
        expiresAt,
      },
    })

    try {
      const userName = user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.lastName || undefined

      await sendOTPEmail(user.email, otp, userName)

      return NextResponse.json({
        message: "OTP has been sent to your email address.",
        ...(process.env.NODE_ENV === "development"
          ? { debug: { email: user.email, otp } }
          : {}),
      })
    } catch (emailError) {
      console.error("Error sending OTP email:", emailError)
      return NextResponse.json({
        message: "Failed to send OTP email. Please try again later.",
        ...(process.env.NODE_ENV === "development"
          ? { error: emailError instanceof Error ? emailError.message : "Unknown error", debug: { email: user.email, otp } }
          : {}),
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Error generating OTP:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
