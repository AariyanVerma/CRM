import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { verifyEmailConfig, sendOTPEmail } from "@/lib/email"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    // Check if environment variables are set
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const fromEmail = process.env.FROM_EMAIL

    const config = {
      SMTP_HOST: smtpHost || "Using default: smtp.gmail.com",
      SMTP_PORT: smtpPort || "Using default: 465",
      SMTP_SECURE: process.env.SMTP_SECURE || "Using default: true",
      SMTP_USER: smtpUser ? "✅ SET" : "❌ NOT SET",
      SMTP_PASS: smtpPass ? "✅ SET" : "❌ NOT SET",
      FROM_EMAIL: fromEmail || "Using default",
    }

    // Try to verify email connection
    const verification = await verifyEmailConfig()

    return NextResponse.json({
      config,
      connection: verification.valid
        ? { status: "✅ Connected", message: "Email service is configured correctly" }
        : { status: "❌ Connection Failed", error: verification.error },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        config: {
          SMTP_USER: process.env.SMTP_USER ? "✅ SET" : "❌ NOT SET",
          SMTP_PASS: process.env.SMTP_PASS ? "✅ SET" : "❌ NOT SET",
          SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
          SMTP_PORT: process.env.SMTP_PORT || "465",
          FROM_EMAIL: process.env.FROM_EMAIL || "NOT SET",
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { testEmail } = body

    if (!testEmail) {
      return NextResponse.json(
        { message: "testEmail is required" },
        { status: 400 }
      )
    }

    // Send a test OTP email
    const testOTP = "123456"
    await sendOTPEmail(testEmail, testOTP, "Test User")

    return NextResponse.json({
      message: "Test email sent successfully",
      testEmail,
      note: "Check the inbox (and spam folder) for the test OTP email",
    })
  } catch (error) {
    console.error("Error sending test email:", error)
    return NextResponse.json(
      {
        message: "Failed to send test email",
        error: error instanceof Error ? error.message : "Unknown error",
        config: {
          SMTP_USER: process.env.SMTP_USER ? "✅ SET" : "❌ NOT SET",
          SMTP_PASS: process.env.SMTP_PASS ? "✅ SET" : "❌ NOT SET",
          SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
          SMTP_PORT: process.env.SMTP_PORT || "465",
        },
      },
      { status: 500 }
    )
  }
}

