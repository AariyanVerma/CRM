import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendDailySummaryEmail } from "@/lib/email"

// Called by cron job with CRON_SECRET. Sends today's transaction summary to all admin users.
export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-cron-secret") || request.nextUrl.searchParams.get("secret")
    const expected = process.env.CRON_SECRET
    if (!expected || secret !== expected) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [transactions, admins] = await Promise.all([
      prisma.transaction.findMany({
        where: { createdAt: { gte: today, lt: tomorrow } },
        include: { lineItems: { select: { lineTotal: true } } },
      }),
      prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { email: true },
      }),
    ])

    const totalValue = transactions.reduce(
      (s, t) => s + t.lineItems.reduce((a, i) => a + i.lineTotal, 0),
      0
    )
    const dateStr = today.toISOString().slice(0, 10)

    for (const admin of admins) {
      try {
        await sendDailySummaryEmail(admin.email, {
          date: dateStr,
          transactionCount: transactions.length,
          totalValue,
        })
      } catch (e) {
        console.error(`[Daily summary] Failed to send to ${admin.email}:`, e)
      }
    }

    return NextResponse.json({
      sent: admins.length,
      date: dateStr,
      transactionCount: transactions.length,
      totalValue,
    })
  } catch (error) {
    console.error("Error sending daily summary:", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
