import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { randomBytes } from "crypto"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, otp } = body

    if (!otp) {
      return NextResponse.json(
        { message: "OTP is required" },
        { status: 400 }
      )
    }

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
    }>>`
      SELECT id, email, "passwordHash", role, "firstName", "lastName", address, "phoneNumber", "profileImageUrl"
      FROM "User" 
      WHERE LOWER(email) = LOWER(${normalizedEmail}) 
      LIMIT 1
    `
    const user = users[0] || null

    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 400 }
      )
    }

    const otpRecord = await prisma.passwordResetOTP.findFirst({
      where: {
        userId: user.id,
        otp: otp.trim(),
        verified: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (!otpRecord) {
      await prisma.passwordResetOTP.updateMany({
        where: {
          userId: user.id,
          verified: false,
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      })

      return NextResponse.json(
        { message: "Invalid or expired OTP" },
        { status: 400 }
      )
    }

    const now = new Date()
    if (now > otpRecord.expiresAt) {
      return NextResponse.json(
        { message: "OTP has expired. Please request a new one." },
        { status: 400 }
      )
    }

    if (otpRecord.attempts >= 5) {
      return NextResponse.json(
        { message: "Too many failed attempts. Please request a new OTP." },
        { status: 400 }
      )
    }

    const trimmedOtp = otp.trim()
    const trimmedRecordOtp = otpRecord.otp.trim()

    if (trimmedOtp !== trimmedRecordOtp) {
      await prisma.passwordResetOTP.update({
        where: { id: otpRecord.id },
        data: {
          attempts: {
            increment: 1,
          },
        },
      })

      return NextResponse.json(
        { message: "Invalid OTP" },
        { status: 400 }
      )
    }

    await prisma.passwordResetOTP.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    })

    const resetToken = randomBytes(32).toString("hex")
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 15)

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      },
    })

    return NextResponse.json({
      message: "OTP verified successfully",
      resetToken,
      resetUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`,
    })
  } catch (error) {
    console.error("Error verifying OTP:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
