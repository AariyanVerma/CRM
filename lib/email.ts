import nodemailer from "nodemailer"

function parseFromEmail(fromEmail: string | undefined) {
  if (!fromEmail) {
    return {
      name: "New York Gold Market",
      address: process.env.SMTP_USER || "",
    }
  }

  let cleaned = fromEmail.trim()
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim()
  }

  const match = cleaned.match(/^([^<]+?)\s*<(.+)>$/i)
  if (match) {
    return {
      name: match[1].trim().replace(/^["']|["']$/g, ""),
      address: match[2].trim().replace(/^["']|["']$/g, ""),
    }
  }

  return {
    name: "New York Gold Market",
    address: cleaned.replace(/^["']|["']$/g, "").trim(),
  }
}

const smtpConfig: any = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465", 10),
  secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS?.replace(/\s/g, ""),
  },
}

const transporter = nodemailer.createTransport(smtpConfig)

const fromEmailParsed = parseFromEmail(process.env.FROM_EMAIL)

export async function sendOTPEmail(to: string, otp: string, userName?: string) {
  try {

    console.log("[Email] Attempting to send OTP email:")
    console.log("[Email] To:", to)
    console.log("[Email] From:", `${fromEmailParsed.name} <${fromEmailParsed.address}>`)
    console.log("[Email] SMTP Host:", smtpConfig.host)
    console.log("[Email] SMTP Port:", smtpConfig.port)
    console.log("[Email] SMTP Secure:", smtpConfig.secure)
    console.log("[Email] SMTP User:", smtpConfig.auth.user ? "SET" : "NOT SET")
    console.log("[Email] SMTP Pass:", smtpConfig.auth.pass ? "SET" : "NOT SET")

    const mailOptions = {
      from: {
        name: fromEmailParsed.name,
        address: fromEmailParsed.address,
      },
      to,
      subject: "Password Reset OTP - New York Gold Market",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background-color: #f9f9f9;
                border-radius: 8px;
                padding: 30px;
                border: 1px solid #e0e0e0;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .otp-box {
                background-color: #ffffff;
                border: 2px dashed #007bff;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 20px 0;
              }
              .otp-code {
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                color: #007bff;
                font-family: 'Courier New', monospace;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
                font-size: 12px;
                color: #666;
                text-align: center;
              }
              .warning {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 12px;
                margin: 20px 0;
                border-radius: 4px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              
              <p>Hello${userName ? ` ${userName}` : ""},</p>
              
              <p>You have requested to reset your password for your New York Gold Market account.</p>
              
              <p>Please use the following OTP code to verify your identity:</p>
              
              <div class="otp-box">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your OTP Code:</p>
                <div class="otp-code">${otp}</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>This OTP is valid for <strong>10 minutes</strong> only</li>
                  <li>Do not share this code with anyone</li>
                  <li>If you didn't request this, please ignore this email</li>
                </ul>
              </div>
              
              <p>Enter this code on the password reset page to continue.</p>
              
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; ${new Date().getFullYear()} New York Gold Market. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Password Reset OTP - New York Gold Market

Hello${userName ? ` ${userName}` : ""},

You have requested to reset your password for your New York Gold Market account.

Your OTP Code: ${otp}

This OTP is valid for 10 minutes only.
Do not share this code with anyone.

If you didn't request this, please ignore this email.

This is an automated message. Please do not reply to this email.
      `.trim(),
    }

    const info = await transporter.sendMail(mailOptions)
    console.log("[Email] OTP email sent successfully!")
    console.log("[Email] Message ID:", info.messageId)
    console.log("[Email] Response:", info.response)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("[Email] ERROR sending OTP email:")
    console.error("[Email] Error type:", error instanceof Error ? error.constructor.name : typeof error)
    console.error("[Email] Error message:", error instanceof Error ? error.message : String(error))
    if (error instanceof Error && 'code' in error) {
      console.error("[Email] Error code:", (error as any).code)
    }
    if (error instanceof Error && 'command' in error) {
      console.error("[Email] Failed command:", (error as any).command)
    }
    console.error("[Email] Full error:", error)
    throw new Error(`Failed to send OTP email: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function sendDailySummaryEmail(
  to: string,
  stats: { date: string; transactionCount: number; totalValue: number }
) {
  const { date, transactionCount, totalValue } = stats
  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(totalValue)
  try {
    await transporter.sendMail({
      from: {
        name: fromEmailParsed.name,
        address: fromEmailParsed.address,
      },
      to,
      subject: `Daily Summary - ${date} - New York Gold Market`,
      html: `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f9f9f9; border-radius: 8px; padding: 24px; border: 1px solid #e0e0e0;">
              <h1 style="margin-top: 0;">Daily Transaction Summary</h1>
              <p><strong>Date:</strong> ${date}</p>
              <p><strong>Transactions today:</strong> ${transactionCount}</p>
              <p><strong>Total value today:</strong> ${formattedTotal}</p>
              <p style="margin-bottom: 0; font-size: 12px; color: #666;">New York Gold Market – automated summary</p>
            </div>
          </body>
        </html>
      `,
      text: `Daily Summary - ${date}\n\nTransactions today: ${transactionCount}\nTotal value today: ${formattedTotal}\n\nNew York Gold Market – automated summary`,
    })
    return { success: true }
  } catch (error) {
    console.error("[Email] Daily summary send error:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to send daily summary")
  }
}

export async function verifyEmailConfig() {
  try {
    await transporter.verify()
    return { valid: true }
  } catch (error) {
    console.error("Email configuration error:", error)
    return { valid: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

