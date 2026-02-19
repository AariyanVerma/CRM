import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendOTPEmail } from "@/lib/email"

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    console.log(`[OTP Request] Received request for email: ${email}`)

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      )
    }

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim()
    console.log(`[OTP Request] Normalized email: ${normalizedEmail}`)

    // Find user by email (case-insensitive search)
    // Since Prisma's findUnique doesn't support case-insensitive search,
    // we use findMany and filter in JavaScript, or use raw SQL
    // For better performance, we'll use raw SQL with proper typing
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

    console.log(`[OTP Request] User found: ${user ? "YES" : "NO"}`)
    if (user) {
      console.log(`[OTP Request] User ID: ${user.id}, Role: ${user.role}`)
    }

    // Don't reveal if user exists (security best practice)
    if (!user) {
      console.log(`[OTP Request] User not found, returning generic success message`)
      return NextResponse.json({
        message: "If an account exists, an OTP has been sent to your email.",
      })
    }

    // Invalidate any existing unverified OTPs for this user
    await prisma.passwordResetOTP.updateMany({
      where: {
        userId: user.id,
        verified: false,
      },
      data: {
        verified: true, // Mark as used/invalid
      },
    })

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10) // OTP valid for 10 minutes

    // Create OTP record
    await prisma.passwordResetOTP.create({
      data: {
        userId: user.id,
        otp,
        expiresAt,
      },
    })

    // Send OTP via email
    try {
      const userName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.firstName || user.lastName || undefined

      console.log(`[OTP] ========================================`)
      console.log(`[OTP] Generating OTP for user: ${user.email}`)
      console.log(`[OTP] User name: ${userName || "N/A"}`)
      console.log(`[OTP] OTP generated: ${otp}`)
      console.log(`[OTP] OTP expires at: ${expiresAt.toISOString()}`)
      console.log(`[OTP] Attempting to send email...`)
      
      const emailResult = await sendOTPEmail(user.email, otp, userName)
      
      console.log(`[OTP] ✅ Email sent successfully!`)
      console.log(`[OTP] Message ID: ${emailResult.messageId}`)
      console.log(`[OTP] ========================================`)
      
      return NextResponse.json({
        message: "OTP has been sent to your email address.",
        debug: process.env.NODE_ENV === "development" ? {
          email: user.email,
          otpGenerated: otp,
          messageId: emailResult.messageId,
        } : undefined,
      })
    } catch (emailError) {
      console.error(`[OTP] ❌ CRITICAL: Error sending OTP email`)
      console.error(`[OTP] ========================================`)
      console.error(`[OTP] User email: ${user.email}`)
      console.error(`[OTP] Generated OTP: ${otp}`)
      console.error(`[OTP] Error type: ${emailError instanceof Error ? emailError.constructor.name : typeof emailError}`)
      console.error(`[OTP] Error message: ${emailError instanceof Error ? emailError.message : String(emailError)}`)
      if (emailError instanceof Error && 'code' in emailError) {
        console.error(`[OTP] Error code: ${(emailError as any).code}`)
      }
      if (emailError instanceof Error && 'command' in emailError) {
        console.error(`[OTP] Failed command: ${(emailError as any).command}`)
      }
      console.error(`[OTP] Full error stack:`, emailError)
      console.error(`[OTP] ========================================`)
      
      // Return error to help with debugging (in production, you might want to hide this)
      return NextResponse.json({
        message: "Failed to send OTP email. Please check server logs for details.",
        error: emailError instanceof Error ? emailError.message : "Unknown error",
        debug: process.env.NODE_ENV === "development" ? {
          email: user.email,
          otpGenerated: otp,
          errorCode: emailError instanceof Error && 'code' in emailError ? (emailError as any).code : undefined,
        } : undefined,
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

